# Runner (Piston)

C and C++ programs are compiled and run by [Piston](https://github.com/engineer-man/piston)
(MIT licence) in its own container. Our backend talks to it over its interactive
WebSocket API (`/api/v2/connect`) so students can type input while their program runs.

## What protects the server

| Layer | Setting |
|---|---|
| Separate container | `piston` service in `docker-compose.yml`, on an `internal` network |
| No network for programs | `PISTON_DISABLE_NETWORKING=true` |
| CPU time | `run_cpu_time` = `run.cpu_seconds` (5 s) from `backend/config/limits.yaml`, sent per run |
| Memory | `run_memory_limit` = `run.memory_mb` (128 MB), sent per run; `PISTON_RUN_MEMORY_LIMIT` caps it |
| Output | backend stops the run after `run.max_output_kb` (64 KB); `PISTON_OUTPUT_MAX_SIZE` caps it too |
| Processes / files | `PISTON_MAX_PROCESS_COUNT=16`, `PISTON_MAX_OPEN_FILES=64`, `PISTON_MAX_FILE_SIZE=1 MB` |
| Writable disk | only the job folder `/piston/jobs` (tmpfs); everything else is read-only to programs |
| Wall time | `run_timeout` = `run.idle_input_seconds` (programs may wait for a student to type) |
| Rate limits & queue | done by our backend: 1 run / 2 s per student, per-IP cap, max 8 concurrent runs |

Piston needs `privileged: true` because its sandbox (isolate) manages cgroups and
namespaces itself. Keep the Piston container off the public network (it is: only
`web` publishes a port).

## First start

```bash
docker compose up -d --build
docker compose exec backend python -m app.tools.piston_setup
```

`piston_setup` installs `gcc 10.2.0` (C and C++) and `python 3.12.0` (used only for
auto-checking Python assignments). After that, Piston never needs the internet; you
can remove the `egress` network from the `piston` service.

## Without Piston

If `ghcr.io` is blocked on your network, use the local sandbox instead:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

See `docs/SECURITY.md` for what the local sandbox does and does not protect against.
