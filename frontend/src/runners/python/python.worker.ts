/// <reference lib="webworker" />
// Runs student Python code with Pyodide inside a Web Worker so the page never
// freezes. input() and time.sleep() block this worker (not the page) using
// Atomics.wait on a SharedArrayBuffer that the page writes to.
import turtleSource from "./turtle.py?raw";
import bootstrapSource from "./bootstrap.py?raw";

type PyodideAPI = {
  runPython: (code: string) => unknown;
  globals: { get: (name: string) => unknown };
  registerJsModule: (name: string, mod: object) => void;
  setStdout: (o: { write: (b: Uint8Array) => number }) => void;
  setStderr: (o: { write: (b: Uint8Array) => number }) => void;
  setInterruptBuffer: (b: Uint8Array) => void;
  FS: { writeFile: (p: string, d: string) => void; mkdirTree: (p: string) => void };
};

const scope = self as unknown as DedicatedWorkerGlobalScope;
let py: PyodideAPI | null = null;
let ctrl: Int32Array; // [0] input state 0=idle 1=ready 2=cancel, [1] input length, [2] sleep wake
let data: Uint8Array;
let interrupt: Uint8Array;

const outDecoder = new TextDecoder();
const errDecoder = new TextDecoder();
let outBuf = "";
let turtleBuf: unknown[] = [];
let lastFlush = 0;

function post(msg: unknown) {
  scope.postMessage(msg);
}

function flush() {
  if (outBuf) {
    post({ type: "stdout", text: outBuf });
    outBuf = "";
  }
  if (turtleBuf.length) {
    post({ type: "turtle", ops: turtleBuf });
    turtleBuf = [];
  }
  lastFlush = performance.now();
}

function maybeFlush() {
  if (outBuf.length > 4096 || turtleBuf.length > 200 || performance.now() - lastFlush > 33) flush();
}

const bridge = {
  read_line(): string | null {
    flush();
    Atomics.store(ctrl, 0, 0);
    post({ type: "input" });
    Atomics.wait(ctrl, 0, 0);
    const state = Atomics.load(ctrl, 0);
    Atomics.store(ctrl, 0, 0);
    if (state !== 1) return null; // cancelled by Stop
    const len = Atomics.load(ctrl, 1);
    return new TextDecoder().decode(data.slice(0, len));
  },
  sleep(seconds: number) {
    flush();
    const ms = Math.max(0, Math.min(seconds * 1000, 60_000));
    if (ms > 0) Atomics.wait(ctrl, 2, 0, ms);
  },
  turtle(json: string) {
    turtleBuf.push(JSON.parse(json));
    maybeFlush();
  },
};

async function init(msg: { ctrl: SharedArrayBuffer; data: SharedArrayBuffer; interrupt: SharedArrayBuffer; indexURL: string }) {
  ctrl = new Int32Array(msg.ctrl);
  data = new Uint8Array(msg.data);
  interrupt = new Uint8Array(msg.interrupt);
  const mod = await import(/* @vite-ignore */ msg.indexURL + "pyodide.mjs");
  const pyodide: PyodideAPI = await mod.loadPyodide({ indexURL: msg.indexURL, fullStdLib: false });
  pyodide.setStdout({
    write: (b) => {
      outBuf += outDecoder.decode(b, { stream: true });
      maybeFlush();
      return b.length;
    },
  });
  pyodide.setStderr({
    write: (b) => {
      flush();
      post({ type: "stderr", text: errDecoder.decode(b, { stream: true }) });
      return b.length;
    },
  });
  pyodide.setInterruptBuffer(interrupt);
  pyodide.registerJsModule("kalam_bridge", bridge);
  pyodide.FS.mkdirTree("/home/pyodide/kalam");
  pyodide.FS.writeFile("/home/pyodide/kalam/turtle.py", turtleSource);
  pyodide.runPython(bootstrapSource);
  py = pyodide;
  post({ type: "ready" });
}

function run(code: string) {
  if (!py) throw new Error("Python is not ready");
  const runFn = py.globals.get("_kalam_run") as (src: string) => string;
  let result: string;
  try {
    result = runFn(code);
  } catch (e) {
    flush();
    const text = String((e as Error)?.message ?? e);
    const memory = /memory|allocat/i.test(text);
    post({
      type: "done",
      result: {
        ok: false,
        error: {
          kind: memory ? "memory" : "system",
          type: memory ? "MemoryError" : "InternalError",
          message: text,
          raw: text,
        },
      },
      fatal: true,
    });
    return;
  }
  flush();
  post({ type: "done", result: JSON.parse(result) });
}

scope.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data;
  try {
    if (msg.type === "init") await init(msg);
    else if (msg.type === "run") run(msg.code);
  } catch (e) {
    post({ type: "fatal", message: String((e as Error)?.message ?? e) });
  }
};
