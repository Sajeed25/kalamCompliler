import type { LangId } from "../languages";
import { LANGUAGES } from "../languages";
import type { Runner } from "./types";
import { PythonRunner } from "./pythonRunner";
import { ServerRunner } from "./serverRunner";
import { BrowserCRunner } from "./browserCRunner";
import { getRuntimeConfig } from "../lib/runtimeConfig";
import { loadServerConfig } from "../lib/serverConfig";
import type { RunEvent, RunResult } from "./types";

/**
 * C/C++: use the Kalam backend when there is one, otherwise compile in the browser.
 * kalam-config.json can force either with "cRunner": "server" | "browser" (default "auto").
 */
class AutoCRunner implements Runner {
  private server: ServerRunner;
  private browser: BrowserCRunner;
  private active: Runner | null = null;

  constructor(lang: "c" | "cpp") {
    this.server = new ServerRunner(lang);
    this.browser = new BrowserCRunner(lang);
  }

  private async pick(): Promise<Runner> {
    const mode = getRuntimeConfig().cRunner;
    if (mode === "browser") return this.browser;
    if (mode === "server") return this.server;
    return (await loadServerConfig()) ? this.server : this.browser;
  }

  preload(): void {
    void this.pick().then((r) => {
      // Only start the ~27 MB compiler download when it will really be used, and not on data-saver.
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (r === this.browser && conn?.saveData) return;
      r.preload();
    });
  }

  async run(code: string, onEvent: (e: RunEvent) => void): Promise<RunResult> {
    onEvent({ type: "status", status: "loading" });
    this.active = await this.pick();
    return this.active.run(code, onEvent);
  }

  sendInput(line: string): void {
    this.active?.sendInput(line);
  }

  stop(): void {
    this.active?.stop();
  }
}

const cache = new Map<LangId, Runner>();

/** One runner per language for the whole app (keeps Python warm between runs). */
export function getRunner(lang: LangId): Runner {
  let r = cache.get(lang);
  if (!r) {
    r = LANGUAGES[lang].engine === "pyodide" ? new PythonRunner() : new AutoCRunner(lang as "c" | "cpp");
    cache.set(lang, r);
  }
  return r;
}

/** Start downloading Python in the background, unless the user asked to save data. */
export function preloadPythonWhenIdle(): void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return;
  if (!PythonRunner.supported()) return;
  const go = () => getRunner("python").preload();
  if ("requestIdleCallback" in window) (window as Window & { requestIdleCallback: (cb: () => void, o?: object) => void }).requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}

export type { Runner, RunEvent, RunResult, ProgramError } from "./types";
