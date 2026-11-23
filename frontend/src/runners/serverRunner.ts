import type { ProgramError, Runner, RunEvent, RunResult } from "./types";
import type { LangId } from "../languages";
import { getClientId } from "../lib/clientId";
import { getAuthToken } from "../lib/auth";
import { getRuntimeConfig } from "../lib/runtimeConfig";

/**
 * C and C++ are compiled and run on our server (Piston or the local sandbox)
 * over a WebSocket so the program can ask for input while it runs.
 */
export class ServerRunner implements Runner {
  private ws: WebSocket | null = null;
  private finishFn: ((r: RunResult) => void) | null = null;

  constructor(private lang: LangId) {}

  preload(): void {
    // Warm up DNS/TLS so the first run connects faster.
    fetch(apiUrl("/api/health"), { method: "GET" }).catch(() => {});
  }

  run(code: string, onEvent: (e: RunEvent) => void): Promise<RunResult> {
    this.stop();
    const started = performance.now();
    onEvent({ type: "status", status: "loading" });
    return new Promise<RunResult>((resolve) => {
      let done = false;
      const finish = (r: RunResult) => {
        if (done) return;
        done = true;
        this.finishFn = null;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve({ ...r, timeMs: Math.round(performance.now() - started) });
      };
      this.finishFn = finish;
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl("/api/run/ws"));
      } catch (e) {
        // e.g. an https:// page trying to use an insecure ws:// backend address
        resolve({
          ok: false,
          error: { kind: "system", type: "server_setup", message: "bad server address", raw: `Could not open the connection to the run server: ${String((e as Error)?.message ?? e)}` },
        });
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "run",
            language: this.lang,
            code,
            client_id: getClientId(),
            token: getAuthToken() ?? undefined,
          }),
        );
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "status":
            onEvent({ type: "status", status: msg.status });
            if (msg.status === "running" && msg.input_detection === false) onEvent({ type: "input-request" });
            break;
          case "stdout":
            onEvent({ type: "stdout", text: msg.data });
            break;
          case "stderr":
            onEvent({ type: "stderr", text: msg.data });
            break;
          case "input-request":
            onEvent({ type: "input-request" });
            break;
          case "done":
            finish(msg.result);
            break;
          case "error":
            finish({
              ok: false,
              error: { kind: "system", type: msg.code, message: msg.message, raw: msg.message },
            });
            break;
        }
      };
      let opened = false;
      ws.addEventListener("open", () => (opened = true));
      ws.onerror = () => {
        /* details come from onclose / diagnose() */
      };
      ws.onclose = () => {
        if (done) return;
        if (!opened) {
          void diagnoseServer().then((err) => finish({ ok: false, error: err }));
          return;
        }
        finish({
          ok: false,
          error: { kind: "system", type: "offline", message: "Connection closed", raw: "The connection to the run server closed before the program finished." },
        });
      };
    });
  }

  sendInput(line: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: "stdin", data: line + "\n" }));
  }

  stop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
      // If the server doesn't confirm quickly, give up locally.
      const fin = this.finishFn;
      setTimeout(() => fin?.({ ok: false, stopped: true }), 1500);
    } else this.finishFn?.({ ok: false, stopped: true });
  }
}

export function apiUrl(path: string): string {
  return getRuntimeConfig().apiBase + path;
}

function wsUrl(path: string): string {
  const u = new URL(apiUrl(path), location.href);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.href;
}

/**
 * The WebSocket couldn't connect. Work out why, so the "Full error (for experts)"
 * tells the person who set up the server exactly what to fix.
 */
export async function diagnoseServer(): Promise<ProgramError> {
  const healthUrl = new URL(apiUrl("/api/health"), location.href).href;
  const setup = (raw: string): ProgramError => ({ kind: "system", type: "server_setup", message: "server setup", raw });
  if (!navigator.onLine) {
    return { kind: "system", type: "offline", message: "offline", raw: "This device is offline." };
  }
  let res: Response;
  try {
    res = await fetch(healthUrl, { cache: "no-store" });
  } catch {
    return setup(
      `Could not reach ${healthUrl} at all (network, CORS, DNS or Content-Security-Policy connect-src error).\n` +
        "• If the backend is on another domain, set its address in /kalam-config.json (\"apiBase\") and add this site to KALAM_CORS_ORIGINS on the backend.\n" +
        "• An https:// site can only talk to an https:// backend.\n" +
        "See docs/HOSTINGER.md.",
    );
  }
  const type = res.headers.get("content-type") ?? "";
  const body = await res.text().catch(() => "");
  if (res.ok && type.includes("json") && body.includes('"ok"')) {
    return setup(
      `The Kalam backend answers at ${healthUrl}, but the WebSocket connection to /api/run/ws was refused.\n` +
        "The web server or proxy in front of the backend is not passing WebSocket upgrades. " +
        "In nginx add: proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection \"upgrade\"; " +
        "(already in frontend/nginx.conf). On Cloudflare, enable WebSockets. See docs/HOSTINGER.md.",
    );
  }
  return setup(
    `The Kalam backend is not running behind this website: ${healthUrl} returned HTTP ${res.status} (${type || "no content type"}) instead of {"ok": true}.\n` +
      "This happens when only the frontend files were uploaded (e.g. to shared web hosting). " +
      "Python still works because it runs in the browser, but C, C++, logins, assignments and sharing need the backend.\n" +
      "Fix: run the backend with Docker on a VPS, then either serve this site from it or set \"apiBase\" in /kalam-config.json. See docs/HOSTINGER.md.",
  );
}
