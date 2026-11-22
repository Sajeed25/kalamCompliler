import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { api } from "../lib/api";
import type { LangId } from "../languages";
import { KalamFace } from "./Mascot";

/** Optional AI explanation of the student's code. Only shown when an admin turns it on. */
export default function ExplainCodeButton({ lang, code }: { lang: LangId; code: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const ask = async () => {
    setOpen(true);
    setText(null);
    setError(false);
    try {
      const res = await api<{ explanation: string }>("/api/ai/explain", { body: { language: lang, code, ui_language: i18n.language } });
      setText(res.explanation);
    } catch {
      setError(true);
    }
  };

  return (
    <>
      <button className="btn" onClick={() => void ask()}>
        <span aria-hidden="true">💡</span> {t("toolbar.explain")}
      </button>
      {open && (
        <Modal title={`💡 ${t("explain.title")}`} onClose={() => setOpen(false)} wide>
          <div className="flex items-start gap-3">
            <KalamFace mood={error ? "oops" : text ? "happy" : "think"} size={48} />
            <div className="min-w-0 flex-1 whitespace-pre-wrap text-[17px] leading-relaxed" aria-live="polite">
              {error ? t("explain.failed") : text ?? t("explain.thinking")}
            </div>
          </div>
          <p className="muted mt-4 text-sm">{t("explain.disclaimer")}</p>
        </Modal>
      )}
    </>
  );
}
