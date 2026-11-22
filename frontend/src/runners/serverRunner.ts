import type { Runner, RunEvent, RunResult } from "./types";
import type { LangId } from "../languages";
import { getClientId } from "../lib/clientId";
import { getAuthToken } from "../lib/auth";

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
      const ws = new WebSocket(wsUrl("/api/run/ws"));
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
      ws.onerror = () => {
        finish({
          ok: false,
          error: {
            kind: "system",
            type: "offline",
            message: "Could not reach the Kalam server",
            raw: "WebSocket connection to the run server failed",
          },
        });
      };
      ws.onclose = () => {
        finish({
          ok: false,
          error: { kind: "system", type: "offline", message: "Connection closed", raw: "WebSocket closed" },
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
  const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
  return base + path;
}

function wsUrl(path: string): string {
  const u = new URL(apiUrl(path), location.href);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.href;
}
