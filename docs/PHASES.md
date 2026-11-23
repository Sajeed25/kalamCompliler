# What was built: phases, steps and how to test each

Built in one unattended session. Phases 1–3 are done; everything listed here is
covered by automated tests unless marked otherwise.

## Phase 1: MVP

### (a) Editor + Python in the browser
* Home screen with three big cards (Python 🐍, C 🔧, C++ 🚀) and one-line kid-friendly descriptions.
* CodeMirror 6 editor: 18 px default font (12–32 px adjustable), line numbers, syntax colours,
  auto-indent, bracket auto-close and matching, error-line highlight.
* Big buttons with icon + text: ▶ Run / ⏹ Stop, 🧹 Clear, 📚 Examples, 💾 Save, 📂 Open, ↺ Reset example, 🔗 Share.
  Ctrl+Enter runs; works anywhere on the page.
* Output "screen" (friendly, not a terminal) with **input box inline where the program waits**.
* Pyodide in a Web Worker (self-hosted, no CDN): `input()`, `time.sleep()`, Stop/interrupt,
  automatic restart if stuck, and our own **turtle** module drawing on an animated canvas.
* Autosave to localStorage, download as `.py/.c/.cpp`, open a file from the computer
  (opening a `.c` file from the Python screen switches to C).

**Try it:** `./scripts/dev.sh` → http://localhost:5173 → Python → ▶ Run.

### (b) Runner + backend for C/C++
* FastAPI backend, WebSocket `/api/run/ws` streaming output and accepting input live.
* Executors: **Piston** (production) and **local sandbox** (`nobody` user, private empty network
  namespace, CPU 5 s, memory 128 MB, 16 processes, 1 MB files, 64 KB output, clean env).
* Rate limits (1 run / 2 s per student + per-IP cap), job slots and queue, compile cache.
* Message for time limit exactly as specified: *"Your program ran for too long — maybe a loop never stops? 🔁"*

**Test:** `cd backend && .venv/bin/python -m pytest -q` → 37 passed.

### (c) Kid-friendly error explainer
* 105 rules: 54 Python, 43 C/C++ (compile errors, crashes such as segfault / divide by zero,
  C++ exceptions), plus warning tips (e.g. missing `&` in `scanf`) and shared rules
  (8 shared: time limit, too much output, memory, busy, offline…) and 6 warning tips.
* Two views: **What went wrong (simple)** + collapsible **Full error (for experts)**;
  "👉 Show me line N" jumps to and highlights the line.
* "Did you mean …?" suggestions from the student's own variable names and common words
  (`pritn` → `print`, `cnt` → `count`, `<stdio>` → `<stdio.h>`).

**Test:** `cd frontend && npx vitest run` → 88 passed (includes translation completeness checks).

### (d) Examples
* **Python 20, C 18, C++ 18** examples across Level 1 (Grades 3–5), Level 2 (6–8), Level 3 (9+):
  Hello World, name & age, maths, calculator, even/odd, multiplication table, guess the number,
  star patterns, temperature converter, countdown, FizzBuzz, primes, Fibonacci, marks & grades,
  rock-paper-scissors, robot on a grid, robot class, and turtle square / star / flower / rainbow spiral.
  Titles in English, Telugu and Hindi.

### (e) i18n
* i18next with English, Telugu and Hindi for **all** UI labels and error explanations.
  English is bundled; the others download only when chosen.
  ⚠️ Telugu/Hindi need native-speaker review (see DECISIONS.md).

### (f) Deployment
* `docker-compose.yml` (nginx + backend + Piston + PostgreSQL + Valkey), `docker-compose.local.yml`
  (no Piston), Dockerfiles, nginx with COOP/COEP, CSP, gzip for WebAssembly and caching,
  `.env.example`, admin `limits.yaml`, `piston_setup` tool.
* Responsive: side-by-side on 1366×768, Code/Output tabs on tablets and phones.

## Phase 2

* **Student login**: class code → tap name → 4-digit PIN keypad. Lockout after 8 wrong tries.
* **Teacher dashboard**: classes, add students + printable PIN cards, reset PIN, remove student.
* **Assignments with auto-check**: test inputs + expected output, secret tests, exact/contains
  matching, "Try tests on starter code", ✅/❌ per test with friendly messages, submissions table
  with tries and code viewer, auto-refresh, CSV export, teacher "preview as student".
* **Share links**: read-only view + **Make a copy**.
* **Stars and badges** (20 badges, 2 stars per example, level badges). Private, no leaderboards,
  synced to the server for logged-in students.
* **Explain my code**: pluggable (Claude or self-hosted model), **off by default**.
* **Offline PWA**: service worker + web manifest; Python works offline after first use.

**Test:** `cd frontend && npm run e2e`. 14 browser tests, including the full teacher → student
assignment flow and share/copy. Hello World runs in all 3 languages on desktop and on a tablet profile.

## Phase 3: "instant and comfortable" (my addition)

* Python downloads in the background while the student is still on the home screen (skipped on
  2G / data-saver), and the editor code is prefetched, so the first ▶ Run feels immediate.
* Pages are split into chunks; startup JavaScript is ~104 KB gzipped. Other UI languages load on demand.
* Compile cache: identical programs (a whole class running the same example) compile once.
* Long-running hint after 8 s with a Stop button; output cap protects slow PCs.
* "Draw turtle instantly" setting for slow computers; reduced-motion respected.
* Accessibility: keyboard navigation (Escape then Tab leaves the editor), visible focus rings,
  screen-reader labels and live regions, 44 px minimum touch targets, dyslexia font, high contrast,
  light/dark themes.
* Admin stats page (runs today by language/outcome, queue, totals, executor health, limits).
* Privacy hardening: no access logs with IPs, strict CSP, no third-party requests at all.

## After deployment on Hostinger (Node.js Web apps)

* Fixed: blank screen on the Python page when the host doesn't send COOP/COEP headers.
* **C and C++ now also run in the browser** when there is no backend (Clang → WebAssembly,
  ~27 MB once per device, cached and offline-capable), with typed input, Stop, a 5 s limit,
  crash detection and clang-aware error explanations (19 new tests).
* `npm run build` / `npm start` at the repository root + `frontend/server.mjs` for Node.js hosting.
* `kalam-config.json` (backend address, C/C++ mode) editable without rebuilding.
* Error boundary, stale-file auto-reload, login hidden when there is no backend.

## Verified in this session

| Check | Result |
|---|---|
| Backend tests (sandbox + API) | 37 / 37 passed |
| Explainer unit tests | 88 / 88 passed |
| End-to-end (Vite preview + backend, local executor) | 14 / 14 passed |
| Production-style stack (nginx + PostgreSQL + Valkey in Docker), browser tests through nginx | 6 / 6 passed; 0 CSP violations |
| TypeScript strict build | clean |

**Not verified here** (blocked by this build machine's network policy, not by the code):
* The **Piston** container itself (ghcr.io was unreachable). The adapter follows Piston's
  documented WebSocket protocol, but please run the C/C++ E2E tests once against Piston:
  `KALAM_URL=… npx playwright test -c playwright.deployed.config.ts`.
* Building the Docker images from scratch (package mirrors blocked inside build containers).
  The runtime configuration (nginx config, backend on PostgreSQL/Valkey) was tested in containers.
