# Security & child safety

## Student code can't harm the server

| Threat | Protection | Tested |
|---|---|---|
| Infinite loop | CPU limit 5 s (`RLIMIT_CPU` / Piston `run_cpu_time`) + 15 s active wall time | ✅ `test_infinite_loop_hits_cpu_limit`, E2E |
| Huge output | Stopped after 64 KB | ✅ `test_output_limit` |
| Memory bomb | 128 MB address-space limit | ✅ `test_memory_limit` |
| Fork bomb | Max 16 processes (as `nobody`) | ✅ `test_fork_bomb_is_contained` |
| Network access (attacks, downloads) | Programs get an empty network namespace (local) / `PISTON_DISABLE_NETWORKING` | ✅ `test_no_network` |
| Reading server secrets | Programs and the **compiler** run as `nobody` with a clean environment; secrets live only in the backend's environment (unreadable to `nobody`) | ✅ `test_cannot_read_secrets_via_include` (`#include "/etc/shadow"` fails) |
| Filling the disk | 1 MB max file size; job folders deleted after each run; tmpfs in Docker | ✅ |
| Flooding the server | 1 run / 2 s per student, per-IP cap, max 8 concurrent runs + short queue; "busy" message beyond that | ✅ `test_ws_rate_limit` |
| Huge programs | 64 KB code limit | ✅ |
| Container escape | Piston: separate container, isolate sandbox, internal network only. Backend container: read-only root FS, all capabilities dropped, no-new-privileges | review |

**Piston vs local sandbox.** Piston adds a separate container with its own filesystem view
(isolate). Programs see only the job folder. In the local executor, programs run as `nobody`
in the backend container: they can **read** world-readable files in that container (the app
code, which is open anyway; never secrets) but can't write anything except their temp folder.
For public deployments use Piston.

## Accounts

* Students: first name + 4-digit PIN (Argon2-hashed). 8 wrong tries locks that student for 10 minutes.
  Teachers can reset PINs. No email, birthday or surname is ever asked for.
* Teachers: email + password (Argon2), login rate limiting, sign-up only with the school invite code.
* Sessions: signed JWT (HS256, `KALAM_SECRET_KEY`), 12 h for students, 7 days for teachers.
* A teacher sees only their own classes. A student sees only their own class's assignments,
  and never the input/expected output of secret tests.

## Child safety & privacy

* No ads, analytics, trackers, third-party scripts, fonts or iframes. A strict
  Content-Security-Policy (`default-src 'self'`) enforces this in the browser.
* No IP address logging (nginx `access_log off`, uvicorn `--no-access-log`).
* No leaderboards or comparisons between students; badges are private.
* Shared programs are read-only links with unguessable 10-character ids. The share dialog
  tells kids not to put personal information in code.
* The optional AI helper is off by default, rate limited, receives only code, and its system
  prompt keeps answers simple, kind and on-topic.

## Reporting a problem

Email Robokalam's technical contact (set this in the footer and here before launch).
