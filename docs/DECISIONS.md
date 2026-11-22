# Decisions

You asked me to list decisions needing your input, then you told me to go ahead
without waiting. These are the choices I made. Each one is easy to change. **Items marked ❓
need someone at Robokalam to confirm.**

## Changes from the requested stack

| Spec said | I did | Why |
|---|---|---|
| Monaco on desktop + CodeMirror 6 on mobile | **CodeMirror 6 everywhere** | Monaco is 3–5 MB and doesn't officially support phones or tablets. CodeMirror is about 10× smaller, works with touch, and loads quickly on slow school internet and old PCs. With one editor we only need one copy of the error-line highlighting, theme, font and accessibility code. Autocomplete, multi-cursor and similar Monaco features don't matter much for Grade 3–12 students. To bring Monaco back later, swap `CodeEditor.tsx`: it is the only file that knows which editor is used. |
| Redis | **Valkey 8** (a drop-in Redis fork) | Redis ≥ 7.4 moved to RSAL/SSPL, and later AGPL, licences. Valkey is BSD and uses the same protocol and client library. |
| "Piston in Docker" only | **Piston (default) + a local sandbox executor** | Piston stays the production default. The local executor (gcc inside the backend container, each program dropped to `nobody`, no network, rlimits) is useful for development, CI, small single-school servers, and networks that block `ghcr.io`. It is also how I tested C/C++ end-to-end, because this build machine couldn't download Piston. Switch with `KALAM_EXECUTOR`. |
| Python run in the browser | Same, plus **graded Python runs on the server** | Assignment checks must be trustworthy. If Python were graded in the browser, a student could fake the result. |

## Product decisions

| Decision | Choice | Alternatives |
|---|---|---|
| Layout on 1366×768 | Editor **left**, output **right**; on screens < 1024 px they stack, with **Code / Output** tabs | Output always below. The spec said "below the editor" and also "stack vertically on small screens". Side-by-side gives more room on wide school screens. |
| 💾 Save | Asks for a file name, then downloads `name.py/.c/.cpp`. Code also **autosaves** in the browser all the time. | Save-to-account (needs login) |
| 🧹 Clear | Clears the **output** screen (not the code) | |
| Input for C/C++ | Real interactive stdin over a WebSocket. With the local executor the server detects when the program is waiting (via `/proc/<pid>/syscall`) and shows the box at that moment. With Piston, which can't detect this, the box stays open while the program runs. | Asking for all input before running (worse for kids) |
| Time limit | **CPU** time 5 s, plus 15 s of "active" wall time. **Time spent waiting for the student to type doesn't count** (up to 5 min). | Plain 5 s wall clock would kill programs while a child types their name |
| Rate limit "1 run / 2 s per user" | Per **browser** (anonymous random id) or per logged-in student, plus a generous per-IP cap (240/min) | Per IP alone would block a whole school lab behind one router |
| Student login | Class code → **tap your name** → 4-digit PIN on a big keypad. 8 wrong PINs → 10-minute lock. PINs are hashed (Argon2) and shown to the teacher only once, on printable cards; "New PIN" anytime. | Typing names (spelling problems for young kids) |
| Teacher accounts | Sign-up with a **school invite code** (`KALAM_TEACHER_INVITE_CODE`), or the admin creates them. The first admin comes from `.env`. | Open sign-up |
| Stars | ⭐ for running an example, ⭐⭐ for changing it and running it again. Level badges when every example in a level has ≥ 1 star. Stored locally, synced when a student logs in. **No leaderboards.** | |
| Sharing | Anyone can create a read-only link (rate limited, 64 KB max). The share dialog warns kids not to put personal details in code. | Logged-in only — could be switched with `KALAM_SHARE_ENABLED=false` |
| AI "Explain my code" | **Off by default.** Providers: Claude (Anthropic SDK; default model `claude-opus-5-5`, low effort, server-side refusal fallback on) or any self-hosted OpenAI-style server such as Ollama (no data leaves the school). Only the code is sent. | |
| Offline | Service worker caches the app and Pyodide after first use → Python works offline; C/C++ need the server | |
| Fonts | All self-hosted (no Google Fonts requests). Default Atkinson Hyperlegible (designed for readability); OpenDyslexic option; Noto Sans Telugu/Devanagari | |
| Mascot | "Kalam", an original friendly robot drawn in SVG (no copyrighted characters) | ❓ Replace with Robokalam's own artwork when available |

## Needs confirmation ❓

1. **Telugu and Hindi texts** were written by me (an AI). They're careful and consistent, but
   **a native-speaking teacher must review them** before students see them, especially the
   error explanations (`frontend/src/i18n/locales/te.json`, `hi.json`). The unit tests already
   check that every message exists and keeps the same `{{placeholders}}`.
2. **Domain + HTTPS**: which domain (e.g. `code.robokalam.com`)? HTTPS is needed for the
   service worker and recommended for passwords.
3. **Server size**: I suggest 4 vCPU / 8 GB RAM for ~200 simultaneous students
   (Python costs the server nothing; C/C++ compiles take ~0.3–1 s CPU each). See DEPLOYMENT.md.
4. **AI helper**: keep off, use Claude, or run a local model? And do schools' privacy
   policies allow sending code to an external provider?
5. **Data retention**: how long to keep submissions and shared programs? (Nothing is deleted
   automatically today.)
6. **Mascot artwork and brand colours** (I used a blue/green palette).
7. **Repository**: this work is in the session's container and in a zip file; tell me where to
   push (GitHub org/repo name).
