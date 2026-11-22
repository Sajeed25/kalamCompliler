#!/usr/bin/env bash
# Start backend (http://localhost:8000) and frontend (http://localhost:5173) for development.
# Uses SQLite and the local sandbox for C/C++ (needs gcc and g++ installed).
set -euo pipefail
cd "$(dirname "$0")/.."
export KALAM_ENV=development KALAM_EXECUTOR=local
export KALAM_TEACHER_INVITE_CODE="${KALAM_TEACHER_INVITE_CODE:-DEV-INVITE}"
backend/.venv/bin/uvicorn app.main:app --app-dir backend --port 8000 --reload --reload-dir backend/app &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd frontend && npm run dev
