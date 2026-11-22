import type { LangId } from "../languages";
import { LANGUAGES } from "../languages";
import type { Runner } from "./types";
import { PythonRunner } from "./pythonRunner";
import { ServerRunner } from "./serverRunner";

const cache = new Map<LangId, Runner>();

/** One runner per language for the whole app (keeps Python warm between runs). */
export function getRunner(lang: LangId): Runner {
  let r = cache.get(lang);
  if (!r) {
    r = LANGUAGES[lang].engine === "pyodide" ? new PythonRunner() : new ServerRunner(lang);
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
