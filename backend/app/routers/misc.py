"""Shares, progress sync, config/health and admin stats."""
from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from .. import ratelimit
from ..config import get_limits, get_settings
from ..deps import DB, AdminUser, StudentUser
from ..executors import get_executor
from ..models import Assignment, Classroom, Share, Student, Submission, Teacher
from ..runs import slots, stats
from ..security import new_slug
from ..util import client_ip

router = APIRouter(prefix="/api", tags=["misc"])


@router.get("/health")
async def health():
    return {"ok": True}


@router.get("/config")
async def public_config():
    s = get_settings()
    lim = get_limits()
    return {
        "share_enabled": s.share_enabled,
        "accounts_enabled": True,
        "executor": s.executor,
        "limits": {
            "cpu_seconds": lim.run.cpu_seconds,
            "memory_mb": lim.run.memory_mb,
            "max_output_kb": lim.run.max_output_kb,
            "min_seconds_between_runs": lim.rate_limit.min_seconds_between_runs,
        },
    }


# ------------------------------------------------------------------ shares
class ShareIn(BaseModel):
    language: Literal["python", "c", "cpp"]
    code: str = Field(max_length=64 * 1024)
    title: str | None = Field(default=None, max_length=80)


@router.post("/shares")
async def create_share(body: ShareIn, db: DB, request: Request):
    if not get_settings().share_enabled:
        raise HTTPException(404, "Sharing is turned off")
    if not await ratelimit.allow(f"share:{client_ip(request)}", get_limits().rate_limit.shares_per_hour_per_ip, 3600):
        raise HTTPException(429, {"code": "rate_limited", "message": "Too many shares"})
    for _ in range(10):
        slug = new_slug()
        if not (await db.execute(select(Share).where(Share.slug == slug))).scalar_one_or_none():
            break
    db.add(Share(slug=slug, language=body.language, code=body.code, title=(body.title or "").strip() or None))
    await db.commit()
    return {"slug": slug}


@router.get("/shares/{slug}")
async def get_share(slug: str, db: DB):
    sh = (await db.execute(select(Share).where(Share.slug == slug[:16]))).scalar_one_or_none()
    if not sh:
        raise HTTPException(404, "Not found")
    return {"language": sh.language, "code": sh.code, "title": sh.title, "created_at": sh.created_at.isoformat()}


# ------------------------------------------------------------------ progress
@router.get("/progress")
async def get_progress(student: StudentUser):
    return json.loads(student.progress_json or "{}")


class ProgressIn(BaseModel):
    stars: dict[str, int] = Field(default_factory=dict)
    badges: dict[str, str] = Field(default_factory=dict)
    counters: dict[str, int] = Field(default_factory=dict)


@router.put("/progress")
async def put_progress(body: ProgressIn, db: DB, student: StudentUser):
    if len(body.stars) > 500 or len(body.badges) > 100:
        raise HTTPException(400, "Too much data")
    old = json.loads(student.progress_json or "{}")
    stars = dict(old.get("stars", {}))
    for k, v in body.stars.items():
        stars[k[:60]] = max(int(stars.get(k, 0)), max(0, min(2, v)))
    badges = {**{k[:40]: v[:40] for k, v in body.badges.items()}, **old.get("badges", {})}
    counters = {k: max(int(old.get("counters", {}).get(k, 0)), max(0, v)) for k, v in body.counters.items() if k in ("runs", "fixes")}
    student.progress_json = json.dumps({"stars": stars, "badges": badges, "counters": counters})
    await db.commit()
    return {"ok": True}


# ------------------------------------------------------------------ admin
@router.get("/admin/stats")
async def admin_stats(db: DB, _admin: AdminUser):
    async def count(model) -> int:
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()

    s = slots()
    return {
        "today": {"day": stats.day.isoformat(), "runs_by_language": dict(stats.by_lang), "outcomes": dict(stats.outcomes)},
        "queue": {"running_now": s.active, "waiting_now": s.waiting, "max_concurrent": s.max},
        "totals": {
            "teachers": await count(Teacher),
            "classes": await count(Classroom),
            "students": await count(Student),
            "assignments": await count(Assignment),
            "submissions": await count(Submission),
            "shares": await count(Share),
        },
        "executor": await get_executor().health(),
        "limits": get_limits().model_dump(),
    }
