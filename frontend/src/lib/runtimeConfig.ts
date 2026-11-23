/**
 * Settings read when the page loads from /kalam-config.json, so a deployment can be
 * changed without rebuilding (e.g. with Hostinger's File Manager).
 *
 *   apiBase: where the Kalam backend lives. "" = same website (/api on this domain).
 *            Example for static hosting + backend on a VPS: "https://api.compile.robokalam.com"
 *   cRunner: "auto" (default) | "server" | "browser" — where C/C++ programs are compiled.
 */
export interface RuntimeConfig {
  apiBase: string;
  /** Where C/C++ run: "auto" = backend if reachable, else in the browser. */
  cRunner: "auto" | "server" | "browser";
}

let config: RuntimeConfig = { apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? "", cRunner: "auto" };

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}kalam-config.json`, { cache: "no-cache" });
    if (!res.ok) return;
    const data = (await res.json()) as Partial<RuntimeConfig>;
    if (typeof data.apiBase === "string" && data.apiBase.trim()) {
      config = { ...config, apiBase: data.apiBase.trim().replace(/\/+$/, "") };
    }
    if (data.cRunner === "server" || data.cRunner === "browser" || data.cRunner === "auto") config = { ...config, cRunner: data.cRunner };
  } catch {
    /* file missing or offline: keep the built-in default */
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return config;
}
