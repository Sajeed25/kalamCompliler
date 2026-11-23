import type { Runner, RunEvent, RunResult } from "./types";
import { CLIENT_LIMITS } from "../config";

const INDEX_URL = new URL(`${import.meta.env.BASE_URL}pyodide/`, location.origin).href;

/** Python runs entirely in the browser (Pyodide in a Web Worker). */
export class PythonRunner implements Runner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  // Shared memory lets Python pause for input() and be interrupted by Stop. It only exists on
  // "cross-origin isolated" pages; without it Python still runs, but input() can't wait.
  private ctrl: Int32Array | null = null;
  private data: Uint8Array | null = null;
  private interrupt: Uint8Array | null = null;
  private current: {
    onEvent: (e: RunEvent) => void;
    resolve: (r: RunResult) => void;
    started: number;
  } | null = null;
  private hardStopTimer: number | undefined;

  constructor() {
    if (PythonRunner.supported()) {
      this.ctrl = new Int32Array(new SharedArrayBuffer(16));
      this.data = new Uint8Array(new SharedArrayBuffer(64 * 1024));
      this.interrupt = new Uint8Array(new SharedArrayBuffer(1));
    }
  }

  /** True when input() and graceful Stop are available. */
  canPause(): boolean {
    return this.ctrl !== null;
  }

  static supported(): boolean {
    return typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated === true;
  }

  preload(): void {
    void this.ensureWorker();
  }

  private ensureWorker(): Promise<void> {
    if (this.ready) return this.ready;
    const worker = new Worker(new URL("./python/python.worker.ts", import.meta.url), { type: "module" });
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (ev) => {
        const msg = ev.data;
        if (msg.type === "ready") resolve();
        else if (msg.type === "fatal") {
          reject(new Error(msg.message));
          this.finish({ ok: false, error: { kind: "system", message: msg.message, raw: msg.message } });
          this.reset();
        } else this.onWorkerMessage(msg);
      };
      worker.onerror = (e) => {
        const message = e.message || "Python stopped unexpectedly";
        reject(new Error(message));
        this.finish({ ok: false, error: { kind: "system", message, raw: message } });
        this.reset();
      };
    });
    worker.postMessage({
      type: "init",
      ctrl: this.ctrl?.buffer ?? null,
      data: this.data?.buffer ?? null,
      interrupt: this.interrupt?.buffer ?? null,
      indexURL: INDEX_URL,
    });
    this.ready.catch(() => {});
    return this.ready;
  }

  private onWorkerMessage(msg: { type: string; [k: string]: unknown }) {
    const cur = this.current;
    if (!cur) return;
    switch (msg.type) {
      case "stdout":
        cur.onEvent({ type: "stdout", text: msg.text as string });
        break;
      case "stderr":
        cur.onEvent({ type: "stderr", text: msg.text as string });
        break;
      case "turtle":
        cur.onEvent({ type: "turtle", ops: msg.ops as never });
        break;
      case "input":
        cur.onEvent({ type: "input-request" });
        break;
      case "done":
        this.finish(msg.result as RunResult);
        if (msg.fatal) this.reset();
        break;
    }
  }

  private finish(result: RunResult) {
    const cur = this.current;
    if (!cur) return;
    window.clearTimeout(this.hardStopTimer);
    this.current = null;
    cur.resolve({ ...result, timeMs: Math.round(performance.now() - cur.started) });
  }

  /** Throw the worker away (used when Stop doesn't work or Python crashed). */
  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  async run(code: string, onEvent: (e: RunEvent) => void): Promise<RunResult> {
    if (this.current) this.stop();
    onEvent({ type: "status", status: "loading" });
    try {
      await this.ensureWorker();
    } catch (e) {
      const message = String((e as Error).message);
      return { ok: false, error: { kind: "system", type: "LoadError", message, raw: message } };
    }
    if (this.ctrl && this.interrupt) {
      Atomics.store(this.ctrl, 0, 0);
      Atomics.store(this.ctrl, 2, 0);
      this.interrupt[0] = 0;
    }
    onEvent({ type: "status", status: "running" });
    return new Promise<RunResult>((resolve) => {
      this.current = { onEvent, resolve, started: performance.now() };
      this.worker!.postMessage({ type: "run", code });
    });
  }

  sendInput(line: string): void {
    if (!this.ctrl || !this.data) return;
    const bytes = new TextEncoder().encode(line.slice(0, CLIENT_LIMITS.maxInputChars));
    const n = Math.min(bytes.length, this.data.length);
    this.data.set(bytes.subarray(0, n));
    Atomics.store(this.ctrl, 1, n);
    Atomics.store(this.ctrl, 0, 1);
    Atomics.notify(this.ctrl, 0);
  }

  stop(): void {
    if (!this.current) return;
    if (!this.ctrl || !this.interrupt) {
      // No shared memory: the only way to stop Python is to restart it.
      this.finish({ ok: false, stopped: true });
      this.reset();
      this.preload();
      return;
    }
    this.interrupt[0] = 2; // SIGINT -> KeyboardInterrupt
    Atomics.store(this.ctrl, 0, 2);
    Atomics.notify(this.ctrl, 0);
    Atomics.store(this.ctrl, 2, 1);
    Atomics.notify(this.ctrl, 2);
    window.clearTimeout(this.hardStopTimer);
    this.hardStopTimer = window.setTimeout(() => {
      // Python didn't respond (e.g. stuck inside a long C-level call): restart it.
      this.finish({ ok: false, stopped: true });
      this.reset();
      this.preload();
    }, CLIENT_LIMITS.hardStopMs);
  }
}
