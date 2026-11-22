"""Auto-check for assignments: run the student's program on each test input and
compare its output with the teacher's expected output."""
from __future__ import annotations

from typing import Any

from .executors import RunControl, get_executor, make_request


def normalize(text: str) -> str:
    """Ignore Windows line endings, spaces at line ends and blank lines at the end."""
    lines = [ln.rstrip() for ln in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def matches(actual: str, expected: str, mode: str) -> bool:
    a, e = normalize(actual), normalize(expected)
    if mode == "contains":
        return e in a
    return a == e


async def _noop(_event: dict) -> None:
    return None


async def grade(language: str, code: str, tests: list[dict[str, Any]], match_mode: str) -> list[dict[str, Any]]:
    """Run every test. Tests run one after another so one student can't hog the server."""
    executor = get_executor()
    results: list[dict[str, Any]] = []
    for i, t in enumerate(tests):
        req = make_request(language, code, stdin=str(t.get("input", "")), graded=True)  # type: ignore[arg-type]
        outcome = await executor.run(req, RunControl(), _noop)
        res: dict[str, Any] = {"index": i, "hidden": bool(t.get("hidden"))}
        if outcome.error and outcome.error.get("kind") == "compile":
            # Same compile error for every test: report it once for all.
            for j in range(i, len(tests)):
                results.append({"index": j, "hidden": bool(tests[j].get("hidden")), "passed": False, "problem": "compile"})
            return results
        if outcome.ok:
            res["passed"] = matches(outcome.stdout, str(t.get("expected", "")), match_mode)
        else:
            res["passed"] = False
            kind = (outcome.error or {}).get("kind")
            res["problem"] = "timeout" if kind == "timeout" else "output-limit" if kind == "output-limit" else "error"
            res["error"] = ((outcome.error or {}).get("raw") or "")[-1000:]
        if not res["hidden"]:
            res["input"] = t.get("input", "")
            res["expected"] = t.get("expected", "")
            res["actual"] = outcome.stdout[-2000:]
        else:
            res.pop("error", None)
        results.append(res)
    return results
