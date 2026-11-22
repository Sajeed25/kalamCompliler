"""WebSocket endpoint that runs C/C++ programs interactively, with fair limits."""
from __future__ import annotations

import asyncio
import contextlib
import logging
from collections import Counter
from datetime import date

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from . import ratelimit
from .config import get_limits
from .executors import RunControl, get_executor, make_request
from .security import read_token
from .util import client_ip

log = logging.getLogger("kalam.runs")
router = APIRouter()


class Slots:
    """At most N programs run at once; others wait in a short queue."""

    def __init__(self) -> None:
        self.max = get_limits().queue.max_concurrent_runs
        self.sem = asyncio.Semaphore(self.max)
        self.waiting = 0
        self.active = 0

    @contextlib.asynccontextmanager
    async def slot(self):
        q = get_limits().queue
        if self.waiting >= q.max_waiting:
            raise BusyError()
        self.waiting += 1
        try:
            await asyncio.wait_for(self.sem.acquire(), timeout=q.wait_timeout_seconds)
        except asyncio.TimeoutError:
            raise BusyError() from None
        finally:
            self.waiting -= 1
        self.active += 1
        try:
            yield
        finally:
            self.active -= 1
            self.sem.release()


class BusyError(Exception):
    pass


_slots: Slots | None = None


def slots() -> Slots:
    global _slots
    if _slots is None:
        _slots = Slots()
    return _slots


class Stats:
    def __init__(self) -> None:
        self.day = date.today()
        self.by_lang: Counter[str] = Counter()
        self.outcomes: Counter[str] = Counter()

    def record(self, lang: str, outcome: str) -> None:
        if date.today() != self.day:
            self.day = date.today()
            self.by_lang.clear()
            self.outcomes.clear()
        self.by_lang[lang] += 1
        self.outcomes[outcome] += 1


stats = Stats()


async def check_run_limits(client_key: str, ip: str) -> str | None:
    rl = get_limits().rate_limit
    if not await ratelimit.allow_gap(f"run:{client_key}", rl.min_seconds_between_runs):
        return "rate_limited"
    if not await ratelimit.allow(f"runip:{ip}", rl.runs_per_minute_per_ip, 60):
        return "rate_limited"
    return None


@router.websocket("/api/run/ws")
async def run_ws(ws: WebSocket) -> None:
    await ws.accept()
    try:
        first = await asyncio.wait_for(ws.receive_json(), timeout=10)
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError):
        await ws.close()
        return

    async def fail(code: str, message: str) -> None:
        with contextlib.suppress(Exception):
            await ws.send_json({"type": "error", "code": code, "message": message})
            await ws.close()

    lang = first.get("language")
    code = first.get("code")
    if first.get("type") != "run" or lang not in ("c", "cpp") or not isinstance(code, str):
        await fail("bad_request", "Expected {type: 'run', language: 'c'|'cpp', code}")
        return
    if len(code.encode()) > get_limits().run.max_code_kb * 1024:
        await fail("code_too_long", "Program is too long")
        return

    who = read_token(first["token"]) if isinstance(first.get("token"), str) else None
    client_key = f"{who[0]}:{who[1]}" if who else str(first.get("client_id") or "")[:64] or client_ip(ws)
    ip = client_ip(ws)
    limited = await check_run_limits(client_key, ip)
    if limited:
        await fail(limited, "Please wait a moment before running again")
        return

    control = RunControl()

    async def emit(event: dict) -> None:
        await ws.send_json(event)

    async def listen() -> None:
        try:
            while True:
                msg = await ws.receive_json()
                if msg.get("type") == "stdin" and isinstance(msg.get("data"), str):
                    await control.stdin.put(msg["data"])
                elif msg.get("type") == "stop":
                    control.stop.set()
        except (WebSocketDisconnect, RuntimeError, ValueError):
            control.stop.set()  # browser closed: stop the program

    listener = asyncio.create_task(listen())
    try:
        await emit({"type": "status", "status": "loading"})
        async with slots().slot():
            outcome = await get_executor().run(make_request(lang, code), control, emit)
        stats.record(lang, "ok" if outcome.ok else "stopped" if outcome.stopped else (outcome.error or {}).get("kind", "error"))
        with contextlib.suppress(Exception):
            await ws.send_json({"type": "done", "result": outcome.to_client()})
            await ws.close()
    except BusyError:
        stats.record(lang, "busy")
        await fail("busy", "Lots of students are running code right now")
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("run failed")
        await fail("system", "Something went wrong on the server")
    finally:
        listener.cancel()
