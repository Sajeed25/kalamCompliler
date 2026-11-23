"""Settings from environment variables (.env) and admin limits from config/limits.yaml."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="KALAM_", extra="ignore")

    env: Literal["development", "production", "test"] = "development"
    secret_key: str = "dev-only-change-me"
    database_url: str = "sqlite+aiosqlite:///./kalam.db"
    redis_url: str | None = None
    cors_origins: str = ""  # comma separated; empty = same origin only

    executor: Literal["piston", "local"] = "local"
    piston_url: str = "http://piston:2000"
    # gcc/g++ versions Piston should use ("*" = newest installed)
    piston_c_version: str = "*"
    piston_cpp_version: str = "*"

    limits_file: str = str(BASE_DIR / "config" / "limits.yaml")

    # Accounts (Phase 2)
    teacher_invite_code: str = ""  # empty = teacher sign-up disabled (admin creates teachers)
    admin_email: str = ""
    admin_password: str = ""
    token_hours_student: int = 12
    token_hours_teacher: int = 24 * 7


    share_enabled: bool = True
    trust_proxy_headers: bool = True  # use X-Forwarded-For from nginx for per-IP limits


class RunLimits(BaseModel):
    cpu_seconds: float = 5
    wall_seconds: float = 15
    idle_input_seconds: float = 300
    memory_mb: int = 128
    max_output_kb: int = 64
    max_code_kb: int = 64
    max_processes: int = 16
    max_file_kb: int = 1024
    compile_seconds: float = 15


class CompileFlags(BaseModel):
    c_flags: list[str] = ["-std=gnu17", "-O1", "-Wall"]
    cpp_flags: list[str] = ["-std=gnu++17", "-O1", "-Wall"]


class RateLimits(BaseModel):
    min_seconds_between_runs: float = 2
    runs_per_minute_per_ip: int = 240
    shares_per_hour_per_ip: int = 60
    login_attempts_per_10_min: int = 8


class QueueLimits(BaseModel):
    max_concurrent_runs: int = 8
    max_waiting: int = 100
    wait_timeout_seconds: float = 20


class AssignmentLimits(BaseModel):
    max_tests: int = 20
    test_cpu_seconds: float = 3


class CompileCache(BaseModel):
    enabled: bool = True
    max_entries: int = 300


class Limits(BaseModel):
    run: RunLimits = RunLimits()
    compile: CompileFlags = CompileFlags()
    rate_limit: RateLimits = RateLimits()
    queue: QueueLimits = QueueLimits()
    assignments: AssignmentLimits = AssignmentLimits()
    compile_cache: CompileCache = CompileCache()


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.env == "production" and s.secret_key in ("", "dev-only-change-me"):
        raise RuntimeError("Set KALAM_SECRET_KEY to a long random value in production.")
    return s


@lru_cache
def get_limits() -> Limits:
    path = Path(os.environ.get("KALAM_LIMITS_FILE", get_settings().limits_file))
    if not path.exists():
        return Limits()
    with path.open() as f:
        return Limits.model_validate(yaml.safe_load(f) or {})
