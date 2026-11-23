/**
 * Settings read when the page loads from /kalam-config.json, so a deployment can be
 * changed without rebuilding (e.g. with Hostinger's File Manager).
 *
 *   apiBase: where the Kalam backend lives. "" = same website (/api on this domain).
 *            Example for static hosting + backend on a VPS: "https://api.compile.robokalam.com"
 */
export interface RuntimeConfig {
  apiBase: string;
}

let config: RuntimeConfig = { apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? "" };

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}kalam-config.json`, { cache: "no-cache" });
    if (!res.ok) return;
    const data = (await res.json()) as Partial<RuntimeConfig>;
    if (typeof data.apiBase === "string" && data.apiBase.trim()) {
      config = { ...config, apiBase: data.apiBase.trim().replace(/\/+$/, "") };
    }
  } catch {
    /* file missing or offline: keep the built-in default */
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return config;
}
