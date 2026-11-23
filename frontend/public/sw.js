/* Kalam Compiler service worker.
 * - App files (hashed, never change): cache-first, precached on install.
 * - Python runtime (/pyodide/) and C/C++ compiler (/clang/): cache-first, cached the first
 *   time they are used, so they download only once per device and then work offline.
 * - Pages: network-first, falling back to the cached app when offline.
 * - /api/: always network (never cached).
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const APP_CACHE = `kalam-app-${VERSION}`;
const RUNTIME_CACHE = "kalam-runtime-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await cache.add("./");
      try {
        const res = await fetch("./precache-manifest.json", { cache: "no-store" });
        const files = await res.json();
        await cache.addAll(files);
      } catch (e) {
        /* manifest missing in dev: fine */
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("kalam-app-") && key !== APP_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

/** Add the headers Python needs (COOP/COEP) when the web host can't set them itself. */
function withIsolation(res) {
  if (!res || res.status === 0 || res.type === "opaque" || res.type === "opaqueredirect") return res;
  if (res.headers.get("Cross-Origin-Embedder-Policy")) return res;
  const headers = new Headers(res.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(APP_CACHE);
          if (res.ok) cache.put("./", res.clone());
          return withIsolation(res);
        } catch {
          const cached = await caches.match("./");
          return cached ? withIsolation(cached) : Response.error();
        }
      })(),
    );
    return;
  }
  const runtime = url.pathname.includes("/pyodide/") || url.pathname.includes("/clang/");
  if (runtime || url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(req, runtime ? RUNTIME_CACHE : APP_CACHE).then(withIsolation));
  }
});
