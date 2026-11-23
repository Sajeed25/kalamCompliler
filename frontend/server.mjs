// Kalam Compiler — tiny web server for Node.js hosting (e.g. Hostinger "Web apps").
// No dependencies. Serves the built site from ./dist with the headers the app needs:
//   * COOP/COEP so Python and C/C++ can pause for typed input
//   * correct file types (wasm, mjs), gzip, long caching for hashed files
//   * /api/* -> 404 JSON: there is no Kalam backend here, so the app compiles C/C++
//     in the browser. (Set "apiBase" in dist/kalam-config.json to use a backend elsewhere.)
//
//   npm run build && npm start        (PORT defaults to 3000)
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip, constants } from "node:zlib";

const ROOT = resolve(fileURLToPath(new URL("./dist", import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".kgz": "application/octet-stream",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg", ".wasm", ".tar", ".txt"]);

const SECURITY_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
    "font-src 'self' data:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; " +
    "form-action 'self'; object-src 'none'",
};

function cacheControl(urlPath) {
  if (urlPath.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (urlPath.startsWith("/pyodide/") || urlPath.startsWith("/clang/")) return "public, max-age=2592000";
  return "no-cache";
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function fileFor(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  const full = resolve(join(ROOT, clean));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null; // no ../ tricks
  try {
    const st = statSync(full);
    if (st.isDirectory()) return fileFor(join(urlPath, "index.html"));
    return { full, st };
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  let urlPath;
  try {
    urlPath = new URL(req.url ?? "/", "http://x").pathname;
  } catch {
    return send(res, 400, { "Content-Type": "text/plain" }, "Bad request");
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { Allow: "GET, HEAD" }, "");

  if (urlPath === "/api" || urlPath.startsWith("/api/")) {
    return send(res, 404, { "Content-Type": "application/json", "Cache-Control": "no-store" }, JSON.stringify({ detail: "No Kalam backend on this server" }));
  }

  // Unknown paths get the app (it uses #/ routes, so this is only for typos and old links).
  const found = fileFor(urlPath) ?? fileFor("/index.html");
  if (!found) return send(res, 500, { "Content-Type": "text/plain" }, "Build missing: run `npm run build` first.");
  const { full, st } = found;
  const ext = extname(full).toLowerCase();
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": cacheControl(urlPath),
    ETag: etag,
    "Last-Modified": st.mtime.toUTCString(),
    Vary: "Accept-Encoding",
  };
  if (req.headers["if-none-match"] === etag) return send(res, 304, headers);

  const gzip = COMPRESSIBLE.has(ext) && st.size > 1024 && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
  if (gzip) headers["Content-Encoding"] = "gzip";
  else headers["Content-Length"] = st.size;
  res.writeHead(200, { ...SECURITY_HEADERS, ...headers });
  if (req.method === "HEAD") return res.end();
  const stream = createReadStream(full);
  stream.on("error", () => res.destroy());
  if (gzip) stream.pipe(createGzip({ level: constants.Z_DEFAULT_COMPRESSION })).pipe(res);
  else stream.pipe(res);
});

server.listen(PORT, () => console.log(`Kalam Compiler web server on port ${PORT} (serving ${ROOT})`));
