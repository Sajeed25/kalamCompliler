from __future__ import annotations

import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from ..deps import DB, TeacherUser
from ..models import Assignment, Classroom, Student, Teacher
from ..security import hash_secret, new_class_code, new_pin
from .assignments import assignment_out

router = APIRouter(prefix="/api", tags=["classes"])


async def own_class(db, teacher: Teacher, class_id: int) -> Classroom:
    c = await db.get(Classroom, class_id)
    if not c or (c.teacher_id != teacher.id and not teacher.is_admin):
        raise HTTPException(404, "Class not found")
    return c


class ClassIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


def class_out(c: Classroom, count: int) -> dict:
    return {"id": c.id, "name": c.name, "code": c.code, "student_count": count}


@router.get("/classes")
async def list_classes(db: DB, teacher: TeacherUser):
    rows = (
        await db.execute(
            select(Classroom, func.count(Student.id))
            .outerjoin(Student, Student.class_id == Classroom.id)
            .where(Classroom.teacher_id == teacher.id)
            .group_by(Classroom.id)
            .order_by(Classroom.created_at.desc())
        )
    ).all()
    return [class_out(c, n) for c, n in rows]


@router.post("/classes")
async def create_class(body: ClassIn, db: DB, teacher: TeacherUser):
    for _ in range(10):
        code = new_class_code()
        if not (await db.execute(select(Classroom).where(Classroom.code == code))).scalar_one_or_none():
            break
    c = Classroom(name=body.name.strip(), code=code, teacher_id=teacher.id)
    db.add(c)
    await db.commit()
    return class_out(c, 0)


@router.get("/classes/{class_id}")
async def get_class(class_id: int, db: DB, teacher: TeacherUser):
    c = await own_class(db, teacher, class_id)
    students = (await db.execute(select(Student).where(Student.class_id == c.id).order_by(Student.name))).scalars().all()
    assignments = (
        await db.execute(select(Assignment).where(Assignment.class_id == c.id).order_by(Assignment.created_at.desc()))
    ).scalars().all()
    return {
        "class": class_out(c, len(students)),
        "students": [{"id": s.id, "name": s.name} for s in students],
        "assignments": [assignment_out(a, for_student=False) for a in assignments],
    }


@router.delete("/classes/{class_id}")
async def delete_class(class_id: int, db: DB, teacher: TeacherUser):
    c = await own_class(db, teacher, class_id)
    await db.delete(c)
    await db.commit()
    return {"ok": True}


class StudentsIn(BaseModel):
    names: list[str] = Field(min_length=1, max_length=100)


def clean_name(n: str) -> str:
    n = re.sub(r"\s+", " ", n).strip()[:40]
    return n


@router.post("/classes/{class_id}/students")
async def add_students(class_id: int, body: StudentsIn, db: DB, teacher: TeacherUser):
    c = await own_class(db, teacher, class_id)
    existing = set((await db.execute(select(Student.name).where(Student.class_id == c.id))).scalars().all())
    created = []
    for raw in body.names:
        name = clean_name(raw)
        if not name:
            continue
        base, i = name, 2
        while name in existing:  # two "Ravi"s become "Ravi" and "Ravi 2"
            name = f"{base} {i}"
            i += 1
        existing.add(name)
        pin = new_pin()
        s = Student(class_id=c.id, name=name, pin_hash=hash_secret(pin))
        db.add(s)
        created.append((s, pin))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Two students have the same name") from None
    return [{"id": s.id, "name": s.name, "pin": pin} for s, pin in created]


async def own_student(db, teacher: Teacher, student_id: int) -> Student:
    s = await db.get(Student, student_id)
    if not s:
        raise HTTPException(404, "Student not found")
    await own_class(db, teacher, s.class_id)
    return s


@router.post("/students/{student_id}/reset-pin")
async def reset_pin(student_id: int, db: DB, teacher: TeacherUser):
    s = await own_student(db, teacher, student_id)
    pin = new_pin()
    s.pin_hash = hash_secret(pin)
    await db.commit()
    return {"pin": pin}


@router.delete("/students/{student_id}")
async def remove_student(student_id: int, db: DB, teacher: TeacherUser):
    s = await own_student(db, teacher, student_id)
    await db.delete(s)
    await db.commit()
    return {"ok": True}


@router.get("/students/{student_id}/progress")
async def student_progress(student_id: int, db: DB, teacher: TeacherUser):
    s = await own_student(db, teacher, student_id)
    return json.loads(s.progress_json or "{}")
