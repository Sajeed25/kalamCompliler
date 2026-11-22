import { useSyncExternalStore } from "react";

/** Tiny hash router: "#/code/python" -> ["code", "python"]. Works on any static host. */
function current(): string {
  return location.hash.replace(/^#\/?/, "");
}

export function useRoute(): string[] {
  const hash = useSyncExternalStore(
    (cb) => {
      window.addEventListener("hashchange", cb);
      return () => window.removeEventListener("hashchange", cb);
    },
    current,
  );
  return hash.split("?")[0].split("/").filter(Boolean).map(decodeURIComponent);
}

export function navigate(path: string): void {
  location.hash = "#/" + path.replace(/^\//, "");
}

export function routeQuery(): URLSearchParams {
  return new URLSearchParams(current().split("?")[1] ?? "");
}
