#!/usr/bin/env bash
# One-time local setup: backend venv + frontend packages (also copies Python/Pyodide into frontend/public).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv backend/.venv
backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
(cd frontend && npm install --no-audit --no-fund)
[ -f .env ] || { cp .env.example .env; echo "Created .env (edit it before deploying)."; }
echo "✅ Setup done. Now run: ./scripts/dev.sh"
