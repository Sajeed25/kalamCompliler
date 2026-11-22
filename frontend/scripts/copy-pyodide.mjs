// Copies the Pyodide runtime from node_modules into public/pyodide so it is
// self-hosted (no CDN, no third-party requests, works on school intranets).
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pyodide");
const dest = join(root, "public", "pyodide");
const files = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];
if (!existsSync(src)) {
  console.warn("[copy-pyodide] pyodide not installed yet, skipping");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) cpSync(join(src, f), join(dest, f));
console.log(`[copy-pyodide] copied ${files.length} files to public/pyodide`);
