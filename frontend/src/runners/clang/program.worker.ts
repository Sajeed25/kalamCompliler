/// <reference lib="webworker" />
// Runs one compiled C/C++ program (WebAssembly + WASI preview1). A fresh worker is used
// for every run so Stop and time limits can simply terminate it.
//
// Only what student programs need is implemented: stdout/stderr, blocking stdin
// (Atomics.wait on shared memory, like the Python worker), clocks, random numbers,
// sleep, exit. Files and network are not available.
const scope = self as unknown as DedicatedWorkerGlobalScope;

const ESUCCESS = 0;
const EBADF = 8;
const ENOSYS = 52;
const ESPIPE = 70;

class ProcExit extends Error {
  constructor(public code: number) {
    super(`exit ${code}`);
  }
}

let ctrl: Int32Array | null = null; // [0] input state 0=idle 1=ready 2=cancel, [1] length, [2] sleep wake
let data: Uint8Array | null = null;
let memory: WebAssembly.Memory;
let pendingIn: Uint8Array = new Uint8Array(0);
let stdinEOF = false;

const outDec = new TextDecoder();
const errDec = new TextDecoder();
let outBuf = "";
let lastFlush = 0;

function flush() {
  if (outBuf) scope.postMessage({ type: "stdout", text: outBuf });
  outBuf = "";
  lastFlush = performance.now();
}

const view = () => new DataView(memory.buffer);
const bytes = (ptr: number, len: number) => new Uint8Array(memory.buffer, ptr, len);

function readLine(): Uint8Array | null {
  flush();
  if (!ctrl || !data) {
    scope.postMessage({ type: "no-input" });
    return null;
  }
  Atomics.store(ctrl, 0, 0);
  scope.postMessage({ type: "input" });
  Atomics.wait(ctrl, 0, 0);
  const state = Atomics.load(ctrl, 0);
  Atomics.store(ctrl, 0, 0);
  if (state !== 1) return null;
  return data.slice(0, Atomics.load(ctrl, 1));
}

function sleepMs(ms: number) {
  flush();
  if (ms <= 0) return;
  ms = Math.min(ms, 60_000);
  if (ctrl) Atomics.wait(ctrl, 2, 0, ms);
  else {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      /* busy wait: only this worker is blocked */
    }
  }
}

const wasi: Record<string, (...a: number[]) => number> = {
  args_sizes_get(argc, bufSize) {
    view().setUint32(argc, 1, true);
    view().setUint32(bufSize, 5, true);
    return ESUCCESS;
  },
  args_get(argv, buf) {
    bytes(buf, 5).set([112, 114, 111, 103, 0]); // "prog\0"
    view().setUint32(argv, buf, true);
    return ESUCCESS;
  },
  environ_sizes_get(count, size) {
    view().setUint32(count, 0, true);
    view().setUint32(size, 0, true);
    return ESUCCESS;
  },
  environ_get() {
    return ESUCCESS;
  },
  clock_res_get(_id, ptr) {
    view().setBigUint64(ptr, 1000n, true);
    return ESUCCESS;
  },
  clock_time_get(id, _precision, ptr) {
    const ms = id === 0 ? Date.now() : performance.now();
    view().setBigUint64(ptr, BigInt(Math.round(ms * 1e6)), true);
    return ESUCCESS;
  },
  random_get(ptr, len) {
    for (let off = 0; off < len; off += 65536) crypto.getRandomValues(bytes(ptr + off, Math.min(65536, len - off)));
    return ESUCCESS;
  },
  fd_write(fd, iovs, iovsLen, nwritten) {
    if (fd !== 1 && fd !== 2) return EBADF;
    const v = view();
    let total = 0;
    for (let i = 0; i < iovsLen; i++) {
      const ptr = v.getUint32(iovs + i * 8, true);
      const len = v.getUint32(iovs + i * 8 + 4, true);
      const chunk = bytes(ptr, len);
      total += len;
      if (fd === 1) outBuf += outDec.decode(chunk, { stream: true });
      else {
        flush();
        scope.postMessage({ type: "stderr", text: errDec.decode(chunk, { stream: true }) });
      }
    }
    if (outBuf.length > 4096 || performance.now() - lastFlush > 33) flush();
    v.setUint32(nwritten, total, true);
    return ESUCCESS;
  },
  fd_read(fd, iovs, iovsLen, nread) {
    if (fd !== 0) return EBADF;
    if (pendingIn.length === 0 && !stdinEOF) {
      const line = readLine();
      if (line === null) stdinEOF = true;
      else pendingIn = line;
    }
    const v = view();
    let total = 0;
    for (let i = 0; i < iovsLen && pendingIn.length; i++) {
      const ptr = v.getUint32(iovs + i * 8, true);
      const len = v.getUint32(iovs + i * 8 + 4, true);
      const n = Math.min(len, pendingIn.length);
      bytes(ptr, n).set(pendingIn.subarray(0, n));
      pendingIn = pendingIn.subarray(n);
      total += n;
    }
    v.setUint32(nread, total, true);
    return ESUCCESS;
  },
  fd_fdstat_get(fd, ptr) {
    if (fd > 2) return EBADF;
    const v = view();
    v.setUint8(ptr, 2); // character device (a terminal)
    v.setUint16(ptr + 2, 0, true);
    v.setBigUint64(ptr + 8, 0xffffffffffffffffn, true);
    v.setBigUint64(ptr + 16, 0xffffffffffffffffn, true);
    return ESUCCESS;
  },
  fd_filestat_get(fd, ptr) {
    if (fd > 2) return EBADF;
    bytes(ptr, 64).fill(0);
    view().setUint8(ptr + 16, 2);
    return ESUCCESS;
  },
  fd_prestat_get() {
    return EBADF; // no folders are shared with the program
  },
  fd_prestat_dir_name() {
    return EBADF;
  },
  fd_close() {
    return ESUCCESS;
  },
  fd_seek() {
    return ESPIPE;
  },
  fd_fdstat_set_flags() {
    return ESUCCESS;
  },
  sched_yield() {
    return ESUCCESS;
  },
  poll_oneoff(inPtr, outPtr, nsubs, neventsPtr) {
    // Used by sleep()/nanosleep(): wait for the longest clock subscription.
    const v = view();
    let waitMs = 0;
    for (let i = 0; i < nsubs; i++) {
      const sub = inPtr + i * 48;
      if (v.getUint8(sub + 8) === 0) {
        const timeout = Number(v.getBigUint64(sub + 24, true)) / 1e6;
        const absolute = (v.getUint16(sub + 40, true) & 1) === 1;
        waitMs = Math.max(waitMs, absolute ? timeout - performance.now() : timeout);
      }
    }
    sleepMs(waitMs);
    for (let i = 0; i < nsubs; i++) {
      const sub = inPtr + i * 48;
      const ev = outPtr + i * 32;
      v.setBigUint64(ev, v.getBigUint64(sub, true), true);
      v.setUint16(ev + 8, 0, true);
      v.setUint8(ev + 10, v.getUint8(sub + 8));
    }
    v.setUint32(neventsPtr, nsubs, true);
    return ESUCCESS;
  },
  proc_exit(code) {
    throw new ProcExit(code);
  },
};

const wasiImports = new Proxy(wasi, {
  get: (target, name: string) => target[name] ?? (() => ENOSYS),
});

scope.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as { wasm: Uint8Array; ctrl: SharedArrayBuffer | null; data: SharedArrayBuffer | null };
  ctrl = msg.ctrl ? new Int32Array(msg.ctrl) : null;
  data = msg.data ? new Uint8Array(msg.data) : null;
  let exitCode = 0;
  let trap: string | null = null;
  try {
    const module = await WebAssembly.compile(msg.wasm as Uint8Array<ArrayBuffer>);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasiImports });
    memory = instance.exports.memory as WebAssembly.Memory;
    (instance.exports._start as () => void)();
  } catch (e) {
    if (e instanceof ProcExit) exitCode = e.code;
    else trap = String((e as Error)?.message ?? e);
  }
  outBuf += outDec.decode();
  flush();
  scope.postMessage({ type: "done", exitCode, trap, noInput: stdinEOF && !ctrl });
};
