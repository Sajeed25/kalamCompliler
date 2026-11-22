/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

const BUILD_ID = Date.now().toString(36);

/** Writes precache-manifest.json listing the built JS/CSS so the service worker can cache them. */
function precacheManifest(): Plugin {
  return {
    name: "kalam-precache-manifest",
    apply: "build",
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => /\.(js|css|svg)$/.test(f) && !f.endsWith(".map"));
      this.emitFile({ type: "asset", fileName: "precache-manifest.json", source: JSON.stringify(files.map((f) => "./" + f)) });
    },
  };
}

// Cross-origin isolation is required for SharedArrayBuffer, which lets the
// Python worker pause on input() / time.sleep() and lets "Stop" interrupt it.
// Production nginx sets the same two headers (see /deploy/nginx.conf).
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), tailwindcss(), precacheManifest()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: process.env.VITE_BASE ?? "/",
  server: {
    headers: isolationHeaders,
    proxy: { "/api": { target: "http://localhost:8000", ws: true } },
  },
  preview: { headers: isolationHeaders, proxy: { "/api": { target: "http://localhost:8000", ws: true } } },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["pyodide"] },
  test: { include: ["src/**/*.test.ts"] },
});
