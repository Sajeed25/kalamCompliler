"""Passwords, PINs and login tokens."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from .config import get_settings

_hasher = PasswordHasher()
# Class codes avoid look-alike characters (0/O, 1/I/L) so kids can type them.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"


def hash_secret(value: str) -> str:
    return _hasher.hash(value)


def verify_secret(hashed: str, value: str) -> bool:
    try:
        return _hasher.verify(hashed, value)
    except (VerifyMismatchError, InvalidHashError):
        return False


def new_pin() -> str:
    return f"{secrets.randbelow(10_000):04d}"


def new_class_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


def new_slug(length: int = 10) -> str:
    return "".join(secrets.choice(_SLUG_ALPHABET) for _ in range(length))


def make_token(role: str, user_id: int) -> str:
    s = get_settings()
    hours = s.token_hours_student if role == "student" else s.token_hours_teacher
    payload = {
        "sub": f"{role}:{user_id}",
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, s.secret_key, algorithm="HS256")


def read_token(token: str) -> tuple[str, int] | None:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        role, _, uid = str(payload.get("sub", "")).partition(":")
        if role in ("student", "teacher") and uid.isdigit():
            return role, int(uid)
    except jwt.PyJWTError:
        pass
    return None
