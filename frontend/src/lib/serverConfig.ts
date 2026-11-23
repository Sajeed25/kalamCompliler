import { useEffect, useState } from "react";
import { api } from "./api";

export interface ServerConfig {
  ai_enabled: boolean;
  share_enabled: boolean;
  accounts_enabled: boolean;
  executor: string;
  limits: { cpu_seconds: number; memory_mb: number; max_output_kb: number; min_seconds_between_runs: number };
}

let cached: Promise<ServerConfig | null> | null = null;
let failedAt = 0;

/**
 * Features the server has switched on. null = no Kalam backend reachable (static or
 * Node.js web hosting): Python and C/C++ still run in the browser. A failure is
 * remembered for 30 s so pages don't keep asking.
 */
export function loadServerConfig(): Promise<ServerConfig | null> {
  if (cached && (failedAt === 0 || Date.now() - failedAt < 30_000)) return cached;
  failedAt = 0;
  cached = api<ServerConfig>("/api/config").catch(() => {
    failedAt = Date.now();
    return null;
  });
  return cached;
}

export function useServerConfig(): ServerConfig | null {
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  useEffect(() => {
    let alive = true;
    void loadServerConfig().then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}
