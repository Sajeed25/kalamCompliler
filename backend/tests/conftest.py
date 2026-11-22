import os
import tempfile

import pytest

# Configure before the app is imported.
_tmp = tempfile.mkdtemp(prefix="kalam-test-")
os.chmod(_tmp, 0o755)
os.environ.update(
    {
        "KALAM_ENV": "test",
        "KALAM_SECRET_KEY": "test-secret",
        "KALAM_DATABASE_URL": f"sqlite+aiosqlite:///{_tmp}/test.db",
        "KALAM_EXECUTOR": "local",
        "KALAM_TEACHER_INVITE_CODE": "SCHOOL-123",
        "KALAM_ADMIN_EMAIL": "admin@example.org",
        "KALAM_ADMIN_PASSWORD": "admin-password-1",
        "KALAM_WORK_DIR": _tmp,
        "KALAM_REDIS_URL": "",
    }
)
os.environ.pop("KALAM_REDIS_URL")


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app import db, ratelimit
    from app.config import get_settings
    from app.main import create_app

    # Fresh database for every test.
    fd, path = tempfile.mkstemp(suffix=".db", dir=_tmp)
    os.close(fd)
    os.environ["KALAM_DATABASE_URL"] = f"sqlite+aiosqlite:///{path}"
    get_settings.cache_clear()
    db._engine = None
    db._sessionmaker = None
    ratelimit.reset_store()
    with TestClient(create_app()) as c:
        yield c
