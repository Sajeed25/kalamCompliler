// Copies the in-browser runtimes from node_modules into public/ so they are
// self-hosted (no CDN, no third-party requests, works on school intranets):
//   public/pyodide/  Python (Pyodide, MPL-2.0)
//   public/clang/    C/C++ compiler (YoWASP Clang/LLD, ISC + LLVM Apache-2.0 WITH LLVM-exception)
import { cpSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { gzipSync, constants } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copy(pkgDir, files, destName) {
  const src = join(root, "node_modules", ...pkgDir.split("/"));
  const dest = join(root, "public", destName);
  if (!existsSync(src)) {
    console.warn(`[copy-runtimes] ${pkgDir} not installed yet, skipping`);
    return;
  }
  mkdirSync(dest, { recursive: true });
  for (const f of files(src)) cpSync(join(src, f), join(dest, f.split("/").pop()));
  console.log(`[copy-runtimes] ${pkgDir} -> public/${destName}`);
}

copy("pyodide", () => ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"], "pyodide");
copy("@yowasp/clang", (src) => readdirSync(join(src, "gen")).filter((f) => /\.(js|wasm|tar)$/.test(f)).map((f) => `gen/${f}`), "clang");

// The compiler is ~100 MB raw. Ship the two big files pre-compressed (~27 MB) with an
// extension no web server recognises, so the download is small on *any* host; the
// browser decompresses them (frontend/src/runners/clang/compile.worker.ts).
const clangDir = join(root, "public", "clang");
for (const f of ["llvm.core.wasm", "llvm-resources.tar"]) {
  const raw = join(clangDir, f);
  const packed = raw + ".kgz";
  if (!existsSync(raw)) continue;
  if (!existsSync(packed) || statSync(packed).mtimeMs < statSync(raw).mtimeMs) {
    writeFileSync(packed, gzipSync(readFileSync(raw), { level: constants.Z_BEST_COMPRESSION }));
  }
  rmSync(raw);
}
console.log("[copy-runtimes] compressed clang files to .kgz");
