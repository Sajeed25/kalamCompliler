from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db
from .models import Student, Teacher
from .security import read_token

DB = Annotated[AsyncSession, Depends(get_db)]


async def current_user(db: DB, authorization: Annotated[str | None, Header()] = None) -> Teacher | Student | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    parsed = read_token(authorization[7:].strip())
    if not parsed:
        raise HTTPException(401, "Session expired, please log in again")
    role, uid = parsed
    user = await db.get(Teacher if role == "teacher" else Student, uid)
    if user is None:
        raise HTTPException(401, "Account not found")
    return user


MaybeUser = Annotated[Teacher | Student | None, Depends(current_user)]


async def require_teacher(user: MaybeUser) -> Teacher:
    if not isinstance(user, Teacher):
        raise HTTPException(403, "Teachers only")
    return user


async def require_student(user: MaybeUser) -> Student:
    if not isinstance(user, Student):
        raise HTTPException(403, "Students only")
    return user


async def require_admin(user: MaybeUser) -> Teacher:
    if not isinstance(user, Teacher) or not user.is_admin:
        raise HTTPException(403, "Admins only")
    return user


TeacherUser = Annotated[Teacher, Depends(require_teacher)]
StudentUser = Annotated[Student, Depends(require_student)]
AdminUser = Annotated[Teacher, Depends(require_admin)]
