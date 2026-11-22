from __future__ import annotations

from starlette.requests import HTTPConnection

from .config import get_settings


def client_ip(conn: HTTPConnection) -> str:
    if get_settings().trust_proxy_headers:
        fwd = conn.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
        real = conn.headers.get("x-real-ip")
        if real:
            return real.strip()
    return conn.client.host if conn.client else "unknown"
