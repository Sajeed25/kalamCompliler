# Third-party licences

Every dependency allows commercial use. Regenerate with `backend/.venv/bin/python scripts/licenses.py > LICENSES.md`.

## Frontend (shipped to the browser)

| Package | Version | Licence |
|---|---|---|
| @codemirror/autocomplete | 6.20.4 | MIT |
| @codemirror/commands | 6.11.1 | MIT |
| @codemirror/lang-cpp | 6.0.3 | MIT |
| @codemirror/lang-python | 6.2.1 | MIT |
| @codemirror/language | 6.13.1 | MIT |
| @codemirror/state | 6.7.6 | MIT |
| @codemirror/view | 6.43.15 | MIT |
| @fontsource/atkinson-hyperlegible | 5.3.0 | OFL-1.1 |
| @fontsource/jetbrains-mono | 5.3.0 | OFL-1.1 |
| @fontsource/marcellus | 5.3.0 | OFL-1.1 |
| @fontsource/noto-sans-devanagari | 5.3.0 | OFL-1.1 |
| @fontsource/noto-sans-telugu | 5.3.0 | OFL-1.1 |
| @fontsource/opendyslexic | 5.3.0 | OFL-1.1 |
| @lezer/highlight | 1.2.5 | MIT |
| @yowasp/clang | 22.0.0-git20695-13 | ISC |
| i18next | 27.2.4 | MIT |
| pyodide | 314.0.8 | MPL-2.0 |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| react-i18next | 18.0.3 | MIT |

## Frontend build & test tools (not shipped)

| Package | Version | Licence |
|---|---|---|
| @playwright/test | 1.65.1 | Apache-2.0 |
| @tailwindcss/vite | 4.3.5 | MIT |
| @types/node | 26.6.6 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @vitejs/plugin-react | 6.3.0 | MIT |
| tailwindcss | 4.3.5 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vite | 8.3.8 | MIT |
| vitest | 5.1.1 | MIT |

## Backend (Python)

| Package | Version | Licence |
|---|---|---|
| fastapi | 0.118.0 | MIT License |
| uvicorn | 0.37.0 | BSD-3-Clause |
| pydantic-settings | 2.11.0 | MIT |
| sqlalchemy | 2.0.43 | MIT |
| asyncpg | 0.30.0 | Apache Software License |
| aiosqlite | 0.21.0 | MIT License |
| redis | 6.4.0 | MIT |
| pyjwt | 2.10.1 | MIT License |
| argon2-cffi | 25.1.0 | MIT |
| pyyaml | 6.0.3 | MIT License |
| websockets | 15.0.1 | BSD License |
| httpx | 0.28.1 | BSD License |

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

* **@yowasp/clang (ISC)** packages LLVM/Clang/LLD, which are under **Apache-2.0 WITH LLVM-exception**,
  and wasi-libc / libc++ (Apache-2.0 WITH LLVM-exception, MIT, CC0 parts). All allow commercial use.
  Programs compiled with it are not covered by these licences (the LLVM exception).
* **Pyodide (MPL-2.0)** is file-level copyleft: commercial use is fine. If you modify Pyodide's
  own files you must publish those modified files. We ship it unmodified.
* The **turtle** module in `frontend/src/runners/python/turtle.py` is our own implementation
  of the standard turtle API (no code copied from CPython's turtle).
* The **Kalam mascot** is an original drawing made for this project.

