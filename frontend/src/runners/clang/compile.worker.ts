/// <reference lib="webworker" />
// Compiles C/C++ to WebAssembly inside the browser with Clang/LLD (YoWASP build),
// self-hosted under /clang/. Kept alive between runs so later compiles are fast.
import { UNBUFFER_RUNTIME, compileArgs, type CLang } from "./shared";

const scope = self as unknown as DedicatedWorkerGlobalScope;

type ClangModule = {
  runClang: (args: string[], files: Record<string, string>, opts: object) => Promise<Record<string, Uint8Array>>;
  Exit: new (...a: unknown[]) => Error & { code: number };
};

let base = "";
let loading: Promise<ClangModule> | null = null;
const totals = new Map<string, number>();
const done = new Map<string, number>();

function progress() {
  let total = 0;
  let got = 0;
  for (const [k, v] of totals) {
    total += v;
    got += done.get(k) ?? 0;
  }
  if (total > 0) scope.postMessage({ type: "progress", loaded: got, total });
}

/**
 * The two big compiler files are stored gzip-compressed as *.kgz (an extension no web
 * server rewrites), so the download is ~27 MB everywhere. Decompress them here and hand
 * the bundle a normal response.
 */
function installFetchShim() {
  const origFetch = scope.fetch.bind(scope);
  scope.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const m = /\/clang\/(llvm\.core\.wasm|llvm-resources\.tar)$/.exec(new URL(url, base).pathname);
    if (!m) return origFetch(input, init);
    const res = await origFetch(url + ".kgz", init);
    if (!res.ok || !res.body) throw new Error(`Could not download ${m[1]} (HTTP ${res.status})`);
    const name = m[1];
    totals.set(name, Number(res.headers.get("content-length") ?? 0) || (name.endsWith(".wasm") ? 22_646_446 : 4_264_344));
    const counted = res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctl) {
          done.set(name, (done.get(name) ?? 0) + chunk.byteLength);
          progress();
          ctl.enqueue(chunk);
        },
      }),
    );
    // Some servers add Content-Encoding anyway, in which case the browser already
    // decompressed it: only gunzip if the gzip magic bytes are there.
    const reader = counted.getReader();
    const first = await reader.read();
    const head = first.value ?? new Uint8Array();
    const rest = new ReadableStream<Uint8Array>({
      start(ctl) {
        if (head.byteLength) ctl.enqueue(head);
      },
      async pull(ctl) {
        const { value, done: finished } = await reader.read();
        if (finished) ctl.close();
        else ctl.enqueue(value);
      },
    });
    const gz = head[0] === 0x1f && head[1] === 0x8b;
    const body = gz ? rest.pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>) : rest;
    return new Response(body, { headers: { "Content-Type": name.endsWith(".wasm") ? "application/wasm" : "application/x-tar" } });
  };
}

function load(): Promise<ClangModule> {
  if (!loading) {
    installFetchShim();
    loading = import(/* @vite-ignore */ base + "bundle.js") as Promise<ClangModule>;
    loading.catch(() => (loading = null));
  }
  return loading;
}

async function compile(id: number, lang: CLang, code: string) {
  const mod = await load();
  const dec = new TextDecoder();
  let messages = "";
  const collect = (b: Uint8Array | null) => {
    if (b) messages += dec.decode(b, { stream: true });
  };
  const { src, rt, args } = compileArgs(lang);
  scope.postMessage({ type: "compiling", id });
  try {
    const out = await mod.runClang(args, { [src]: code, [rt]: UNBUFFER_RUNTIME }, { stdout: collect, stderr: collect });
    const wasm = out["prog.wasm"];
    scope.postMessage({ type: "compiled", id, ok: true, wasm, messages }, [wasm.buffer]);
  } catch (e) {
    if (e instanceof mod.Exit) scope.postMessage({ type: "compiled", id, ok: false, messages });
    else scope.postMessage({ type: "failed", id, message: String((e as Error)?.message ?? e) });
  }
}

scope.onmessage = (ev: MessageEvent) => {
  const msg = ev.data;
  if (msg.type === "init") {
    base = msg.base;
    load().then(
      () => scope.postMessage({ type: "ready" }),
      (e) => scope.postMessage({ type: "failed", message: String((e as Error)?.message ?? e) }),
    );
  } else if (msg.type === "compile") {
    void compile(msg.id, msg.lang, msg.code);
  }
};
