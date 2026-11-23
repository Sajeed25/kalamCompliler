"""Kalam Compiler API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db, sessionmaker
from .routers import assignments, auth, classes, misc
from .runs import router as runs_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    async with sessionmaker()() as db:
        await auth.ensure_admin(db)
    # Report runner problems at startup (in `docker compose logs backend`), not at the first C run.
    try:
        from .executors import get_executor

        health = await get_executor().health()
        logging.getLogger("kalam").info("Code runner: %s", health)
        if health.get("reachable") is False:
            logging.getLogger("kalam").error("Piston is not reachable at %s — C/C++ runs will fail.", get_settings().piston_url)
    except Exception:  # noqa: BLE001
        logging.getLogger("kalam").exception("Code runner is misconfigured — C/C++ runs will fail")
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="Kalam Compiler API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if s.env != "production" else None,
        openapi_url="/api/openapi.json" if s.env != "production" else None,
    )
    if s.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[o.strip() for o in s.cors_origins.split(",") if o.strip()],
            allow_methods=["*"],
            allow_headers=["*"],
        )
    for r in (auth.router, classes.router, assignments.router, misc.router, runs_router):
        app.include_router(r)
    return app


app = create_app()
