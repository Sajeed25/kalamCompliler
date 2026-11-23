# Deploying on Hostinger

## Which Hostinger plan does what

| Plan | Python | C / C++ | Logins, classes, assignments, sharing |
|---|---|---|---|
| **Web apps (Node.js)**, e.g. Business / Cloud "Web apps" | ✅ in the browser | ✅ **in the browser** (Clang → WebAssembly) | ❌ needs a backend: add a VPS (see the end of this guide) |
| Web hosting (static files in `public_html`) | ✅ | ✅ in the browser | ❌ |
| **VPS** (KVM, Docker) | ✅ | ✅ on the server (Piston) | ✅ |

Hostinger's Node.js web apps can't run Docker, Python services or inbound WebSockets
([Hostinger's limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)),
so the Kalam backend can't run there. That's fine for coding: **Python and C/C++ both run inside
the student's browser**. The C/C++ compiler (about 27 MB) downloads the first time a device runs C
or C++, then it is cached and also works offline.

## Hostinger Web apps (Node.js) — your current plan

In hPanel → **Websites → Add website → Node.js web app** (or the existing app's **Settings**):

| Setting | Value |
|---|---|
| Source | GitHub repo `Sajeed25/kalamCompliler`, branch `main` (or upload a zip of the repo) |
| Framework | **Other** (or "Express") |
| Root directory | `/` (the repository root) |
| Node.js version | **20** or newer |
| Build command | `npm run build` |
| Start command / entry file | `npm start` (entry file: `frontend/server.mjs`) |
| Output directory | leave empty: `frontend/server.mjs` serves `frontend/dist` itself |

Then **Deploy**. Each push to GitHub redeploys (if auto-deploy is on). The build installs
packages, copies Python and the C/C++ compiler into the site, and builds the app. It takes about
1–2 minutes.

`frontend/server.mjs` is a tiny web server with no dependencies. It sends the headers the app
needs (COOP/COEP for typed input, the right file types, gzip and caching) and answers `/api/*`
with "no backend", so the app switches to in-browser C/C++ at once.

### Check it works

1. Open `https://compile.robokalam.com/#/code/c`, press **▶ Run**. The first time, a bar shows
   "Getting the C/C++ compiler ready… only the first time". Then *Hello, World!* appears.
2. Try a program with `scanf`/`cin`: the input box appears inside the output screen.
3. Open the same page on a second device to check the download also works on school internet.

## If you uploaded files instead (static / `public_html`)

Upload the contents of `frontend/dist/` (or the ready-made `kalam-website.zip`). Delete old files
first, keep the hidden `.htaccess`, then **Clear cache** in hPanel and press Ctrl+Shift+R.

## Adding classes, assignments and sharing later (needs a VPS)

1. Get a Hostinger **KVM VPS** (Ubuntu 24.04 with Docker). Point `api.compile.robokalam.com`
   (DNS A record) at it.
2. On the VPS:

```bash
git clone https://github.com/Sajeed25/kalamCompliler.git /opt/kalam && cd /opt/kalam
```

```bash
cp .env.example .env && nano .env
```

   Set the `CHANGE-ME` values, `KALAM_HTTP_PORT=8080` and
   `KALAM_CORS_ORIGINS=https://compile.robokalam.com`.

```bash
docker compose up -d --build && docker compose exec backend python -m app.tools.piston_setup
```

3. HTTPS with Caddy:

```bash
sudo apt install -y caddy && echo 'api.compile.robokalam.com {
    reverse_proxy localhost:8080
}' | sudo tee /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

4. In the repository, set `frontend/public/kalam-config.json` to
   `{ "apiBase": "https://api.compile.robokalam.com", "cRunner": "auto" }` and push. The web app
   redeploys, **Log in** appears, and C/C++ then run on the VPS (with the in-browser compiler as
   automatic fallback if the VPS is down).

Alternatively run everything on the VPS and point `compile.robokalam.com` itself at it
(see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Troubleshooting

| What you see | Fix |
|---|---|
| Blank page | Redeploy the latest version (fixed). Any error now shows a friendly screen with a Reload button. |
| "Getting the C/C++ compiler ready" never finishes | The device's internet blocked a 27 MB download. Try again on a better connection; after one success it's cached. Check `https://compile.robokalam.com/clang/llvm.core.wasm.kgz` downloads. |
| "The C/C++ compiler couldn't be downloaded" | Same as above; or the build didn't create `frontend/dist/clang/`. Check the build log for `[copy-runtimes]`. |
| Typing answers says "reload the page" | Press Ctrl+Shift+R once. If it persists, the site isn't sending COOP/COEP headers: make sure the start command is `npm start` (our server), not a generic static host. |
| C/C++ say "server isn't set up" | `kalam-config.json` has `"cRunner": "server"` or an `apiBase` that's down. Use `"cRunner": "auto"`. |

Test the live site end-to-end from any computer with Node:

```bash
cd frontend && npm ci && KALAM_URL=https://compile.robokalam.com npx playwright test -c playwright.deployed.config.ts e2e/hello.spec.ts e2e/browser-compiler.spec.ts
```

Sources: [Hostinger Node.js limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/),
[How to add a Node.js web app](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).
