# Kalam Compiler

A friendly online code editor for **Python, C and C++**, built for students from Grade 3 upward.
Made in-house by **Robokalam** (Hanamkonda, Telangana) for school coding labs and home use.

* Pick a language, press **▶ Run**. No sign-up.
* **Python runs inside the browser** (Pyodide/WebAssembly): instant, works offline after the first visit, supports `input()` and `turtle`.
* **C and C++ run on the server** in a sandbox (Piston), **or entirely in the browser** (Clang → WebAssembly) when there is no backend, e.g. on Node.js/static web hosting. Input is typed right inside the output screen either way.
* **Errors explained like a teacher would**: *"Oops! The computer doesn't know the word 'pritn'. Did you mean 'print'? 🔍"*, with the line highlighted. The full compiler error is one click away.
* **Robokalam look**: brand colours (navy, sky blue, light green, orange), the Robokalam logo and wordmark-style headings, light and dark themes.
* **Activities**: ready-made projects (turtle art, games, patterns, robots, calculators), each with a small challenge.
* **English, Telugu and Hindi** interface. 56 graded examples across 3 levels. Stars and badges, no leaderboards.
* **Classrooms** (optional): class code + name + 4-digit PIN for students, auto-checked assignments, a teacher dashboard, CSV export.
* No ads, no trackers, no third-party requests. Everything is self-hosted.

## Run it on your computer (4 commands)

Needs Python 3.11+, Node 20+, and `gcc`/`g++` (for C/C++).

```bash
git clone <this repo> kalam-compiler && cd kalam-compiler
```

```bash
./scripts/setup.sh
```

```bash
./scripts/dev.sh
```

Open http://localhost:5173. Teacher sign-up code in development: `DEV-INVITE`.

Run every test (backend, explainer, end-to-end in a real browser):

```bash
./scripts/test.sh
```

## Deploy on a server (Docker)

```bash
cp .env.example .env      # then edit the CHANGE-ME values
```

```bash
docker compose up -d --build
```

```bash
docker compose exec backend python -m app.tools.piston_setup   # once: installs gcc + python into Piston
```

**Hostinger Web apps (Node.js) or any static host?** Build command `npm run build`, start command `npm start`.
Python and C/C++ then run in the browser. See [docs/HOSTINGER.md](docs/HOSTINGER.md). Classes/assignments need the Docker backend below.

The site is on port 80. Put HTTPS in front of it (Caddy, Traefik or nginx with Let's Encrypt).
Full guide, sizing and scaling: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
No access to `ghcr.io`? Use the single-container sandbox: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`.

## Tuning limits without code changes

Edit [`backend/config/limits.yaml`](backend/config/limits.yaml) (CPU time, memory, output size,
runs per student, queue size…) and run `docker compose restart backend`.

## How to…

| Task | Where |
|---|---|
| Add a new example | [docs/EXTENDING.md#add-an-example](docs/EXTENDING.md#add-an-example) |
| Add a new UI language (e.g. Kannada) | [docs/EXTENDING.md#add-a-ui-language](docs/EXTENDING.md#add-a-ui-language) |
| Add a new programming language (e.g. Java) | [docs/EXTENDING.md#add-a-programming-language](docs/EXTENDING.md#add-a-programming-language) |
| Add a kid-friendly error rule | [docs/EXTENDING.md#add-an-error-explanation](docs/EXTENDING.md#add-an-error-explanation) |
| Add a home-page activity | [docs/EXTENDING.md#add-an-activity](docs/EXTENDING.md#add-an-activity) |
| Understand the design | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DECISIONS.md](docs/DECISIONS.md) |
| Security model | [docs/SECURITY.md](docs/SECURITY.md) |
| Teachers: using classes and assignments | [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md) |
| What was built in each phase, test results | [docs/PHASES.md](docs/PHASES.md) |

## Project layout

```
frontend/   React + TypeScript + Vite + Tailwind, CodeMirror 6, Pyodide worker, i18n, PWA
backend/    FastAPI: run WebSocket, auth, classes, assignments + grader, shares
runner/     Piston notes and setup
docs/       Architecture, decisions, deployment, security, extending, teacher guide
scripts/    setup / dev / test / licence report
```

Licences of every dependency: [LICENSES.md](LICENSES.md).
