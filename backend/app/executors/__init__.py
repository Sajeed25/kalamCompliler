"""Picks the executor and turns admin limits into a RunRequest."""
from __future__ import annotations

from functools import lru_cache

from ..config import get_limits, get_settings
from .base import Executor, Language, RunControl, RunOutcome, RunRequest


@lru_cache
def get_executor() -> Executor:
    s = get_settings()
    limits = get_limits()
    if s.executor == "piston":
        from .piston import PistonExecutor

        return PistonExecutor(s.piston_url, {"c": s.piston_c_version, "cpp": s.piston_cpp_version, "python": "*"})
    from .local import LocalExecutor

    return LocalExecutor(cache_entries=limits.compile_cache.max_entries, cache_enabled=limits.compile_cache.enabled)


def make_request(language: Language, code: str, *, stdin: str | None = None, graded: bool = False) -> RunRequest:
    lim = get_limits()
    r = lim.run
    flags = lim.compile.c_flags if language == "c" else lim.compile.cpp_flags if language == "cpp" else []
    return RunRequest(
        language=language,
        code=code,
        cpu_seconds=lim.assignments.test_cpu_seconds if graded else r.cpu_seconds,
        wall_seconds=r.wall_seconds,
        idle_input_seconds=r.idle_input_seconds,
        memory_mb=r.memory_mb,
        max_output_bytes=r.max_output_kb * 1024,
        max_processes=r.max_processes,
        max_file_kb=r.max_file_kb,
        compile_seconds=r.compile_seconds,
        compile_flags=list(flags),
        stdin=stdin,
        quiet_prompts=graded,
    )


__all__ = ["get_executor", "make_request", "RunControl", "RunOutcome", "RunRequest"]
