# Deploying on Hostinger

## Why "Can't reach the Kalam server" appears

Kalam has two parts:

| Part | What it does | Where it can run |
|---|---|---|
| **Website** (`frontend/dist`) | the editor, **Python** (runs in the student's browser) | anywhere, including Hostinger **Web/shared hosting** |
| **Backend** (Docker: API + Piston + PostgreSQL) | **C/C++** compiling, logins, assignments, sharing | needs a **VPS** (root + Docker). Shared hosting can't run it. |

If only the website files are uploaded (e.g. into `public_html`), Python works, but C/C++ show
*"Can't reach the Kalam server"* and the 🔗 Share button is missing. Open **Full error (for
experts)** under the message. It says exactly what is wrong:

| Full error says | Meaning | Fix |
|---|---|---|
| `…/api/health returned HTTP 404 (text/html…)` | No backend behind this website | Option 1 or 2 below |
| `…backend answers… but the WebSocket connection… was refused` | Backend runs, but a proxy blocks WebSockets | Enable WebSockets in the proxy/CDN (see Troubleshooting) |
| `Could not reach … at all` | Wrong `apiBase`, DNS, CORS, or `http://` backend on an `https://` site | Check `kalam-config.json`, `KALAM_CORS_ORIGINS`, HTTPS |

## Option 1 (recommended): everything on one Hostinger VPS

Any Hostinger **KVM VPS** works (KVM 2: 2 vCPU / 8 GB is plenty for a few schools).

1. **hPanel → VPS → OS**: choose **Ubuntu 24.04 with Docker** (or plain Ubuntu, then install Docker:
   `curl -fsSL https://get.docker.com | sh`).
2. **DNS**: in hPanel → Domains → DNS, make `compile.robokalam.com` an **A record** pointing to the
   VPS IP. If the domain currently points to web hosting, change that record. Remove any
   `public_html` copy for this subdomain to avoid confusion.
3. On the VPS (SSH):

```bash
git clone https://github.com/Sajeed25/kalamCompliler.git /opt/kalam && cd /opt/kalam
```

```bash
cp .env.example .env && nano .env
```

   Set every `CHANGE-ME` value and `KALAM_HTTP_PORT=8080` (Caddy will own ports 80/443).

```bash
docker compose up -d --build
```

```bash
docker compose exec backend python -m app.tools.piston_setup
```

4. **HTTPS** with Caddy (free automatic certificates):

```bash
sudo apt install -y caddy
```

```bash
echo 'compile.robokalam.com {
    reverse_proxy localhost:8080
}' | sudo tee /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

5. **Firewall** (hPanel → VPS → Firewall, and `ufw` if enabled): allow ports 22, 80, 443 only.
6. Check: open `https://compile.robokalam.com/api/health`. It should show `{"ok":true}`. Then run a C program.

If `ghcr.io` (Piston) can't be downloaded, use the single-container mode instead:
`docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`.

## Option 2: keep the website on Web hosting, backend on a VPS

Use this if you want to keep the site in `public_html`.

1. Set up the VPS as in Option 1, but give it its own name, e.g. `api.compile.robokalam.com`
   (A record → VPS IP; Caddyfile uses that name).
2. In the VPS `.env`, allow the website to call the backend, then restart:

```
KALAM_CORS_ORIGINS=https://compile.robokalam.com
```

```bash
docker compose up -d
```

3. On Web hosting, upload the **contents** of `frontend/dist/` (build it with
   `cd frontend && npm ci && npm run build`) into the subdomain's folder. Keep the hidden
   `.htaccess` file: it sets the headers Python needs. In File Manager, enable "show hidden files".
4. Edit `kalam-config.json` in that folder (no rebuild needed):

```json
{
  "apiBase": "https://api.compile.robokalam.com"
}
```

5. Reload the site (Ctrl+Shift+R). The 🔗 Share button appears when the backend is reachable.

Both addresses must be `https://`. A browser blocks an `https` page from using an `http` backend.

## Troubleshooting

* **Python says it can't start / input() doesn't work on Web hosting**: the host didn't apply
  `.htaccess` headers. The app's service worker adds them itself and reloads the page once on
  the first visit. If it still fails, make sure `.htaccess` and `sw.js` were uploaded and the
  site is served over HTTPS (service workers need HTTPS).
* **WebSocket refused but `/api/health` works**: a proxy in front is not passing WebSocket
  upgrades. Our `nginx.conf` and Caddy already do this. Hostinger CDN / Cloudflare must have
  WebSockets enabled.
* **Backend logs**: `docker compose logs -f backend`. The first lines say whether the code
  runner (Piston) is reachable.
* **Test the live site end-to-end** from any computer with Node:

```bash
cd frontend && npm ci && KALAM_URL=https://compile.robokalam.com E2E_INVITE=<teacher invite code> npx playwright test -c playwright.deployed.config.ts
```
