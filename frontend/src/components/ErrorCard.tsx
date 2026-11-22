import { useTranslation } from "react-i18next";
import type { Explanation } from "../explainer/explain";
import { KalamFace } from "./Mascot";

/** Two views of a problem: a simple one for kids and the full error for experts. */
export default function ErrorCard({ exp, raw, onShowLine }: { exp: Explanation; raw: string; onShowLine?: (line: number) => void }) {
  const { t } = useTranslation();
  const isSystem = ["offline", "busy", "rate_limited", "python_load", "code_too_long"].includes(exp.id);
  return (
    <section
      className="mt-3 rounded-2xl p-4"
      style={{ background: "var(--error-bg)", border: "2px solid var(--danger)" }}
      aria-live="assertive"
      data-testid="error-card"
    >
      <div className="flex items-start gap-3">
        <KalamFace mood={isSystem ? "think" : "oops"} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">{t(isSystem ? "error.titleSystem" : "error.title")}</h3>
          <p className="mt-1 text-[17px] leading-relaxed" data-testid="error-simple">
            {t(`errors.${exp.id}`, { ...exp.params, defaultValue: t("errors.generic", exp.params) })}
          </p>
          {exp.line ? (
            <button className="btn mt-2" onClick={() => onShowLine?.(exp.line!)}>
              👉 {t("error.lookAtLine", { line: exp.line })}
            </button>
          ) : null}
        </div>
      </div>
      {raw.trim() && (
        <details className="mt-3">
          <summary className="cursor-pointer select-none rounded-lg py-2 font-bold">🧑‍💻 {t("error.full")}</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl p-3 text-sm" style={{ background: "var(--surface)", fontFamily: "var(--code-font)" }}>
            {raw}
          </pre>
        </details>
      )}
    </section>
  );
}
