"""Common interface for the things that compile and run student code."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Literal, Protocol

Language = Literal["c", "cpp", "python"]
Emit = Callable[[dict[str, Any]], Awaitable[None]]

# Linked into every C/C++ program: makes stdout unbuffered, so a prompt like
# printf("Your name? ") shows up *before* the program waits for input.
UNBUFFER_RUNTIME = """\
#include <stdio.h>
__attribute__((constructor)) static void kalam_unbuffer(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
}
"""

SOURCE_NAME = {"c": "main.c", "cpp": "main.cpp", "python": "main.py"}


@dataclass
class RunRequest:
    language: Language
    code: str
    cpu_seconds: float
    wall_seconds: float
    idle_input_seconds: float
    memory_mb: int
    max_output_bytes: int
    max_processes: int
    max_file_kb: int
    compile_seconds: float
    compile_flags: list[str]
    #: For graded runs: everything the program will read, given up front.
    stdin: str | None = None
    #: Python only: don't print input() prompts (makes output easy to grade).
    quiet_prompts: bool = False


@dataclass
class RunControl:
    """Lets the caller feed input and stop the program while it runs."""

    stdin: asyncio.Queue[str] = field(default_factory=asyncio.Queue)
    stop: asyncio.Event = field(default_factory=asyncio.Event)


@dataclass
class RunOutcome:
    ok: bool
    stopped: bool = False
    error: dict[str, Any] | None = None
    warnings: str = ""
    stdout: str = ""  # collected when the caller asked for it (grading)
    time_ms: int = 0

    def to_client(self) -> dict[str, Any]:
        d: dict[str, Any] = {"ok": self.ok, "timeMs": self.time_ms}
        if self.stopped:
            d["stopped"] = True
        if self.error:
            d["error"] = self.error
        if self.warnings:
            d["warnings"] = self.warnings
        return d


class Executor(Protocol):
    name: str
    #: Whether the executor can tell when the program is waiting for input.
    input_detection: bool

    async def run(self, req: RunRequest, control: RunControl, emit: Emit) -> RunOutcome: ...

    async def health(self) -> dict[str, Any]: ...


def error(kind: str, message: str, raw: str = "", type_: str | None = None) -> dict[str, Any]:
    e: dict[str, Any] = {"kind": kind, "message": message, "raw": raw or message}
    if type_:
        e["type"] = type_
    return e


# Python prelude used for graded Python runs on the server (and by Piston).
PY_RUNNER = r'''
import builtins, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "kalam_shim"))
QUIET = {quiet}
if QUIET:
    _orig_input = builtins.input
    def _quiet_input(prompt=""):
        line = sys.stdin.readline()
        if not line:
            raise EOFError("EOF when reading a line")
        return line.rstrip("\n")
    builtins.input = _quiet_input
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py"), encoding="utf-8").read()
code = compile(src, "main.py", "exec")
exec(code, {{"__name__": "__main__"}})
'''

# turtle module that ignores drawing on the server (graded runs only print text).
KALAM_BRIDGE_STUB = """\
def turtle(_json):
    pass
def read_line():
    import sys
    line = sys.stdin.readline()
    return None if not line else line.rstrip("\\n")
def sleep(_s):
    pass
"""
