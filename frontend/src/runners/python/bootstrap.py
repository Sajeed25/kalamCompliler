# Runs once when Python starts in the browser. Sets up input(), time.sleep()
# and the turtle module, and defines _kalam_run() which runs student code and
# returns a JSON summary that the error explainer understands.
import builtins
import json
import sys
import time
import traceback

import kalam_bridge

sys.path.insert(0, "/home/pyodide/kalam")


def _kalam_input(prompt=""):
    if prompt:
        sys.stdout.write(str(prompt))
    sys.stdout.flush()
    line = kalam_bridge.read_line()
    if line is None:
        raise KeyboardInterrupt
    return line


def _kalam_sleep(secs):
    secs = float(secs)
    if secs < 0:
        raise ValueError("sleep length must be non-negative")
    sys.stdout.flush()
    kalam_bridge.sleep(secs)


builtins.input = _kalam_input
time.sleep = _kalam_sleep


def _user_frames(tb_exc):
    return [f for f in tb_exc.stack if f.filename == "main.py"]


def _kalam_run(src):
    if "turtle" in sys.modules:
        sys.modules["turtle"]._reset_all()
    g = {"__name__": "__main__", "__builtins__": builtins}
    try:
        code = compile(src, "main.py", "exec")
        exec(code, g)
        return json.dumps({"ok": True})
    except SystemExit:
        return json.dumps({"ok": True})
    except KeyboardInterrupt:
        return json.dumps({"ok": False, "stopped": True})
    except BaseException as e:  # noqa: BLE001 - we report every student error
        te = traceback.TracebackException.from_exception(e)
        frames = _user_frames(te)
        te.stack = traceback.StackSummary.from_list(frames)
        raw = "".join(te.format())
        line = None
        col = None
        if isinstance(e, SyntaxError) and e.filename == "main.py":
            line = e.lineno
            col = e.offset
        elif frames:
            line = frames[-1].lineno
        kind = "compile" if isinstance(e, SyntaxError) else "runtime"
        if isinstance(e, MemoryError):
            kind = "memory"
        return json.dumps(
            {
                "ok": False,
                "error": {
                    "kind": kind,
                    "type": type(e).__name__,
                    "message": str(e),
                    "line": line,
                    "column": col,
                    "raw": raw,
                },
            }
        )
    finally:
        try:
            sys.stdout.flush()
            sys.stderr.flush()
        except Exception:
            pass
