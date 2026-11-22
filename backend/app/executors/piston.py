"""Piston executor (https://github.com/engineer-man/piston, MIT).

Piston runs each program in its own isolated sandbox inside the `piston`
container (no network, CPU/memory/process limits, separate filesystem). We use
its interactive WebSocket API (/api/v2/connect) so students can type input
while their program runs.

Piston can't tell us when a program is waiting for input, so the browser keeps
the input box open while a C/C++ program runs.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import httpx
import websockets

from .base import (
    KALAM_BRIDGE_STUB,
    PY_RUNNER,
    SOURCE_NAME,
    UNBUFFER_RUNTIME,
    Emit,
    RunControl,
    RunOutcome,
    RunRequest,
    error,
)
from .local import _python_error, SHIM_DIR

PISTON_LANG = {"c": "c", "cpp": "c++", "python": "python"}
SIGNAL_TYPES = {"SIGSEGV", "SIGBUS", "SIGFPE", "SIGABRT", "SIGILL"}


class PistonExecutor:
    name = "piston"
    input_detection = False

    def __init__(self, base_url: str, versions: dict[str, str]) -> None:
        self.base_url = base_url.rstrip("/")
        self.versions = versions
        self._turtle = (SHIM_DIR / "turtle.py").read_text()

    async def health(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{self.base_url}/api/v2/runtimes")
                runtimes = sorted({f"{x['language']}-{x['version']}" for x in r.json()})
            return {"executor": self.name, "reachable": True, "runtimes": runtimes}
        except Exception as e:  # noqa: BLE001
            return {"executor": self.name, "reachable": False, "error": str(e)}

    def _files(self, req: RunRequest) -> list[dict[str, str]]:
        if req.language == "python":
            return [
                {"name": "runner.py", "content": PY_RUNNER.format(quiet=req.quiet_prompts)},
                {"name": "main.py", "content": req.code},
                {"name": "turtle.py", "content": self._turtle},  # flat: the script folder is on sys.path
                {"name": "kalam_bridge.py", "content": KALAM_BRIDGE_STUB},
            ]
        rt = "kalam_rt.c" if req.language == "c" else "kalam_rt.cpp"
        return [{"name": SOURCE_NAME[req.language], "content": req.code}, {"name": rt, "content": UNBUFFER_RUNTIME}]

    async def run(self, req: RunRequest, control: RunControl, emit: Emit) -> RunOutcome:
        started = time.monotonic()
        ws_url = self.base_url.replace("http://", "ws://").replace("https://", "wss://") + "/api/v2/connect"
        init = {
            "type": "init",
            "language": PISTON_LANG[req.language],
            "version": self.versions.get(req.language, "*"),
            "files": self._files(req),
            "args": [],
            "compile_timeout": int(req.compile_seconds * 1000),
            # Wall-clock limit includes time spent waiting for the student to type.
            "run_timeout": int((req.wall_seconds if req.stdin is not None else req.idle_input_seconds) * 1000),
            # Newer Piston versions enforce real CPU time with these (older ones ignore them).
            "compile_cpu_time": int(req.compile_seconds * 1000),
            "run_cpu_time": int(req.cpu_seconds * 1000),
            "run_memory_limit": req.memory_mb * 1024 * 1024,
        }
        compile_out: list[str] = []
        stdout: list[str] = []
        stderr: list[str] = []
        out_bytes = 0
        reason: str | None = None
        run_exit: dict[str, Any] | None = None
        compile_exit: dict[str, Any] | None = None

        def ms() -> int:
            return int((time.monotonic() - started) * 1000)

        try:
            async with websockets.connect(ws_url, max_size=2**22, open_timeout=10) as ws:
                await ws.send(json.dumps(init))
                stage = "compile"

                async def feed() -> None:
                    nonlocal reason
                    if req.stdin is not None:
                        data = req.stdin if req.stdin.endswith("\n") or not req.stdin else req.stdin + "\n"
                        await ws.send(json.dumps({"type": "data", "stream": "stdin", "data": data}))
                        return
                    stop_wait = asyncio.create_task(control.stop.wait())
                    try:
                        while True:
                            get = asyncio.create_task(control.stdin.get())
                            done, _ = await asyncio.wait({get, stop_wait}, return_when=asyncio.FIRST_COMPLETED)
                            if stop_wait in done:
                                get.cancel()
                                reason = reason or "stopped"
                                await ws.send(json.dumps({"type": "signal", "signal": "SIGKILL"}))
                                return
                            await ws.send(json.dumps({"type": "data", "stream": "stdin", "data": get.result()[:8192]}))
                    finally:
                        stop_wait.cancel()

                feeder = asyncio.create_task(feed())
                try:
                    async for raw in ws:
                        msg = json.loads(raw)
                        t = msg.get("type")
                        if t == "stage":
                            stage = msg.get("stage", stage)
                            if stage == "compile":
                                await emit({"type": "status", "status": "compiling"})
                            elif stage == "run":
                                await emit({"type": "status", "status": "running", "input_detection": False})
                        elif t == "data":
                            data = msg.get("data", "")
                            if stage == "compile":
                                compile_out.append(data)
                                continue
                            out_bytes += len(data.encode())
                            if out_bytes > req.max_output_bytes:
                                reason = "output-limit"
                                await ws.send(json.dumps({"type": "signal", "signal": "SIGKILL"}))
                                continue
                            (stdout if msg.get("stream") == "stdout" else stderr).append(data)
                            await emit({"type": msg.get("stream", "stdout"), "data": data})
                        elif t == "exit":
                            if msg.get("stage") == "compile":
                                compile_exit = msg
                            else:
                                run_exit = msg
                        elif t == "error":
                            return RunOutcome(False, error=error("system", "runner error", str(msg.get("message"))), time_ms=ms())
                finally:
                    feeder.cancel()
        except (OSError, websockets.WebSocketException, asyncio.TimeoutError) as e:
            return RunOutcome(False, error=error("system", "Run server unavailable", f"Piston: {e}", "busy"), time_ms=ms())

        compiled_text = "".join(compile_out)
        if compile_exit and (compile_exit.get("code") not in (0, None) or compile_exit.get("signal")):
            if compile_exit.get("signal") == "SIGKILL":
                return RunOutcome(False, error=error("timeout", "compile timeout", "The compiler took too long."), time_ms=ms())
            first = next((ln for ln in compiled_text.splitlines() if "error" in ln), compiled_text[:200])
            return RunOutcome(False, error=error("compile", first, compiled_text, "error"), time_ms=ms())
        warnings = compiled_text if "warning:" in compiled_text else ""
        out_s, err_s = "".join(stdout), "".join(stderr)

        def done(ok: bool, err: dict[str, Any] | None = None, stopped: bool = False) -> RunOutcome:
            return RunOutcome(ok, stopped=stopped, error=err, warnings=warnings, stdout=out_s, time_ms=ms())

        if reason == "stopped":
            return done(False, stopped=True)
        if reason == "output-limit":
            return done(False, error("output-limit", "output limit", f"Output was larger than {req.max_output_bytes // 1024} KB."))
        if not run_exit:
            return done(False, error("system", "no exit", "The run server closed the connection early.", "busy"))
        sig = run_exit.get("signal")
        code = run_exit.get("code")
        if sig in ("SIGKILL", "SIGXCPU") or (run_exit.get("status") in ("TO", "timeout")):
            return done(False, error("timeout", "time limit", f"Time limit reached ({sig})."))
        if sig in SIGNAL_TYPES:
            if "bad_alloc" in err_s:
                return done(False, error("memory", "memory", err_s[-4000:]))
            return done(False, error("runtime", f"Program crashed ({sig})", (err_s[-4000:] + f"\nProgram was stopped by {sig}.").strip(), sig))
        if code in (0, None) and not sig:
            return done(True)
        if req.language == "python":
            return done(False, _python_error(err_s))
        return done(False, error("runtime", f"exit code {code}", (err_s[-4000:] + f"\nProgram exited with code {code}.").strip(), "exit"))
