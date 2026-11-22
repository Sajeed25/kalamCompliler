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

/** Features the server has switched on. null = server not reachable (Python still works). */
export function loadServerConfig(): Promise<ServerConfig | null> {
  if (!cached) cached = api<ServerConfig>("/api/config").catch(() => {
    cached = null; // try again next time
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
