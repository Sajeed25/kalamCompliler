from __future__ import annotations

import secrets

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

# Lenient on purpose: school intranets use domains like .local that strict validators reject.
EMAIL = r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$"
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from .. import ratelimit
from ..config import get_limits, get_settings
from ..deps import DB, MaybeUser
from ..models import Classroom, Student, Teacher
from ..security import hash_secret, make_token, verify_secret
from ..util import client_ip

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TeacherOut(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool


def teacher_out(t: Teacher) -> dict:
    return {"id": t.id, "name": t.name, "email": t.email, "is_admin": t.is_admin}


class TeacherRegister(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: str = Field(pattern=EMAIL, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    invite_code: str = ""


class TeacherLogin(BaseModel):
    email: str = Field(pattern=EMAIL, max_length=200)
    password: str = Field(max_length=200)


@router.post("/teacher/register")
async def register_teacher(body: TeacherRegister, db: DB, request: Request):
    invite = get_settings().teacher_invite_code
    if not invite:
        raise HTTPException(403, "Teacher sign-up is turned off. Ask your Kalam admin for an account.")
    if not secrets.compare_digest(body.invite_code.strip(), invite):
        raise HTTPException(403, "That school invite code is not right.")
    if not await ratelimit.allow(f"register:{client_ip(request)}", 10, 3600):
        raise HTTPException(429, "Too many tries")
    email = body.email.lower()
    if (await db.execute(select(Teacher).where(Teacher.email == email))).scalar_one_or_none():
        raise HTTPException(409, "An account with this email already exists.")
    t = Teacher(name=body.name.strip(), email=email, password_hash=hash_secret(body.password))
    db.add(t)
    await db.commit()
    return {"token": make_token("teacher", t.id), "teacher": teacher_out(t)}


@router.post("/teacher/login")
async def login_teacher(body: TeacherLogin, db: DB):
    email = body.email.lower()
    key = f"login:t:{email}"
    if not await ratelimit.allow(key, get_limits().rate_limit.login_attempts_per_10_min, 600):
        raise HTTPException(429, "Too many tries")
    t = (await db.execute(select(Teacher).where(Teacher.email == email))).scalar_one_or_none()
    if not t or not verify_secret(t.password_hash, body.password):
        raise HTTPException(401, "Wrong email or password")
    await ratelimit.clear(key)
    return {"token": make_token("teacher", t.id), "teacher": teacher_out(t)}


@router.get("/class/{code}")
async def class_roster(code: str, db: DB, request: Request):
    """First names in a class, so young students can tap their name instead of typing it."""
    if not await ratelimit.allow(f"roster:{client_ip(request)}", 120, 600):
        raise HTTPException(429, "Too many tries")
    c = (
        await db.execute(select(Classroom).where(Classroom.code == code.strip().upper()).options(selectinload(Classroom.students)))
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Class not found")
    return {
        "name": c.name,
        "code": c.code,
        "students": [{"id": s.id, "name": s.name} for s in sorted(c.students, key=lambda s: s.name.lower())],
    }


class StudentLogin(BaseModel):
    class_code: str = Field(max_length=12)
    student_id: int
    pin: str = Field(pattern=r"^\d{4}$")


@router.post("/student/login")
async def login_student(body: StudentLogin, db: DB):
    key = f"login:s:{body.student_id}"
    if not await ratelimit.allow(key, get_limits().rate_limit.login_attempts_per_10_min, 600):
        raise HTTPException(429, "Too many tries")
    s = await db.get(Student, body.student_id)
    c = await db.get(Classroom, s.class_id) if s else None
    if not s or not c or c.code != body.class_code.strip().upper() or not verify_secret(s.pin_hash, body.pin):
        raise HTTPException(401, "Wrong PIN")
    await ratelimit.clear(key)
    return {
        "token": make_token("student", s.id),
        "student": {"id": s.id, "name": s.name, "class_code": c.code, "class_name": c.name},
    }


@router.get("/me")
async def me(user: MaybeUser, db: DB):
    if user is None:
        return {"role": None}
    if isinstance(user, Teacher):
        return {"role": "teacher", **teacher_out(user)}
    c = await db.get(Classroom, user.class_id)
    return {"role": "student", "id": user.id, "name": user.name, "class_code": c.code if c else "", "class_name": c.name if c else ""}


async def ensure_admin(db) -> None:
    """Create the first admin from KALAM_ADMIN_EMAIL / KALAM_ADMIN_PASSWORD (only if no admin exists)."""
    s = get_settings()
    if not s.admin_email or not s.admin_password:
        return
    count = (await db.execute(select(func.count()).select_from(Teacher).where(Teacher.is_admin.is_(True)))).scalar_one()
    if count:
        return
    email = s.admin_email.lower()
    existing = (await db.execute(select(Teacher).where(Teacher.email == email))).scalar_one_or_none()
    if existing:
        existing.is_admin = True
    else:
        db.add(Teacher(name="Admin", email=email, password_hash=hash_secret(s.admin_password), is_admin=True))
    await db.commit()
