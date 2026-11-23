import type { ProgramError, Runner, RunEvent, RunResult } from "./types";
import type { CLang } from "./clang/shared";
import { CLIENT_LIMITS } from "../config";

const CLANG_BASE = new URL(`${import.meta.env.BASE_URL}clang/`, location.origin).href;
/** "Active" seconds a program may run (time waiting for the student to type doesn't count). */
const ACTIVE_LIMIT_MS = CLIENT_LIMITS.browserRunSeconds * 1000;
/** How long a program may wait for typing before it is stopped. */
const IDLE_INPUT_LIMIT_MS = 300_000;

let compiler: Worker | null = null;
let compilerReady: Promise<void> | null = null;
let progressListener: ((loaded: number, total: number) => void) | null = null;

/** One shared compiler worker for C and C++, loaded once per page. */
function ensureCompiler(): Promise<void> {
  if (compilerReady) return compilerReady;
  const w = new Worker(new URL("./clang/compile.worker.ts", import.meta.url), { type: "module" });
  compiler = w;
  compilerReady = new Promise<void>((resolve, reject) => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.data.type === "progress") progressListener?.(ev.data.loaded, ev.data.total);
      else if (ev.data.type === "ready") resolve();
      else if (ev.data.type === "failed") reject(new Error(ev.data.message));
    };
    w.addEventListener("message", onMsg);
    w.addEventListener("error", (e) => reject(new Error(e.message || "The C/C++ compiler could not start")));
  });
  compilerReady.catch(() => {
    compiler?.terminate();
    compiler = null;
    compilerReady = null;
  });
  w.postMessage({ type: "init", base: CLANG_BASE });
  return compilerReady;
}

let nextId = 1;

function compile(lang: CLang, code: string, onCompiling: () => void): Promise<{ ok: boolean; wasm?: Uint8Array; messages: string; failure?: string }> {
  return new Promise((resolve) => {
    const w = compiler!;
    const id = nextId++;
    const onMsg = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.id !== id) return; // a result for an older, stopped run
      if (m.type === "compiling") onCompiling();
      else if (m.type === "compiled") {
        w.removeEventListener("message", onMsg);
        resolve({ ok: m.ok, wasm: m.wasm, messages: m.messages ?? "" });
      } else if (m.type === "failed") {
        w.removeEventListener("message", onMsg);
        resolve({ ok: false, messages: "", failure: m.message });
      }
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "compile", id, lang, code });
  });
}

const TRAPS: [RegExp, string][] = [
  [/divide by zero|integer overflow/i, "SIGFPE"],
  [/out of bounds|null function|indirect call|unaligned/i, "SIGSEGV"],
  [/call stack|stack overflow|too much recursion/i, "SIGSEGV"],
  [/unreachable/i, "SIGABRT"],
];

/**
 * Compiles and runs C/C++ entirely in the browser (Clang → WebAssembly). Used when no
 * Kalam backend is available, e.g. on static or Node.js web hosting. ~27 MB is
 * downloaded once and then cached for offline use.
 */
export class BrowserCRunner implements Runner {
  private program: Worker | null = null;
  private ctrl: Int32Array | null = null;
  private data: Uint8Array | null = null;
  private finishFn: ((r: RunResult) => void) | null = null;
  private stopped = false;

  constructor(private lang: CLang) {}

  preload(): void {
    void ensureCompiler().catch(() => {});
  }

  run(code: string, onEvent: (e: RunEvent) => void): Promise<RunResult> {
    this.stop();
    this.stopped = false;
    const started = performance.now();
    onEvent({ type: "status", status: "loading" });
    return new Promise<RunResult>((resolve) => {
      let done = false;
      let timer: number | undefined;
      const finish = (r: RunResult) => {
        if (done) return;
        done = true;
        window.clearInterval(timer);
        this.program?.terminate();
        this.program = null;
        this.finishFn = null;
        progressListener = null;
        resolve({ ...r, timeMs: Math.round(performance.now() - started) });
      };
      this.finishFn = finish;
      progressListener = (loaded, total) => onEvent({ type: "progress", loaded, total });

      void (async () => {
        try {
          await ensureCompiler();
        } catch (e) {
          const raw = `The C/C++ compiler could not be downloaded or started: ${String((e as Error).message)}`;
          finish({ ok: false, error: { kind: "system", type: "compiler_load", message: raw, raw } });
          return;
        }
        if (this.stopped) return finish({ ok: false, stopped: true });
        const result = await compile(this.lang, code, () => onEvent({ type: "status", status: "compiling" }));
        if (this.stopped) return finish({ ok: false, stopped: true });
        if (result.failure) {
          finish({ ok: false, error: { kind: "system", type: "compiler_load", message: result.failure, raw: result.failure } });
          return;
        }
        if (!result.ok || !result.wasm) {
          const first = result.messages.split("\n").find((l) => / error: /.test(l)) ?? result.messages.slice(0, 200);
          finish({ ok: false, error: { kind: "compile", type: "error", message: first, raw: result.messages } });
          return;
        }
        const warnings = /warning:/.test(result.messages) ? result.messages : undefined;

        // ---- run
        onEvent({ type: "status", status: "running" });
        const isolated = typeof SharedArrayBuffer !== "undefined" && self.crossOriginIsolated;
        this.ctrl = isolated ? new Int32Array(new SharedArrayBuffer(16)) : null;
        this.data = isolated ? new Uint8Array(new SharedArrayBuffer(64 * 1024)) : null;
        const worker = new Worker(new URL("./clang/program.worker.ts", import.meta.url), { type: "module" });
        this.program = worker;
        let stderr = "";
        let waiting = false;
        let active = 0;
        let idle = 0;
        let last = performance.now();
        timer = window.setInterval(() => {
          const now = performance.now();
          const dt = now - last;
          last = now;
          if (waiting) idle += dt;
          else active += dt;
          if (active > ACTIVE_LIMIT_MS || idle > IDLE_INPUT_LIMIT_MS) {
            finish({ ok: false, error: { kind: "timeout", message: "time limit", raw: `Time limit reached (${active > ACTIVE_LIMIT_MS ? ACTIVE_LIMIT_MS / 1000 + " s of running" : "waited too long for input"}).` } });
          }
        }, 100);
        worker.onmessage = (ev) => {
          const m = ev.data;
          if (m.type === "stdout") {
            waiting = false;
            onEvent({ type: "stdout", text: m.text });
          } else if (m.type === "stderr") {
            stderr += m.text;
            onEvent({ type: "stderr", text: m.text });
          } else if (m.type === "input") {
            waiting = true;
            onEvent({ type: "input-request" });
          } else if (m.type === "done") {
            let error: ProgramError | undefined;
            if (m.noInput) {
              error = { kind: "runtime", type: "KalamNoInput", message: "KALAM_NO_INPUT", raw: "This page is not cross-origin isolated, so the program can't wait for typing." };
            } else if (m.trap) {
              const sig = TRAPS.find(([re]) => re.test(m.trap))?.[1] ?? "SIGABRT";
              error = { kind: "runtime", type: sig, message: `Program crashed (${sig})`, raw: `${stderr.slice(-4000)}\nProgram crashed: ${m.trap}`.trim() };
            } else if (m.exitCode !== 0) {
              error = { kind: "runtime", type: "exit", message: `exit code ${m.exitCode}`, raw: `${stderr.slice(-4000)}\nProgram exited with code ${m.exitCode}.`.trim() };
            }
            finish(error ? { ok: false, error, ...(warnings ? { warnings } : {}) } : { ok: true, ...(warnings ? { warnings } : {}) });
          }
        };
        worker.onerror = (e) => finish({ ok: false, error: { kind: "system", message: e.message, raw: e.message } });
        worker.postMessage({ wasm: result.wasm, ctrl: this.ctrl?.buffer ?? null, data: this.data?.buffer ?? null }, [result.wasm.buffer]);
      })();
    });
  }

  sendInput(line: string): void {
    if (!this.ctrl || !this.data) return;
    const enc = new TextEncoder().encode((line + "\n").slice(0, CLIENT_LIMITS.maxInputChars));
    const n = Math.min(enc.length, this.data.length);
    this.data.set(enc.subarray(0, n));
    Atomics.store(this.ctrl, 1, n);
    Atomics.store(this.ctrl, 0, 1);
    Atomics.notify(this.ctrl, 0);
  }

  stop(): void {
    this.stopped = true;
    this.finishFn?.({ ok: false, stopped: true });
  }
}
