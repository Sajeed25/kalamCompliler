import time


def teacher(client, email="t1@example.org"):
    r = client.post(
        "/api/auth/teacher/register",
        json={"name": "Ms Rao", "email": email, "password": "password123", "invite_code": "SCHOOL-123"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def setup_class(client):
    h = teacher(client)
    c = client.post("/api/classes", json={"name": "Grade 5 A"}, headers=h).json()
    students = client.post(f"/api/classes/{c['id']}/students", json={"names": ["Asha", "Ravi", "Ravi"]}, headers=h).json()
    return h, c, students


def student_login(client, c, s):
    r = client.post("/api/auth/student/login", json={"class_code": c["code"], "student_id": s["id"], "pin": s["pin"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_health_and_config(client):
    assert client.get("/api/health").json() == {"ok": True}
    cfg = client.get("/api/config").json()
    assert cfg["ai_enabled"] is False
    assert cfg["limits"]["cpu_seconds"] == 5


def test_register_needs_invite(client):
    r = client.post(
        "/api/auth/teacher/register",
        json={"name": "X", "email": "x@example.org", "password": "password123", "invite_code": "wrong"},
    )
    assert r.status_code == 403


def test_teacher_login(client):
    teacher(client, "t2@example.org")
    assert client.post("/api/auth/teacher/login", json={"email": "t2@example.org", "password": "nope"}).status_code == 401
    r = client.post("/api/auth/teacher/login", json={"email": "T2@example.org", "password": "password123"})
    assert r.status_code == 200 and r.json()["teacher"]["name"] == "Ms Rao"


def test_admin_bootstrap(client):
    r = client.post("/api/auth/teacher/login", json={"email": "admin@example.org", "password": "admin-password-1"})
    assert r.json()["teacher"]["is_admin"] is True
    stats = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {r.json()['token']}"})
    assert stats.status_code == 200 and "executor" in stats.json()


def test_class_and_students(client):
    h, c, students = setup_class(client)
    assert len(c["code"]) == 6
    assert [s["name"] for s in students] == ["Asha", "Ravi", "Ravi 2"]
    assert all(len(s["pin"]) == 4 for s in students)
    roster = client.get(f"/api/auth/class/{c['code'].lower()}").json()
    assert [s["name"] for s in roster["students"]] == ["Asha", "Ravi", "Ravi 2"]
    assert "pin" not in str(roster)
    assert client.get("/api/auth/class/NOPE99").status_code == 404
    h2 = teacher(client, "other@example.org")
    assert client.get(f"/api/classes/{c['id']}", headers=h2).status_code == 404


def test_student_pin_login_and_lockout(client):
    _, c, students = setup_class(client)
    s = students[0]
    wrong = "0000" if s["pin"] != "0000" else "1111"
    for _ in range(8):
        r = client.post("/api/auth/student/login", json={"class_code": c["code"], "student_id": s["id"], "pin": wrong})
        assert r.status_code == 401
    r = client.post("/api/auth/student/login", json={"class_code": c["code"], "student_id": s["id"], "pin": s["pin"]})
    assert r.status_code == 429


def test_reset_pin(client):
    h, c, students = setup_class(client)
    new = client.post(f"/api/students/{students[1]['id']}/reset-pin", headers=h).json()["pin"]
    student_login(client, c, {**students[1], "pin": new})


def test_assignment_flow_python(client):
    h, c, students = setup_class(client)
    body = {
        "title": "Square it",
        "instructions": "Read a number and print its square.",
        "language": "python",
        "starter_code": "n = int(input('Number? '))\n",
        "tests": [{"input": "3", "expected": "9"}, {"input": "12", "expected": "144", "hidden": True}],
        "match_mode": "exact",
    }
    a = client.post(f"/api/classes/{c['id']}/assignments", json=body, headers=h).json()
    sh = student_login(client, c, students[0])

    seen = client.get(f"/api/assignments/{a['id']}", headers=sh).json()
    assert seen["tests"][1] == {"input": "", "expected": "", "hidden": True}

    r = client.post(f"/api/assignments/{a['id']}/check", json={"code": "n = int(input('Number? '))\nprint(n + n)\n"}, headers=sh).json()
    assert r["passed"] == 0 and r["results"][0]["actual"] == "6\n"
    assert "actual" not in r["results"][1]

    time.sleep(3.1)
    r = client.post(f"/api/assignments/{a['id']}/check", json={"code": "n = int(input('Number? '))\nprint(n * n)\n"}, headers=sh).json()
    assert r["passed"] == 2

    mine = client.get("/api/student/assignments", headers=sh).json()
    assert mine[0]["my_status"] == "passed"

    subs = client.get(f"/api/assignments/{a['id']}/submissions", headers=h).json()["submissions"]
    asha = next(s for s in subs if s["student_name"] == "Asha")
    assert asha["attempts"] == 2 and asha["passed"] == 2
    csv = client.get(f"/api/assignments/{a['id']}/export.csv", headers=h)
    assert "Asha,2,2,2" in csv.text

    h2 = teacher(client, "x2@example.org")
    c2 = client.post("/api/classes", json={"name": "Other"}, headers=h2).json()
    s2 = client.post(f"/api/classes/{c2['id']}/students", json={"names": ["Zoe"]}, headers=h2).json()[0]
    assert client.get(f"/api/assignments/{a['id']}", headers=student_login(client, c2, s2)).status_code == 404


def test_assignment_c_compile_error(client):
    h, c, students = setup_class(client)
    body = {"title": "Hi", "language": "c", "tests": [{"input": "", "expected": "Hi"}, {"input": "", "expected": "Hi"}]}
    a = client.post(f"/api/classes/{c['id']}/assignments", json=body, headers=h).json()
    sh = student_login(client, c, students[0])
    r = client.post(f"/api/assignments/{a['id']}/check", json={"code": 'int main(){ printf("Hi") }'}, headers=sh).json()
    assert [x["problem"] for x in r["results"]] == ["compile", "compile"]


def test_teacher_try_tests(client):
    h, _, _ = setup_class(client)
    code = '#include <iostream>\nint main(){int a,b; std::cin>>a>>b; std::cout<<a+b<<"\\n";}'
    r = client.post(
        "/api/assignments/try",
        json={"language": "cpp", "code": code, "tests": [{"input": "2 3", "expected": "5"}], "match_mode": "exact"},
        headers=h,
    ).json()
    assert r["results"][0]["passed"] is True


def test_students_cannot_use_teacher_endpoints(client):
    h, c, students = setup_class(client)
    sh = student_login(client, c, students[0])
    assert client.get("/api/classes", headers=sh).status_code == 403
    assert client.post(f"/api/classes/{c['id']}/students", json={"names": ["X"]}, headers=sh).status_code == 403


def test_shares(client):
    r = client.post("/api/shares", json={"language": "python", "code": "print(1)", "title": "My game"})
    slug = r.json()["slug"]
    got = client.get(f"/api/shares/{slug}").json()
    assert got["code"] == "print(1)" and got["title"] == "My game"
    assert client.get("/api/shares/doesnotexist").status_code == 404
    assert client.post("/api/shares", json={"language": "java", "code": "x"}).status_code == 422


def test_progress_sync(client):
    _, c, students = setup_class(client)
    sh = student_login(client, c, students[0])
    client.put("/api/progress", json={"stars": {"python/hello": 2}, "badges": {"first_run": "2026-01-01"}, "counters": {"runs": 5}}, headers=sh)
    client.put("/api/progress", json={"stars": {"python/hello": 1, "c/hello": 9}, "counters": {"runs": 3}}, headers=sh)
    p = client.get("/api/progress", headers=sh).json()
    assert p["stars"] == {"python/hello": 2, "c/hello": 2}
    assert p["counters"]["runs"] == 5
    assert "first_run" in p["badges"]


def test_ai_disabled_by_default(client):
    assert client.post("/api/ai/explain", json={"language": "python", "code": "print(1)"}).status_code == 404


# ---------------------------------------------------------------- WebSocket runs
def ws_run(client, language, code, inputs=(), client_id="kid-1"):
    events = []
    with client.websocket_connect("/api/run/ws") as ws:
        ws.send_json({"type": "run", "language": language, "code": code, "client_id": client_id})
        pending = list(inputs)
        while True:
            msg = ws.receive_json()
            events.append(msg)
            if msg["type"] == "input-request" and pending:
                ws.send_json({"type": "stdin", "data": pending.pop(0) + "\n"})
            if msg["type"] in ("done", "error"):
                break
    return events


def stdout_of(events):
    return "".join(e.get("data", "") for e in events if e["type"] == "stdout")


def test_ws_hello_c(client):
    ev = ws_run(client, "c", '#include <stdio.h>\nint main(){ printf("Hello, World!\\n"); }')
    assert stdout_of(ev) == "Hello, World!\n"
    assert ev[-1]["result"]["ok"] is True
    assert [e["status"] for e in ev if e["type"] == "status"] == ["loading", "compiling", "running"]


def test_ws_interactive_cpp(client):
    code = '#include <iostream>\n#include <string>\nint main(){ std::string n; std::cout << "Name? "; std::cin >> n; std::cout << "Hi " << n << "\\n"; }'
    ev = ws_run(client, "cpp", code, inputs=["Asha"], client_id="kid-2")
    assert stdout_of(ev) == "Name? Hi Asha\n"


def test_ws_rate_limit(client):
    ws_run(client, "c", "int main(){return 0;}", client_id="kid-3")
    ev = ws_run(client, "c", "int main(){return 0;}", client_id="kid-3")
    assert ev[-1]["type"] == "error" and ev[-1]["code"] == "rate_limited"


def test_ws_rejects_python_and_huge_code(client):
    assert ws_run(client, "python", "print(1)", client_id="kid-4")[-1]["code"] == "bad_request"
    assert ws_run(client, "c", "x" * 70_000, client_id="kid-5")[-1]["code"] == "code_too_long"


def test_ws_warnings_are_returned(client):
    code = '#include <stdio.h>\nint main(){ int x; scanf("%d", x); return 0; }'
    ev = ws_run(client, "c", code, inputs=["1"], client_id="kid-6")
    res = ev[-1]["result"]
    assert "warnings" in res and "scanf" in res["warnings"]
