from __future__ import annotations

import csv
import io
import json
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from .. import ratelimit
from ..config import get_limits
from ..deps import DB, MaybeUser, StudentUser, TeacherUser
from ..grader import grade
from ..models import Assignment, Classroom, Student, Submission, Teacher
from ..runs import BusyError, slots

router = APIRouter(prefix="/api", tags=["assignments"])


class TestCase(BaseModel):
    input: str = Field(default="", max_length=10_000)
    expected: str = Field(default="", max_length=20_000)
    hidden: bool = False


class AssignmentIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    instructions: str = Field(default="", max_length=5000)
    language: Literal["python", "c", "cpp"]
    starter_code: str = Field(default="", max_length=64 * 1024)
    tests: list[TestCase] = Field(default_factory=list)
    match_mode: Literal["exact", "contains"] = "exact"


def assignment_out(a: Assignment, for_student: bool) -> dict:
    tests = json.loads(a.tests_json or "[]")
    if for_student:
        # Secret tests stay secret: students only learn that they exist.
        tests = [t if not t.get("hidden") else {"input": "", "expected": "", "hidden": True} for t in tests]
    return {
        "id": a.id,
        "class_id": a.class_id,
        "title": a.title,
        "instructions": a.instructions,
        "language": a.language,
        "starter_code": a.starter_code,
        "tests": tests,
        "match_mode": a.match_mode,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


async def own_class(db, teacher: Teacher, class_id: int) -> Classroom:
    c = await db.get(Classroom, class_id)
    if not c or (c.teacher_id != teacher.id and not teacher.is_admin):
        raise HTTPException(404, "Class not found")
    return c


def check_tests(tests: list[TestCase]) -> None:
    if len(tests) > get_limits().assignments.max_tests:
        raise HTTPException(400, f"At most {get_limits().assignments.max_tests} tests")


@router.post("/classes/{class_id}/assignments")
async def create_assignment(class_id: int, body: AssignmentIn, db: DB, teacher: TeacherUser):
    await own_class(db, teacher, class_id)
    check_tests(body.tests)
    a = Assignment(
        class_id=class_id,
        title=body.title.strip(),
        instructions=body.instructions,
        language=body.language,
        starter_code=body.starter_code,
        tests_json=json.dumps([t.model_dump() for t in body.tests]),
        match_mode=body.match_mode,
    )
    db.add(a)
    await db.commit()
    return assignment_out(a, for_student=False)


async def load_assignment(db, user, assignment_id: int) -> tuple[Assignment, bool]:
    """Returns the assignment and whether the viewer is a student."""
    a = await db.get(Assignment, assignment_id)
    if not a or user is None:
        raise HTTPException(404, "Assignment not found")
    if isinstance(user, Student):
        if user.class_id != a.class_id:
            raise HTTPException(404, "Assignment not found")
        return a, True
    await own_class(db, user, a.class_id)
    return a, False


@router.get("/assignments/{assignment_id}")
async def get_assignment(assignment_id: int, db: DB, user: MaybeUser):
    a, is_student = await load_assignment(db, user, assignment_id)
    return assignment_out(a, for_student=is_student)


@router.put("/assignments/{assignment_id}")
async def update_assignment(assignment_id: int, body: AssignmentIn, db: DB, teacher: TeacherUser):
    a, _ = await load_assignment(db, teacher, assignment_id)
    check_tests(body.tests)
    a.title = body.title.strip()
    a.instructions = body.instructions
    a.language = body.language
    a.starter_code = body.starter_code
    a.tests_json = json.dumps([t.model_dump() for t in body.tests])
    a.match_mode = body.match_mode
    await db.commit()
    return assignment_out(a, for_student=False)


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: int, db: DB, teacher: TeacherUser):
    a, _ = await load_assignment(db, teacher, assignment_id)
    await db.delete(a)
    await db.commit()
    return {"ok": True}


async def run_grading(language: str, code: str, tests: list[dict], match_mode: str) -> list[dict]:
    try:
        async with slots().slot():
            return await grade(language, code, tests, match_mode)
    except BusyError:
        raise HTTPException(503, {"code": "busy", "message": "Lots of students are running code right now"}) from None


class CheckIn(BaseModel):
    code: str = Field(max_length=64 * 1024)


@router.post("/assignments/{assignment_id}/check")
async def check_assignment(assignment_id: int, body: CheckIn, db: DB, student: StudentUser):
    a, _ = await load_assignment(db, student, assignment_id)
    if not await ratelimit.allow_gap(f"check:{student.id}", 3):
        raise HTTPException(429, {"code": "rate_limited", "message": "Please wait a moment"})
    tests = json.loads(a.tests_json or "[]")
    results = await run_grading(a.language, body.code, tests, a.match_mode)
    passed = sum(1 for r in results if r.get("passed"))
    db.add(Submission(assignment_id=a.id, student_id=student.id, code=body.code, results_json=json.dumps(results), passed=passed, total=len(results)))
    await db.commit()
    return {"results": results, "passed": passed, "total": len(results)}


class TryIn(BaseModel):
    language: Literal["python", "c", "cpp"]
    code: str = Field(max_length=64 * 1024)
    tests: list[TestCase]
    match_mode: Literal["exact", "contains"] = "exact"


@router.post("/assignments/try")
async def try_tests(body: TryIn, teacher: TeacherUser):
    """Lets a teacher check their tests against the starter code before publishing."""
    check_tests(body.tests)
    if not await ratelimit.allow_gap(f"try:{teacher.id}", 2):
        raise HTTPException(429, {"code": "rate_limited", "message": "Please wait a moment"})
    tests = [t.model_dump() | {"hidden": False} for t in body.tests]
    return {"results": await run_grading(body.language, body.code, tests, body.match_mode)}


@router.get("/student/assignments")
async def my_assignments(db: DB, student: StudentUser):
    rows = (await db.execute(select(Assignment).where(Assignment.class_id == student.class_id).order_by(Assignment.created_at.desc()))).scalars().all()
    best = {
        aid: (p, t)
        for aid, p, t in (
            await db.execute(
                select(Submission.assignment_id, func.max(Submission.passed), func.max(Submission.total))
                .where(Submission.student_id == student.id)
                .group_by(Submission.assignment_id)
            )
        ).all()
    }
    out = []
    for a in rows:
        d = assignment_out(a, for_student=True)
        b = best.get(a.id)
        d["my_best"] = {"passed": b[0], "total": b[1]} if b else None
        d["my_status"] = "new" if not b else "passed" if b[1] and b[0] == b[1] else "tried"
        out.append(d)
    return out


async def latest_submissions(db, a: Assignment) -> list[dict]:
    students = (await db.execute(select(Student).where(Student.class_id == a.class_id).order_by(Student.name))).scalars().all()
    subs = (
        await db.execute(select(Submission).where(Submission.assignment_id == a.id).order_by(Submission.created_at.desc()))
    ).scalars().all()
    latest: dict[int, Submission] = {}
    attempts: dict[int, int] = {}
    for s in subs:
        latest.setdefault(s.student_id, s)
        attempts[s.student_id] = attempts.get(s.student_id, 0) + 1
    rows = []
    for st in students:
        sub = latest.get(st.id)
        rows.append(
            {
                "student_id": st.id,
                "student_name": st.name,
                "submitted_at": sub.created_at.isoformat() if sub else None,
                "passed": sub.passed if sub else 0,
                "total": sub.total if sub else 0,
                "attempts": attempts.get(st.id, 0),
                "code": sub.code if sub else None,
                "results": json.loads(sub.results_json) if sub else None,
            }
        )
    return rows


@router.get("/assignments/{assignment_id}/submissions")
async def submissions(assignment_id: int, db: DB, teacher: TeacherUser):
    a, _ = await load_assignment(db, teacher, assignment_id)
    return {"assignment": assignment_out(a, for_student=False), "submissions": await latest_submissions(db, a)}


@router.get("/assignments/{assignment_id}/export.csv")
async def export_csv(assignment_id: int, db: DB, teacher: TeacherUser):
    a, _ = await load_assignment(db, teacher, assignment_id)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["student", "passed", "total", "attempts", "last_try"])
    for r in await latest_submissions(db, a):
        w.writerow([r["student_name"], r["passed"], r["total"], r["attempts"], r["submitted_at"] or ""])
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="assignment-{a.id}.csv"'},
    )
