#!/usr/bin/env bash
# All tests: backend (pytest), explainer unit tests (vitest), end-to-end (Playwright).
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && .venv/bin/python -m pytest -q)
(cd frontend && npx tsc -b && npx vitest run)
(cd frontend && npm run e2e)
