import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { KalamFace } from "./Mascot";

const RELOAD_KEY = "kalam:chunk-reload";

/** After a new deployment, old pages may ask for files that no longer exist. */
export function isStaleBuildError(e: unknown): boolean {
  const msg = String((e as Error)?.message ?? e);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i.test(msg);
}

/** Reload once to pick up the new files; never loops. Returns true if a reload started. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

function CrashScreen({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
      <KalamFace mood="oops" size={88} />
      <h1 className="brand-title text-2xl">{t("crash.title")}</h1>
      <p className="text-lg">{t("crash.text")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary text-lg" onClick={() => location.reload()}>
          🔄 {t("crash.reload")}
        </button>
        <a className="btn text-lg" href="#/" onClick={() => setTimeout(() => location.reload(), 0)}>
          🏠 {t("crash.home")}
        </a>
      </div>
      <details className="w-full text-start">
        <summary className="cursor-pointer font-bold">🧑‍💻 {t("crash.details")}</summary>
        <pre dir="ltr" className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl p-3 text-sm" style={{ background: "var(--surface)" }}>
          {String(error?.stack ?? error)}
        </pre>
      </details>
    </main>
  );
}

/** Shows a friendly screen instead of a blank page if anything fails while drawing. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Kalam screen crashed:", error, info.componentStack);
    if (isStaleBuildError(error)) reloadForNewBuild();
  }

  render() {
    return this.state.error ? <CrashScreen error={this.state.error} /> : this.props.children;
  }
}
