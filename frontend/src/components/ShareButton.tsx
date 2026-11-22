import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { api, ApiError } from "../lib/api";
import type { LangId } from "../languages";

export default function ShareButton({ lang, code }: { lang: LangId; code: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ slug: string }>("/api/shares", { body: { language: lang, code, title: title.trim() || null } });
      setLink(`${location.origin}${location.pathname}#/s/${res.slug}`);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? t("share.tooMany") : t("share.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="btn"
        onClick={() => {
          setOpen(true);
          setLink(null);
          setCopied(false);
        }}
      >
        <span aria-hidden="true">🔗</span> {t("toolbar.share")}
      </button>
      {open && (
        <Modal title={`🔗 ${t("share.title")}`} onClose={() => setOpen(false)}>
          {!link ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <label className="mb-1 block font-bold" htmlFor="share-title">
                {t("share.nameLabel")}
              </label>
              <input id="share-title" className="field" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
              <p className="muted mt-3 text-[15px]">{t("share.help")}</p>
              {error && <p className="mt-2 font-bold" style={{ color: "var(--danger)" }}>{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "⏳" : "🔗"} {t("share.create")}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="mb-2 font-bold">{t("share.ready")}</p>
              <input className="field" readOnly value={link} onFocus={(e) => e.target.select()} data-testid="share-link" />
              <div className="mt-4 flex justify-end">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link).then(() => setCopied(true));
                  }}
                >
                  {copied ? "✅ " + t("share.copied") : "📋 " + t("share.copy")}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
