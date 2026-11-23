import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import CodeEditor from "./CodeEditor";
import OutputPanel, { type RunStatus, type Segment } from "./OutputPanel";
import TurtleCanvas, { type TurtleCanvasHandle } from "./TurtleCanvas";
import ErrorCard from "./ErrorCard";
import ExamplesDialog from "./ExamplesDialog";
import Modal from "./Modal";
import Mascot from "./Mascot";
import ShareButton from "./ShareButton";
import ExplainCodeButton from "./ExplainCodeButton";
import { LANGUAGES, langFromFileName, type LangId } from "../languages";
import { getRunner, type RunResult } from "../runners";
import { explainError, explainWarnings, type Explanation } from "../explainer/explain";
import { EXAMPLES, getExample, localized, type Example } from "../examples";
import { getJSON, setJSON } from "../lib/storage";
import { downloadText, cleanFileName, MAX_OPEN_BYTES } from "../lib/files";
import { CLIENT_LIMITS } from "../config";
import { recordRun, BADGES, type BadgeId } from "../lib/progress";
import { useSettings } from "../lib/settings";
import { navigate } from "../lib/router";
import { useServerConfig } from "../lib/serverConfig";

interface Workspace {
  code: string;
  exampleId: string | null;
  savedAt?: number;
}

export function workspaceKey(lang: LangId): string {
  return `kalam:code:${lang}`;
}

export function saveWorkspace(key: string, ws: Workspace): void {
  setJSON(key, { ...ws, savedAt: Date.now() });
}

interface Props {
  lang: LangId;
  /** localStorage key for autosave. */
  storageKey?: string;
  /** Code to start with when nothing is saved yet. */
  starterCode?: string;
  /** Extra panel shown above the output (e.g. assignment instructions). */
  sidePanel?: (api: { code: string }) => ReactNode;
  /** Hide the examples library (assignments). */
  hideExamples?: boolean;
  headerExtra?: ReactNode;
}

export default function EditorScreen({ lang, storageKey, starterCode, sidePanel, hideExamples, headerExtra }: Props) {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const serverCfg = useServerConfig();
  const info = LANGUAGES[lang];
  const key = storageKey ?? workspaceKey(lang);

  const initial = useMemo<Workspace>(() => {
    const saved = getJSON<Workspace | null>(key, null);
    if (saved?.code != null) return saved;
    if (starterCode != null) return { code: starterCode, exampleId: null };
    const ex = EXAMPLES[lang][0];
    return { code: ex.code, exampleId: ex.id };
  }, [key, lang, starterCode]);

  const [code, setCode] = useState(initial.code);
  const [exampleId, setExampleId] = useState<string | null>(initial.exampleId);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [waiting, setWaiting] = useState(false);
  const [inputAlwaysOpen, setInputAlwaysOpen] = useState(false);
  const [explanation, setExplanation] = useState<{ exp: Explanation; raw: string } | null>(null);
  const [warnings, setWarnings] = useState<Explanation[]>([]);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [timeMs, setTimeMs] = useState<number | undefined>();
  const [showTurtle, setShowTurtle] = useState(false);
  const [longRunning, setLongRunning] = useState(false);
  const [dialog, setDialog] = useState<null | "examples" | "save" | "reset" | "replace">(null);
  const [pendingExample, setPendingExample] = useState<Example | null>(null);
  const [fileName, setFileName] = useState("my_program");
  const [savedFlash, setSavedFlash] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeId[]>([]);
  const [mobileTab, setMobileTab] = useState<"code" | "output">("code");
  const [download, setDownload] = useState<{ loaded: number; total: number } | null>(null);

  const turtleRef = useRef<TurtleCanvasHandle>(null);
  const outChars = useRef(0);
  const runningRef = useRef(false);
  const lastFailed = useRef(false);
  const usedInput = useRef(false);
  const usedTurtle = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const runner = getRunner(lang);

  const example = exampleId ? EXAMPLES[lang].find((e) => e.id === exampleId) ?? null : null;
  const changedFromExample = example ? example.code.trim() !== code.trim() : true;
  const running = status === "loading" || status === "compiling" || status === "running" || status === "waiting";

  // Reset state when switching language/workspace.
  useEffect(() => {
    setCode(initial.code);
    setExampleId(initial.exampleId);
    setSegments([]);
    setStatus("idle");
    setExplanation(null);
    setWarnings([]);
    setErrorLine(null);
    setShowTurtle(false);
    runner.preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Autosave (debounced).
  useEffect(() => {
    const id = window.setTimeout(() => saveWorkspace(key, { code, exampleId }), 400);
    return () => window.clearTimeout(id);
  }, [code, exampleId, key]);

  const append = useCallback((k: Segment["k"], text: string) => {
    if (!text) return;
    setSegments((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.k === k) return [...prev.slice(0, -1), { k, t: last.t + text }];
      return [...prev, { k, t: text }];
    });
  }, []);

  const stop = useCallback(() => {
    runner.stop();
    turtleRef.current?.finishNow();
  }, [runner]);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setSegments([]);
    setExplanation(null);
    setWarnings([]);
    setErrorLine(null);
    setTimeMs(undefined);
    setWaiting(false);
    setInputAlwaysOpen(false);
    setLongRunning(false);
    setNewBadges([]);
    setDownload(null);
    setMobileTab("output");
    outChars.current = 0;
    usedInput.current = false;
    usedTurtle.current = false;
    const wantsTurtle = lang === "python" && /\bturtle\b/.test(code);
    setShowTurtle(wantsTurtle);
    turtleRef.current?.reset();

    const longTimer = window.setTimeout(() => setLongRunning(true), CLIENT_LIMITS.longRunHintSeconds * 1000);
    let outputLimitHit = false;

    const result: RunResult = await runner.run(code, (e) => {
      switch (e.type) {
        case "status":
          setStatus(e.status);
          if (e.status !== "loading") setDownload(null);
          break;
        case "progress":
          setDownload({ loaded: e.loaded, total: e.total });
          break;
        case "stdout":
        case "stderr": {
          outChars.current += e.text.length;
          if (outChars.current > CLIENT_LIMITS.maxOutputChars) {
            if (!outputLimitHit) {
              outputLimitHit = true;
              runner.stop();
            }
            return;
          }
          append(e.type === "stdout" ? "out" : "err", e.text);
          setWaiting(false);
          setStatus((s) => (s === "waiting" ? "running" : s));
          break;
        }
        case "input-request":
          usedInput.current = true;
          if (lang === "python" || e.type === "input-request") {
            setWaiting(true);
            setStatus("waiting");
          }
          if (lang !== "python") setInputAlwaysOpen(true);
          window.clearTimeout(longTimer);
          setLongRunning(false);
          break;
        case "turtle":
          usedTurtle.current = true;
          setShowTurtle(true);
          if (settings.fastTurtle) {
            turtleRef.current?.push(e.ops.map((op) => ("v" in op && op.o === "speed" ? { ...op, v: 0 } : op)));
          } else turtleRef.current?.push(e.ops);
          break;
      }
    });

    window.clearTimeout(longTimer);
    runningRef.current = false;
    setDownload(null);
    setWaiting(false);
    setInputAlwaysOpen(false);
    setLongRunning(false);
    setTimeMs(result.timeMs);

    let finalResult = result;
    if (outputLimitHit) {
      finalResult = { ok: false, error: { kind: "output-limit", message: "output limit", raw: `Output was longer than ${CLIENT_LIMITS.maxOutputChars} characters.` } };
    }
    const compileWarnings = (result as RunResult & { warnings?: string }).warnings;
    if (compileWarnings) setWarnings(explainWarnings(compileWarnings));

    if (finalResult.ok) {
      setStatus("done");
      const earned = recordRun({
        lang,
        ok: true,
        exampleId,
        changed: changedFromExample,
        usedTurtle: usedTurtle.current,
        usedInput: usedInput.current,
        previousFailed: lastFailed.current,
      });
      setNewBadges(earned);
      lastFailed.current = false;
    } else if (finalResult.stopped) {
      setStatus("stopped");
      append("sys", `\n${t("output.stoppedNote")}\n`);
    } else if (finalResult.error) {
      setStatus("error");
      const exp = explainError(lang, finalResult.error, code);
      setExplanation({ exp, raw: finalResult.error.raw || finalResult.error.message });
      if (exp.line) setErrorLine(exp.line);
      lastFailed.current = finalResult.error.kind !== "system";
      recordRun({ lang, ok: false, exampleId, changed: changedFromExample, usedTurtle: false, usedInput: false, previousFailed: false });
    }
  }, [append, changedFromExample, code, exampleId, lang, runner, settings.fastTurtle, t]);

  const sendInput = (line: string) => {
    append("in", line + "\n");
    setWaiting(false);
    setStatus("running");
    runner.sendInput(line);
  };

  const clearOutput = () => {
    if (running) return;
    setSegments([]);
    setExplanation(null);
    setWarnings([]);
    setErrorLine(null);
    setStatus("idle");
    setShowTurtle(false);
    setNewBadges([]);
    turtleRef.current?.reset();
  };

  const loadExample = (ex: Example) => {
    setCode(ex.code);
    setExampleId(ex.id);
    clearOutput();
    setDialog(null);
    setPendingExample(null);
  };

  const pickExample = (ex: Example) => {
    if (changedFromExample && code.trim() !== "") {
      setPendingExample(ex);
      setDialog("replace");
    } else loadExample(ex);
  };

  const openFile = async (file: File) => {
    if (file.size > MAX_OPEN_BYTES) {
      alert(t("files.tooBig"));
      return;
    }
    const text = await file.text();
    const fileLang = langFromFileName(file.name) ?? lang;
    if (fileLang !== lang && !storageKey) {
      saveWorkspace(workspaceKey(fileLang), { code: text, exampleId: null });
      navigate(`/code/${fileLang}`);
      return;
    }
    setCode(text);
    setExampleId(null);
    setFileName(cleanFileName(file.name));
    clearOutput();
  };

  useEffect(() => {
    // Ctrl+Enter anywhere on the page (not just inside the editor), Escape to stop.
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  useEffect(() => () => runner.stop(), [runner]);

  const mascot = useMemo(() => {
    if (status === "done") return { mood: "party" as const, text: t("mascot.success") };
    if (status === "error") return { mood: "think" as const, text: t("mascot.error") };
    if (status === "waiting") return { mood: "happy" as const, text: t("mascot.waiting") };
    return null;
  }, [status, t]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("toolbar.label")}>
      {running ? (
        <button className="btn btn-stop text-lg" onClick={stop} data-testid="stop-button">
          <span aria-hidden="true">⏹</span> {t("toolbar.stop")}
        </button>
      ) : (
        <button className="btn btn-run text-lg" onClick={() => void run()} data-testid="run-button" title="Ctrl + Enter">
          <span aria-hidden="true">▶</span> {t("toolbar.run")}
        </button>
      )}
      <button className="btn" onClick={clearOutput} disabled={running}>
        <span aria-hidden="true">🧹</span> {t("toolbar.clear")}
      </button>
      {!hideExamples && (
        <button className="btn" onClick={() => setDialog("examples")} data-testid="examples-button">
          <span aria-hidden="true">📚</span> {t("toolbar.examples")}
        </button>
      )}
      <button className="btn" onClick={() => setDialog("save")}>
        <span aria-hidden="true">💾</span> {t("toolbar.save")}
      </button>
      <button className="btn" onClick={() => fileInput.current?.click()}>
        <span aria-hidden="true">📂</span> {t("toolbar.open")}
      </button>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept={info.openExts.map((e) => "." + e).join(",") + ",.py,.c,.cpp"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openFile(f);
          e.target.value = "";
        }}
      />
      {(example || starterCode != null) && (
        <button className="btn" onClick={() => setDialog("reset")} disabled={!changedFromExample && !!example}>
          <span aria-hidden="true">↺</span> {t(example ? "toolbar.reset" : "toolbar.resetStarter")}
        </button>
      )}
      {serverCfg?.share_enabled && <ShareButton lang={lang} code={code} />}
      {serverCfg?.ai_enabled && <ExplainCodeButton lang={lang} code={code} />}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header>
        <span className="flex items-center gap-2 rounded-xl px-3 py-1 text-lg font-bold" style={{ background: "var(--surface-2)" }}>
          <span aria-hidden="true">{info.emoji}</span>
          {info.name}
        </span>
        {example && !storageKey && (
          <span className="muted hidden truncate md:inline" data-testid="example-title">
            📄 {localized(example.title, i18n.language)}
          </span>
        )}
        {headerExtra}
      </Header>

      <div className="px-3 pt-3 sm:px-4">{toolbar}</div>

      {/* On small screens: tabs to switch between code and output. */}
      <div className="flex gap-2 px-3 pt-3 lg:hidden" role="tablist">
        <button role="tab" aria-selected={mobileTab === "code"} className={`btn flex-1 ${mobileTab === "code" ? "btn-primary" : ""}`} onClick={() => setMobileTab("code")}>
          ✏️ {t("layout.code")}
        </button>
        <button role="tab" aria-selected={mobileTab === "output"} className={`btn flex-1 ${mobileTab === "output" ? "btn-primary" : ""}`} onClick={() => setMobileTab("output")}>
          📺 {t("layout.output")}
          {status === "waiting" && <span aria-hidden="true"> ⌨️</span>}
          {status === "error" && <span aria-hidden="true"> ❗</span>}
        </button>
      </div>

      <main className="grid min-h-0 flex-1 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section
          className={`${mobileTab === "code" ? "flex" : "hidden"} min-h-[45vh] flex-col overflow-hidden rounded-2xl lg:flex lg:min-h-0`}
          style={{ border: "3px solid var(--border)" }}
          aria-label={t("editor.label")}
        >
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={code}
              lang={lang}
              onChange={setCode}
              onRun={() => void run()}
              errorLine={errorLine}
              ariaLabel={t("editor.aria", { lang: info.name })}
            />
          </div>
          <div className="muted flex items-center justify-between gap-2 px-3 py-1 text-sm" style={{ background: "var(--editor-gutter-bg)" }}>
            <span>{t("editor.autosaved")} ✓</span>
            <span className="hidden sm:inline">{t("editor.shortcut")}</span>
          </div>
        </section>

        <div className={`${mobileTab === "output" ? "flex" : "hidden"} min-h-[45vh] flex-col gap-3 lg:flex lg:min-h-0`}>
          {sidePanel?.({ code })}
          <div className="min-h-0 flex-1">
            <OutputPanel
              segments={segments}
              status={status}
              waitingForInput={waiting}
              inputAlwaysOpen={inputAlwaysOpen}
              onSubmitInput={sendInput}
              timeMs={timeMs}
              longRunning={longRunning}
              onStop={stop}
            >
              {download && status === "loading" && (
                <div className="mb-3 rounded-xl p-3" style={{ background: "var(--tip-bg)" }} role="status" data-testid="download-progress">
                  <div className="mb-2">
                    📦 {t("output.downloadingCompiler", { percent: Math.min(100, Math.round((download.loaded / Math.max(1, download.total)) * 100)), mb: Math.round(download.total / 1e6) })}
                  </div>
                  <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, (download.loaded / Math.max(1, download.total)) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className={showTurtle ? "mt-3" : "hidden"}>
                <TurtleCanvas ref={turtleRef} label={t("output.turtleCanvas")} />
              </div>
              {explanation && (
                <ErrorCard
                  exp={explanation.exp}
                  raw={explanation.raw}
                  onShowLine={(line) => {
                    setErrorLine(null);
                    setMobileTab("code");
                    requestAnimationFrame(() => setErrorLine(line));
                  }}
                />
              )}
              {warnings.map((w, i) => (
                <div key={i} className="mt-3 rounded-xl p-3" style={{ background: "var(--tip-bg)" }}>
                  💡 {t(`errors.${w.id}`, w.params)} {w.line ? <span className="muted">({t("error.line", { line: w.line })})</span> : null}
                </div>
              ))}
              {newBadges.length > 0 && (
                <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--success-bg)" }} role="status" data-testid="badge-toast">
                  <strong>🏅 {t("badges.newBadge")}</strong>{" "}
                  {newBadges.map((b) => (
                    <span key={b} className="mr-2 inline-block">
                      {BADGES.find((x) => x.id === b)?.emoji} {t(`badges.items.${b}.name`)}
                    </span>
                  ))}
                </div>
              )}
              {mascot && (
                <div className="mt-4">
                  <Mascot text={mascot.text} mood={mascot.mood} />
                </div>
              )}
            </OutputPanel>
          </div>
        </div>
      </main>

      {dialog === "examples" && <ExamplesDialog lang={lang} currentId={exampleId} onPick={pickExample} onClose={() => setDialog(null)} />}

      {dialog === "replace" && pendingExample && (
        <Modal title={t("examples.replaceTitle")} onClose={() => setDialog(null)}>
          <p className="mb-4">{t("examples.replaceText")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn" onClick={() => setDialog(null)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn"
              onClick={() => {
                downloadText(`${cleanFileName(fileName)}.${info.ext}`, code);
                loadExample(pendingExample);
              }}
            >
              💾 {t("examples.saveThenOpen")}
            </button>
            <button className="btn btn-primary" onClick={() => loadExample(pendingExample)} data-testid="confirm-replace">
              {t("examples.openAnyway")}
            </button>
          </div>
        </Modal>
      )}

      {dialog === "reset" && (
        <Modal title={t("reset.title")} onClose={() => setDialog(null)}>
          <p className="mb-4">{t("reset.text")}</p>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setDialog(null)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (example) loadExample(getExample(lang, exampleId));
                else if (starterCode != null) {
                  setCode(starterCode);
                  clearOutput();
                  setDialog(null);
                }
              }}
            >
              ↺ {t("reset.confirm")}
            </button>
          </div>
        </Modal>
      )}

      {dialog === "save" && (
        <Modal title={`💾 ${t("files.saveTitle")}`} onClose={() => setDialog(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              downloadText(`${cleanFileName(fileName)}.${info.ext}`, code);
              setSavedFlash(true);
              setTimeout(() => setSavedFlash(false), 2500);
              setDialog(null);
            }}
          >
            <label htmlFor="file-name" className="mb-1 block font-bold">
              {t("files.nameLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input id="file-name" className="field" value={fileName} onChange={(e) => setFileName(e.target.value)} autoFocus />
              <span className="font-bold">.{info.ext}</span>
            </div>
            <p className="muted mt-3 text-[15px]">{t("files.saveHelp")}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setDialog(null)}>
                {t("common.cancel")}
              </button>
              <button type="submit" className="btn btn-primary">
                ⬇️ {t("files.download")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {savedFlash && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 font-bold shadow-lg" style={{ background: "var(--success-bg)" }} role="status">
          ✅ {t("files.saved")}
        </div>
      )}
    </div>
  );
}
