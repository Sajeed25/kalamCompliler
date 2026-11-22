import { apiUrl } from "../runners/serverRunner";
import { getAuthToken, setSession } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Small fetch wrapper for our backend's JSON API. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "offline", "offline");
  }
  if (res.status === 401 && token) setSession(null);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = data?.detail;
    const code = typeof detail === "object" && detail?.code ? detail.code : "error";
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) // FastAPI validation errors
          ? detail.map((d: { loc?: string[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? ""}: ${d.msg ?? ""}`).join("; ")
          : (detail?.message ?? res.statusText);
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}
