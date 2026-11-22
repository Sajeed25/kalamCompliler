#!/usr/bin/env python3
"""Regenerate LICENSES.md from installed package metadata:
    backend/.venv/bin/python scripts/licenses.py > LICENSES.md
"""
import json
import re
from importlib import metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def py_license(dist) -> str:
    m = dist.metadata
    expr = m.get("License-Expression")
    if expr:
        return expr
    classifiers = [c.split(" :: ")[-1] for c in m.get_all("Classifier") or [] if c.startswith("License ::")]
    if classifiers:
        return ", ".join(classifiers)
    lic = (m.get("License") or "").strip().splitlines()
    return lic[0][:60] if lic else "see package"


def npm_license(name: str) -> tuple[str, str]:
    pkg = json.loads((ROOT / "frontend" / "node_modules" / name / "package.json").read_text())
    lic = pkg.get("license") or (pkg.get("licenses") or [{}])[0].get("type", "?")
    return pkg["version"], lic


req = [re.split(r"[=<>\[]", ln)[0].strip() for ln in (ROOT / "backend/requirements.txt").read_text().splitlines() if ln.strip() and not ln.startswith("#")]
pkg = json.loads((ROOT / "frontend/package.json").read_text())

print("# Third-party licences\n")
print("Every dependency allows commercial use. Regenerate with `backend/.venv/bin/python scripts/licenses.py > LICENSES.md`.\n")
print("## Frontend (shipped to the browser)\n\n| Package | Version | Licence |\n|---|---|---|")
for name in sorted(pkg["dependencies"]):
    v, lic = npm_license(name)
    print(f"| {name} | {v} | {lic} |")
print("\n## Frontend build & test tools (not shipped)\n\n| Package | Version | Licence |\n|---|---|---|")
for name in sorted(pkg["devDependencies"]):
    v, lic = npm_license(name)
    print(f"| {name} | {v} | {lic} |")
print("\n## Backend (Python)\n\n| Package | Version | Licence |\n|---|---|---|")
for name in req:
    d = metadata.distribution(name)
    print(f"| {name} | {d.version} | {py_license(d)} |")
print("""
## Services and tools (Docker images, not linked into our code)

| Component | Licence | Notes |
|---|---|---|
| Piston (code runner) | MIT | github.com/engineer-man/piston |
| GCC / G++ | GPL-3.0 with GCC Runtime Library Exception | Used as a tool; compiled student programs are not affected |
| PostgreSQL | PostgreSQL Licence (BSD-like) | |
| Valkey (Redis-compatible) | BSD-3-Clause | Chosen instead of Redis ≥ 7.4, whose licences (RSAL/SSPL/AGPL) are less suitable |
| nginx | BSD-2-Clause | |
| Python (CPython) | PSF Licence | |
| Node.js | MIT | build only |

## Fonts (self-hosted, no Google Fonts requests)

Atkinson Hyperlegible, JetBrains Mono, Noto Sans Telugu, Noto Sans Devanagari and
OpenDyslexic are all under the SIL Open Font Licence 1.1 (see the `@fontsource/*` rows above).

## Notes

* **Pyodide (MPL-2.0)** is file-level copyleft: commercial use is fine. If you modify Pyodide's
  own files you must publish those modified files. We ship it unmodified.
* The **turtle** module in `frontend/src/runners/python/turtle.py` is our own implementation
  of the standard turtle API (no code copied from CPython's turtle).
* The **Kalam mascot** is an original drawing made for this project.
""")
