# Deployment

## One server with Docker Compose (recommended start)

Requirements: a Linux VPS (Ubuntu 22.04/24.04), Docker Engine 24+ with Compose v2.24+, a domain name.

```bash
git clone <repo> /opt/kalam && cd /opt/kalam
```

```bash
cp .env.example .env && nano .env      # set every CHANGE-ME value
```

```bash
docker compose up -d --build
```

```bash
docker compose exec backend python -m app.tools.piston_setup
```

Check it works (runs Hello World in all 3 languages, a classroom flow and more against the live site):

```bash
cd frontend && npm ci && KALAM_URL=https://code.your-school.example E2E_INVITE=<your invite code> npx playwright test -c playwright.deployed.config.ts
```

### HTTPS

The `web` container listens on port 80. Put a TLS proxy in front of it, for example [Caddy](https://caddyserver.com)
(Apache-2.0), with this as its whole config:

```
code.your-school.example {
    reverse_proxy localhost:8080
}
```

and set `KALAM_HTTP_PORT=8080` in `.env`. The proxy must pass WebSocket upgrades (Caddy does by
default) and must **not** strip the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
headers. Without them, Python can't pause for `input()`.

### Updating

```bash
git pull && docker compose up -d --build
```

Database tables are created automatically on start. For future schema changes, add
Alembic migrations (`backend/`) before changing models in production.

### Backups

```bash
docker compose exec postgres pg_dump -U kalam kalam | gzip > kalam-$(date +%F).sql.gz
```

## Sizing

| Students using C/C++ at the same moment | Server |
|---|---|
| up to ~60 (one lab) | 2 vCPU / 4 GB |
| ~200 (a few schools) | 4 vCPU / 8 GB, `queue.max_concurrent_runs: 8` |
| 1000+ | see Scaling |

Python runs in each student's own browser, so it costs the server nothing except the one-time
download of ~4 MB gzipped (cached afterwards by the service worker and HTTP cache).
Identical C/C++ programs (e.g. 40 students running the same example) are compiled once and
cached (`compile_cache` in `limits.yaml`, local executor).

## Tuning

`backend/config/limits.yaml` is mounted into the container. Edit, then:

```bash
docker compose restart backend
```

## Alternative: no Piston

If `ghcr.io` is blocked, or for a tiny single-school server:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

The C/C++ compiler then lives in the backend container; each program runs as `nobody` with
CPU/memory/process/file limits and no network. Read [SECURITY.md](SECURITY.md) for the
differences.

## Scaling later

1. **Separate the runners.** Run Piston on its own machine(s); point `KALAM_PISTON_URL` at a load
   balancer in front of several Piston nodes. This is where almost all CPU goes.
2. **More backend replicas.** The backend is stateless (state is in PostgreSQL + Valkey). Run
   several replicas behind nginx (`upstream kalam_backend { server backend1:8000; server backend2:8000; }`).
   Each replica has its own `max_concurrent_runs`; Piston's `PISTON_MAX_CONCURRENT_JOBS` caps the total.
3. **Static files on a CDN** you control (must send the COOP/COEP headers), or simply on nginx
   with long cache times (already configured).
4. **Managed PostgreSQL** with daily backups.
5. Kubernetes is optional. The same containers work; give Piston a privileged node pool.

## Environment variables

See [`.env.example`](../.env.example). Every variable starts with `KALAM_` and maps to `backend/app/config.py`.
