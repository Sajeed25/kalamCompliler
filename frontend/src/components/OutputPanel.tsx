import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface Segment {
  k: "out" | "err" | "in" | "sys";
  t: string;
}

export type RunStatus = "idle" | "loading" | "compiling" | "running" | "waiting" | "done" | "error" | "stopped";

interface Props {
  segments: Segment[];
  status: RunStatus;
  waitingForInput: boolean;
  /** For C/C++ on servers that can't detect input waits: keep the box open while running. */
  inputAlwaysOpen: boolean;
  onSubmitInput: (line: string) => void;
  timeMs?: number;
  children?: ReactNode; // turtle canvas, error card, celebrations
  longRunning: boolean;
  onStop: () => void;
}

const STATUS_EMOJI: Record<RunStatus, string> = {
  idle: "😊",
  loading: "⏳",
  compiling: "🛠️",
  running: "🏃",
  waiting: "⌨️",
  done: "✅",
  error: "🤔",
  stopped: "⏹️",
};

export default function OutputPanel({ segments, status, waitingForInput, inputAlwaysOpen, onSubmitInput, timeMs, children, longRunning, onStop }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showInput = waitingForInput || (inputAlwaysOpen && (status === "running" || status === "waiting"));

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [segments, showInput, children]);

  useEffect(() => {
    if (waitingForInput) inputRef.current?.focus({ preventScroll: true });
  }, [waitingForInput]);

  const submit = () => {
    onSubmitInput(value);
    setValue("");
  };

  const empty = segments.length === 0 && status === "idle";

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl" style={{ background: "var(--surface)", border: "3px solid var(--border)" }} aria-labelledby="output-title">
      <div className="flex items-center justify-between gap-2 px-4 py-2" style={{ borderBottom: "2px solid var(--border)" }}>
        <h2 id="output-title" className="text-lg font-bold">
          📺 {t("output.title")}
        </h2>
        <div className="flex items-center gap-2 text-[15px] font-bold" role="status" aria-live="polite" data-testid="run-status">
          <span aria-hidden="true">{STATUS_EMOJI[status]}</span>
          <span>{t(`status.${status}`)}</span>
          {status === "done" && timeMs != null && <span className="muted font-normal">({(timeMs / 1000).toFixed(1)}s)</span>}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto p-4"
        style={{ background: "var(--screen-bg)", color: "var(--screen-fg)", borderRadius: "0 0 14px 14px" }}
      >
        {empty && <p className="muted text-[16px]">{t("output.empty")}</p>}
        {segments.length > 0 && (
          <pre
            dir="ltr"
            className="whitespace-pre-wrap break-words text-left leading-relaxed"
            style={{ fontFamily: "var(--code-font)", fontSize: "calc(var(--code-font-size) * 0.95)" }}
            data-testid="output-text"
            aria-live="polite"
          >
            {segments.map((s, i) => (
              <span
                key={i}
                className={s.k === "in" ? "font-bold" : s.k === "sys" ? "italic" : undefined}
                style={{
                  color: s.k === "in" ? "var(--screen-input)" : s.k === "err" ? "var(--screen-err)" : s.k === "sys" ? "var(--muted)" : undefined,
                }}
              >
                {s.t}
              </span>
            ))}
          </pre>
        )}
        {showInput && (
          <form
            className="mt-2 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="program-input" className="sr-only">
              {t("output.inputLabel")}
            </label>
            <input
              ref={inputRef}
              id="program-input"
              dir="auto"
              data-testid="program-input"
              className="field min-w-0 flex-1"
              style={{ fontFamily: "var(--code-font)", fontSize: "var(--code-font-size)", borderColor: "var(--screen-input)", borderWidth: 3 }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("output.inputPlaceholder")}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
            />
            <button type="submit" className="btn btn-primary">
              ⏎ {t("output.send")}
            </button>
          </form>
        )}
        {longRunning && (status === "running" || status === "compiling") && !waitingForInput && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl p-3" style={{ background: "var(--tip-bg)" }} role="status">
            <span>🔁 {t("output.longRunning")}</span>
            <button className="btn btn-stop" onClick={onStop}>
              ⏹ {t("toolbar.stop")}
            </button>
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
