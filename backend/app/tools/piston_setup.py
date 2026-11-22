"""Install the compilers Piston needs (run once after first start):

    docker compose exec backend python -m app.tools.piston_setup

Needs internet access from the piston container for the download only.
"""
from __future__ import annotations

import sys

import httpx

from ..config import get_settings

PACKAGES = [("gcc", "10.2.0"), ("python", "3.12.0")]


def main() -> int:
    base = get_settings().piston_url.rstrip("/")
    with httpx.Client(timeout=600) as c:
        installed = {(r["language"], r["language_version"]) for r in c.get(f"{base}/api/v2/packages").json() if r.get("installed")}
        for lang, version in PACKAGES:
            if (lang, version) in installed:
                print(f"✓ {lang} {version} already installed")
                continue
            print(f"… installing {lang} {version} (this can take a few minutes)")
            r = c.post(f"{base}/api/v2/packages", json={"language": lang, "version": version})
            if r.status_code >= 400:
                print(f"✗ {lang} {version}: {r.text}")
                return 1
            print(f"✓ {lang} {version} installed")
        runtimes = c.get(f"{base}/api/v2/runtimes").json()
        print("Available:", ", ".join(sorted(f"{x['language']} {x['version']}" for x in runtimes)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
