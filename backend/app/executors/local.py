"""Local executor: compiles with gcc/g++ and runs programs on this machine inside
a small sandbox built from Linux features:

* runs as the unprivileged `nobody` user (when the backend runs as root, as in Docker)
* in its own empty network namespace (no network at all)
* resource limits: CPU seconds, memory, processes, file size, open files, no core dumps
* clean environment (no secrets), its own temporary working directory
* the whole process group is killed on stop/limit

Production deployments should prefer Piston (KALAM_EXECUTOR=piston), which adds
a separate container and filesystem isolation. This executor is used for local
development, tests, and small single-school servers. See docs/SECURITY.md.
"""
from __future__ import annotations

import asyncio
import codecs
import hashlib
import math
import os
import platform
import re
import resource
import shutil
import signal
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

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

NOBODY = 65534
READ_SYSCALL = {"x86_64": "0", "aarch64": "63", "arm64": "63"}.get(platform.machine(), "0")
SHIM_DIR = Path(__file__).with_name("kalam_shim")
COMPILE_ENV = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C", "LC_ALL": "C", "HOME": "/tmp"}  # ASCII quotes in messages
SAFE_ENV = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "HOME": "/tmp", "PYTHONIOENCODING": "utf-8"}

SIGNAL_NAMES = {
    signal.SIGSEGV: "SIGSEGV",
    signal.SIGBUS: "SIGBUS",
    signal.SIGFPE: "SIGFPE",
    signal.SIGABRT: "SIGABRT",
    signal.SIGILL: "SIGILL",
}


def _probe_unshare_net() -> bool:
    if not hasattr(os, "unshare"):
        return False
    try:
        subprocess.run(["true"], preexec_fn=lambda: os.unshare(os.CLONE_NEWNET), check=True, timeout=5)
        return True
    except Exception:
        return False


class LocalExecutor:
    name = "local"

    def __init__(self, work_root: str | None = None, cache_entries: int = 300, cache_enabled: bool = True) -> None:
        root = Path(work_root or os.environ.get("KALAM_WORK_DIR", tempfile.gettempdir())) / "kalam-work"
        self.jobs = root / "jobs"
        self.cache = root / "cache"
        for d in (self.jobs, self.cache):
            d.mkdir(parents=True, exist_ok=True)
            os.chmod(d, 0o755)
        os.chmod(root, 0o755)
        self.cache_entries = cache_entries
        self.cache_enabled = cache_enabled
        self.drop_privileges = os.geteuid() == 0
        if self.drop_privileges:
            # Every parent folder must be enterable by `nobody`, or programs can't start.
            for parent in [root, *root.parents]:
                if not os.stat(parent).st_mode & 0o001:
                    raise RuntimeError(
                        f"KALAM_WORK_DIR problem: {parent} is not accessible to other users (chmod o+x). "
                        "Point KALAM_WORK_DIR at a folder like /tmp or /var/lib/kalam."
                    )
        self.isolate_network = _probe_unshare_net()
        self.input_detection = Path("/proc/self/syscall").exists()
        self.cc = shutil.which("gcc")
        self.cxx = shutil.which("g++")
        self.python = shutil.which("python3")

    async def health(self) -> dict[str, Any]:
        return {
            "executor": self.name,
            "gcc": bool(self.cc),
            "g++": bool(self.cxx),
            "python3": bool(self.python),
            "drops_privileges": self.drop_privileges,
            "network_isolated": self.isolate_network,
            "input_detection": self.input_detection,
        }

    # ------------------------------------------------------------------ sandbox
    def _preexec(self, cpu: float, mem_mb: int, nproc: int, fsize_kb: int):
        drop = self.drop_privileges
        netns = self.isolate_network

        def fn() -> None:
            if netns:
                os.unshare(os.CLONE_NEWNET)
            c = max(1, math.ceil(cpu))
            resource.setrlimit(resource.RLIMIT_CPU, (c, c + 1))
            mem = mem_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
            f = fsize_kb * 1024
            resource.setrlimit(resource.RLIMIT_FSIZE, (f, f))
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
            if drop:
                resource.setrlimit(resource.RLIMIT_NPROC, (nproc, nproc))
                os.setgroups([])
                os.setgid(NOBODY)
                os.setuid(NOBODY)
            os.umask(0o077)

        return fn

    def _new_dir(self, base: Path) -> Path:
        d = Path(tempfile.mkdtemp(prefix="job-", dir=base))
        os.chmod(d, 0o777 if self.drop_privileges else 0o700)
        return d

    @staticmethod
    def _kill(proc: asyncio.subprocess.Process) -> None:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            try:
                proc.kill()
            except ProcessLookupError:
                pass

    # ------------------------------------------------------------------ compile
    async def _compile(self, req: RunRequest) -> tuple[Path | None, str, bool]:
        """Returns (binary or None, compiler messages, timed_out)."""
        compiler = self.cc if req.language == "c" else self.cxx
        if not compiler:
            raise RuntimeError(f"No compiler installed for {req.language}")
        key = hashlib.sha256(f"{req.language}\0{' '.join(req.compile_flags)}\0{req.code}".encode()).hexdigest()[:40]
        cached_bin = self.cache / f"{key}.bin"
        cached_msg = self.cache / f"{key}.txt"
        if self.cache_enabled and cached_bin.exists():
            os.utime(cached_bin)
            return cached_bin, cached_msg.read_text() if cached_msg.exists() else "", False

        build = self._new_dir(self.jobs)
        try:
            src = SOURCE_NAME[req.language]
            rt = "kalam_rt.c" if req.language == "c" else "kalam_rt.cpp"
            (build / src).write_text(req.code, encoding="utf-8")
            (build / rt).write_text(UNBUFFER_RUNTIME)
            for p in build.iterdir():
                os.chmod(p, 0o644)
            cmd = [compiler, *req.compile_flags, "-o", "prog", src, rt, "-lm"]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=build,
                env=COMPILE_ENV,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                preexec_fn=self._preexec(req.compile_seconds, 2048, 64, 64 * 1024),
                start_new_session=True,
            )
            try:
                out, _ = await asyncio.wait_for(proc.communicate(), timeout=req.compile_seconds + 2)
            except asyncio.TimeoutError:
                self._kill(proc)
                await proc.wait()
                return None, "", True
            messages = out[: 64 * 1024].decode("utf-8", "replace").replace(str(build) + "/", "")
            if proc.returncode != 0 or not (build / "prog").exists():
                return None, messages, False
            tmp = self.cache / f"{key}.{os.getpid()}.tmp"
            shutil.copyfile(build / "prog", tmp)
            os.chmod(tmp, 0o755)
            os.replace(tmp, cached_bin)
            cached_msg.write_text(messages)
            self._evict()
            return cached_bin, messages, False
        finally:
            shutil.rmtree(build, ignore_errors=True)

    def _evict(self) -> None:
        bins = sorted(self.cache.glob("*.bin"), key=lambda p: p.stat().st_mtime)
        for p in bins[: max(0, len(bins) - self.cache_entries)]:
            p.unlink(missing_ok=True)
            p.with_suffix(".txt").unlink(missing_ok=True)

    # ------------------------------------------------------------------ run
    def _waiting_for_input(self, pid: int) -> bool | None:
        try:
            parts = Path(f"/proc/{pid}/syscall").read_text().split()
        except OSError:
            return None
        return len(parts) >= 2 and parts[0] == READ_SYSCALL and parts[1] == "0x0"

    async def run(self, req: RunRequest, control: RunControl, emit: Emit) -> RunOutcome:
        started = time.monotonic()
        warnings = ""
        workdir = self._new_dir(self.jobs)
        try:
            if req.language in ("c", "cpp"):
                await emit({"type": "status", "status": "compiling"})
                binary, messages, timed_out = await self._compile(req)
                if timed_out:
                    return RunOutcome(False, error=error("timeout", "compile timeout", "The compiler took too long."), time_ms=self._ms(started))
                if binary is None:
                    first = next((ln for ln in messages.splitlines() if "error" in ln), messages.strip()[:200])
                    return RunOutcome(False, error=error("compile", first, messages, "error"), time_ms=self._ms(started))
                warnings = messages if "warning:" in messages else ""
                cmd = [str(binary)]
            else:
                if not self.python:
                    raise RuntimeError("python3 is not installed")
                (workdir / "main.py").write_text(req.code, encoding="utf-8")
                (workdir / "runner.py").write_text(PY_RUNNER.format(quiet=req.quiet_prompts))
                shim = workdir / "kalam_shim"
                shim.mkdir()
                shutil.copy(SHIM_DIR / "turtle.py", shim / "turtle.py")
                (shim / "kalam_bridge.py").write_text(KALAM_BRIDGE_STUB)
                for p in [shim, *workdir.rglob("*")]:
                    os.chmod(p, 0o755 if p.is_dir() else 0o644)
                cmd = [self.python, "-I", "-X", "utf8", "runner.py"]
            await emit({"type": "status", "status": "running", "input_detection": self.input_detection})
            return await self._execute(cmd, workdir, req, control, emit, started, warnings)
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    @staticmethod
    def _ms(started: float) -> int:
        return int((time.monotonic() - started) * 1000)

    async def _execute(self, cmd: list[str], workdir: Path, req: RunRequest, control: RunControl, emit: Emit, started: float, warnings: str) -> RunOutcome:
        # Python needs more address space than C to start; the student's limit still applies to their data.
        mem = req.memory_mb + (256 if req.language == "python" else 0)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=workdir,
            env=SAFE_ENV,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            preexec_fn=self._preexec(req.cpu_seconds, mem, req.max_processes, req.max_file_kb),
            start_new_session=True,
        )
        state: dict[str, Any] = {"reason": None, "bytes": 0}
        stdout_parts: list[str] = []
        stderr_parts: list[str] = []

        def stop_for(reason: str) -> None:
            if state["reason"] is None:
                state["reason"] = reason
            self._kill(proc)

        async def pump_out(stream: asyncio.StreamReader, name: str, sink: list[str]) -> None:
            dec = codecs.getincrementaldecoder("utf-8")("replace")
            while True:
                chunk = await stream.read(4096)
                if not chunk:
                    tail = dec.decode(b"", final=True)
                    if tail:
                        sink.append(tail)
                        await emit({"type": name, "data": tail})
                    return
                state["bytes"] += len(chunk)
                if state["bytes"] > req.max_output_bytes:
                    stop_for("output-limit")
                    return
                text = dec.decode(chunk)
                if text:
                    sink.append(text)
                    await emit({"type": name, "data": text})

        async def pump_in() -> None:
            assert proc.stdin is not None
            try:
                if req.stdin is not None:
                    data = req.stdin if req.stdin.endswith("\n") or not req.stdin else req.stdin + "\n"
                    proc.stdin.write(data.encode())
                    await proc.stdin.drain()
                    proc.stdin.close()
                    return
                while True:
                    line = await control.stdin.get()
                    proc.stdin.write(line.encode()[:8192])
                    await proc.stdin.drain()
            except (BrokenPipeError, ConnectionResetError):
                pass

        async def watchdog() -> None:
            active = 0.0
            idle = 0.0
            waiting = False
            last = time.monotonic()
            while proc.returncode is None:
                await asyncio.sleep(0.05)
                now = time.monotonic()
                dt, last = now - last, now
                if control.stop.is_set():
                    stop_for("stopped")
                    return
                w = self._waiting_for_input(proc.pid) if req.stdin is None else False
                if w:
                    idle += dt
                    if not waiting:
                        waiting = True
                        await emit({"type": "input-request"})
                    if idle > req.idle_input_seconds:
                        stop_for("idle")
                        return
                else:
                    waiting = False
                    idle = 0.0
                    active += dt
                    if active > req.wall_seconds:
                        stop_for("timeout")
                        return

        assert proc.stdout is not None and proc.stderr is not None
        tasks = [
            asyncio.create_task(pump_out(proc.stdout, "stdout", stdout_parts)),
            asyncio.create_task(pump_out(proc.stderr, "stderr", stderr_parts)),
        ]
        side = [asyncio.create_task(pump_in()), asyncio.create_task(watchdog())]
        try:
            await proc.wait()
            await asyncio.wait(tasks, timeout=2)
        finally:
            for t in tasks + side:
                t.cancel()
            if proc.returncode is None:
                self._kill(proc)
        rc = proc.returncode
        stdout = "".join(stdout_parts)
        stderr = "".join(stderr_parts)
        ms = self._ms(started)
        reason = state["reason"]

        def done(ok: bool, err: dict[str, Any] | None = None, stopped: bool = False) -> RunOutcome:
            return RunOutcome(ok, stopped=stopped, error=err, warnings=warnings, stdout=stdout, time_ms=ms)

        if reason == "stopped":
            return done(False, stopped=True)
        if reason == "output-limit":
            return done(False, error("output-limit", "output limit", f"Output was larger than {req.max_output_bytes // 1024} KB."))
        if reason in ("timeout", "idle"):
            return done(False, error("timeout", reason, f"Time limit reached ({reason})."))
        if rc == 0:
            return done(True)
        if rc is not None and rc < 0:
            sig = -rc
            if sig == signal.SIGXCPU:
                return done(False, error("timeout", "cpu", f"CPU time limit of {req.cpu_seconds}s reached."))
            if sig == signal.SIGKILL:
                return done(False, error("timeout", "cpu", f"CPU time limit of {req.cpu_seconds}s reached (killed)."))
            if "bad_alloc" in stderr or "MemoryError" in stderr:
                return done(False, error("memory", "memory", stderr[-4000:]))
            name = SIGNAL_NAMES.get(sig, f"signal {sig}")
            return done(False, error("runtime", f"Program crashed ({name})", (stderr[-4000:] + f"\nProgram was stopped by {name}.").strip(), name))
        # Non-zero exit code
        if req.language == "python":
            return done(False, _python_error(stderr))
        raw = (stderr[-4000:] + f"\nProgram exited with code {rc}.").strip()
        if "bad_alloc" in stderr:
            return done(False, error("memory", "memory", raw))
        return done(False, error("runtime", f"exit code {rc}", raw, "exit"))


def _python_error(stderr: str) -> dict[str, Any]:
    """Pull 'NameError: ...' and the line number out of a Python traceback."""
    lines = [ln for ln in stderr.strip().splitlines() if ln.strip()]
    last = lines[-1] if lines else "Error"
    m = re.match(r"^(\w+(?:Error|Exception|Interrupt|Exit)?):\s?(.*)$", last)
    etype, msg = (m.group(1), m.group(2)) if m else ("Error", last)
    line_nos = re.findall(r'File "main\.py", line (\d+)', stderr)
    err = error("compile" if etype in ("SyntaxError", "IndentationError", "TabError") else "runtime", msg, stderr[-4000:], etype)
    if line_nos:
        err["line"] = int(line_nos[-1])
    if etype == "MemoryError":
        err["kind"] = "memory"
    return err
