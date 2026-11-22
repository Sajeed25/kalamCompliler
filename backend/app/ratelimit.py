"""Rate limiting. Uses Redis when KALAM_REDIS_URL is set (needed with several
backend processes), otherwise an in-memory store (fine for one process)."""
from __future__ import annotations

import time

from .config import get_settings


class _MemoryStore:
    def __init__(self) -> None:
        self.data: dict[str, tuple[float, int]] = {}

    async def incr_window(self, key: str, window: float) -> int:
        now = time.monotonic()
        start, count = self.data.get(key, (now, 0))
        if now - start >= window:
            start, count = now, 0
        count += 1
        self.data[key] = (start, count)
        if len(self.data) > 50_000:  # keep memory bounded
            cutoff = now - 3600
            self.data = {k: v for k, v in self.data.items() if v[0] > cutoff}
        return count

    async def set_if_absent(self, key: str, seconds: float) -> bool:
        now = time.monotonic()
        start, _ = self.data.get(key, (0.0, 0))
        if now - start < seconds:
            return False
        self.data[key] = (now, 1)
        return True

    async def reset(self, key: str) -> None:
        self.data.pop(key, None)


class _RedisStore:
    def __init__(self, url: str) -> None:
        import redis.asyncio as redis

        self.r = redis.from_url(url)

    async def incr_window(self, key: str, window: float) -> int:
        k = f"kalam:rl:{key}"
        pipe = self.r.pipeline()
        pipe.incr(k)
        pipe.expire(k, int(window), nx=True)
        count, _ = await pipe.execute()
        return int(count)

    async def set_if_absent(self, key: str, seconds: float) -> bool:
        return bool(await self.r.set(f"kalam:gap:{key}", 1, px=int(seconds * 1000), nx=True))

    async def reset(self, key: str) -> None:
        await self.r.delete(f"kalam:rl:{key}")


_store: _MemoryStore | _RedisStore | None = None


def store() -> _MemoryStore | _RedisStore:
    global _store
    if _store is None:
        url = get_settings().redis_url
        _store = _RedisStore(url) if url else _MemoryStore()
    return _store


def reset_store() -> None:
    global _store
    _store = None


async def allow(key: str, limit: int, window_seconds: float) -> bool:
    """At most `limit` hits per window."""
    try:
        return await store().incr_window(key, window_seconds) <= limit
    except Exception:  # Redis down: fail open rather than block a classroom
        return True


async def allow_gap(key: str, seconds: float) -> bool:
    """At least `seconds` between hits."""
    if seconds <= 0:
        return True
    try:
        return await store().set_if_absent(key, seconds)
    except Exception:
        return True


async def clear(key: str) -> None:
    try:
        await store().reset(key)
    except Exception:
        pass
