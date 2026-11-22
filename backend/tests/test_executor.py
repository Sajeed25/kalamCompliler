"""Runs real programs through the local sandbox (needs gcc, g++, python3)."""
import asyncio
import shutil

import pytest

from app.executors import RunControl, make_request
from app.executors.local import LocalExecutor

pytestmark = pytest.mark.skipif(not shutil.which("gcc"), reason="gcc not installed")


@pytest.fixture(scope="module")
def ex():
    import os
    import tempfile

    root = tempfile.mkdtemp(prefix="kalam-exec-")
    os.chmod(root, 0o755)  # the sandboxed `nobody` user must be able to reach the binaries
    return LocalExecutor(work_root=root)


async def run(ex, lang, code, stdin=None, inputs=(), cpu=None, graded=False, stop_after=None):
    req = make_request(lang, code, stdin=stdin, graded=graded)
    if cpu:
        req.cpu_seconds = cpu
        req.wall_seconds = cpu + 2
    control = RunControl()
    events = []

    async def emit(e):
        events.append(e)
        if e["type"] == "input-request" and inputs:
            await control.stdin.put(inputs[0] + "\n")
            inputs_list.pop(0) if inputs_list else None

    inputs_list = list(inputs)

    async def emit2(e):
        events.append(e)
        if e["type"] == "input-request" and inputs_list:
            await control.stdin.put(inputs_list.pop(0) + "\n")

    if stop_after:
        async def stopper():
            await asyncio.sleep(stop_after)
            control.stop.set()
        asyncio.get_running_loop().create_task(stopper())
    outcome = await ex.run(req, control, emit2)
    out = "".join(e["data"] for e in events if e["type"] == "stdout")
    return outcome, out, events


async def test_c_hello(ex):
    o, out, _ = await run(ex, "c", '#include <stdio.h>\nint main(){ printf("Hello\\n"); return 0; }')
    assert o.ok, o.error
    assert out == "Hello\n"


async def test_cpp_hello(ex):
    o, out, _ = await run(ex, "cpp", '#include <iostream>\nint main(){ std::cout << "Hi C++" << std::endl; }')
    assert o.ok, o.error
    assert out == "Hi C++\n"


async def test_compile_error_reports_line(ex):
    o, _, _ = await run(ex, "c", '#include <stdio.h>\nint main(){\n  printf("x")\n  return 0;\n}')
    assert not o.ok and o.error["kind"] == "compile"
    assert "main.c:3" in o.error["raw"]
    assert "expected ';'" in o.error["raw"]


async def test_missing_include_is_an_error(ex):
    o, _, _ = await run(ex, "c", 'int main(){ printf("x"); return 0; }')
    assert o.error["kind"] == "compile"
    assert "implicit declaration of function 'printf'" in o.error["raw"]


async def test_interactive_input_with_prompt_before_wait(ex):
    code = '#include <stdio.h>\nint main(){ int a; printf("Number? "); scanf("%d",&a); printf("Double: %d\\n", a*2); return 0; }'
    o, out, events = await run(ex, "c", code, inputs=["21"])
    assert o.ok, o.error
    assert out == "Number? Double: 42\n"
    kinds = [e["type"] for e in events]
    # The prompt must arrive before the program asks for input (unbuffered stdout).
    assert kinds.index("stdout") < kinds.index("input-request")


async def test_infinite_loop_hits_cpu_limit(ex):
    o, _, _ = await run(ex, "c", "int main(){ volatile long i=0; for(;;) i++; }", cpu=1)
    assert not o.ok and o.error["kind"] == "timeout"


async def test_output_limit(ex):
    o, _, _ = await run(ex, "c", '#include <stdio.h>\nint main(){ for(;;) printf("spam spam spam\\n"); }')
    assert not o.ok and o.error["kind"] == "output-limit"


async def test_segfault(ex):
    o, _, _ = await run(ex, "c", "int main(){ int *p = 0; *p = 1; return 0; }")
    assert o.error["kind"] == "runtime" and o.error["type"] == "SIGSEGV"


async def test_divide_by_zero(ex):
    o, _, _ = await run(ex, "c", "#include <stdio.h>\nint main(){ int a=0; scanf(\"%d\",&a); printf(\"%d\", 5/a); }", stdin="0")
    assert o.error["type"] == "SIGFPE"


async def test_memory_limit(ex):
    code = "#include <vector>\nint main(){ std::vector<char> v; for(;;) v.resize(v.size() + 50000000, 1); }"
    o, _, _ = await run(ex, "cpp", code)
    assert not o.ok and o.error["kind"] == "memory"


async def test_stop(ex):
    o, _, _ = await run(ex, "c", "int main(){ for(;;); }", stop_after=0.5)
    assert o.stopped


async def test_fork_bomb_is_contained(ex):
    if not ex.drop_privileges:
        pytest.skip("process limit needs root to drop to nobody")
    code = "#include <unistd.h>\nint main(){ for(int i=0;i<1000;i++) fork(); return 0; }"
    o, _, _ = await run(ex, "c", code, cpu=1)
    assert o is not None  # finished; the server is still alive


async def test_no_network(ex):
    if not ex.isolate_network:
        pytest.skip("network namespaces unavailable here")
    code = r'''
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
int main(){
  int s = socket(AF_INET, SOCK_STREAM, 0);
  struct sockaddr_in a = {0}; a.sin_family = AF_INET; a.sin_port = htons(80);
  inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
  printf(connect(s, (struct sockaddr*)&a, sizeof a) == 0 ? "connected\n" : "blocked\n");
}'''
    o, out, _ = await run(ex, "c", code)
    assert out == "blocked\n"


async def test_cannot_read_secrets_via_include(ex):
    if not ex.drop_privileges:
        pytest.skip("needs root")
    o, _, _ = await run(ex, "c", '#include "/etc/shadow"\nint main(){}')
    assert o.error["kind"] == "compile"
    assert "Permission denied" in o.error["raw"]


async def test_python_graded_quiet_prompts(ex):
    code = 'n = int(input("Number? "))\nprint(n * n)\n'
    o, out, _ = await run(ex, "python", code, stdin="7", graded=True)
    assert o.ok, o.error
    assert o.stdout == "49\n"


async def test_python_error_has_line(ex):
    o, _, _ = await run(ex, "python", 'x = 1\nprint(y)\n', stdin="", graded=True)
    assert o.error["type"] == "NameError" and o.error["line"] == 2


async def test_python_turtle_stub_on_server(ex):
    o, _, _ = await run(ex, "python", "import turtle\nt = turtle.Turtle()\nt.forward(10)\nprint('ok')\n", stdin="", graded=True)
    assert o.ok, o.error
    assert o.stdout == "ok\n"


async def test_compile_cache_reuses_binary(ex):
    code = '#include <stdio.h>\nint main(){ printf("cached\\n"); }'
    await run(ex, "c", code)
    before = len(list(ex.cache.glob("*.bin")))
    o, out, _ = await run(ex, "c", code)
    assert o.ok and out == "cached\n"
    assert len(list(ex.cache.glob("*.bin"))) == before
