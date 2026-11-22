/* Kalam Compiler service worker.
 * - App files (hashed, never change): cache-first, precached on install.
 * - Python runtime (/pyodide/): cache-first, cached the first time Python is used.
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
          cache.put("./", res.clone());
          return res;
        } catch {
          return (await caches.match("./")) || Response.error();
        }
      })(),
    );
    return;
  }
  if (url.pathname.includes("/pyodide/") || url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(req, url.pathname.includes("/pyodide/") ? RUNTIME_CACHE : APP_CACHE));
  }
});
