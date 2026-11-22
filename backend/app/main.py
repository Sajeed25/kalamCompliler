"""Kalam Compiler API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db, sessionmaker
from .routers import ai, assignments, auth, classes, misc
from .runs import router as runs_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    async with sessionmaker()() as db:
        await auth.ensure_admin(db)
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
    for r in (auth.router, classes.router, assignments.router, misc.router, ai.router, runs_router):
        app.include_router(r)
    return app


app = create_app()
