import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import CodeEditor from "./CodeEditor";
import { api } from "../lib/api";
import { LANGUAGES, isLangId, type LangId } from "../languages";
import { navigate } from "../lib/router";
import { saveWorkspace, workspaceKey } from "./EditorScreen";
import { getJSON } from "../lib/storage";
import Modal from "./Modal";

interface Shared {
  language: LangId;
  code: string;
  title: string | null;
  created_at: string;
}

/** Read-only view of a shared program, with "Make a copy". */
export default function ShareView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    api<Shared>(`/api/shares/${encodeURIComponent(slug)}`)
      .then((d) => (isLangId(d.language) ? setData(d) : setError(true)))
      .catch(() => setError(true));
  }, [slug]);

  const copy = () => {
    if (!data) return;
    saveWorkspace(workspaceKey(data.language), { code: data.code, exampleId: null });
    navigate(`/code/${data.language}`);
  };

  const tryCopy = () => {
    if (!data) return;
    const existing = getJSON<{ code?: string; exampleId?: string | null } | null>(workspaceKey(data.language), null);
    if (existing?.code && !existing.exampleId) setConfirm(true);
    else copy();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header>
        {data && (
          <span className="truncate text-lg font-bold">
            {LANGUAGES[data.language].emoji} {data.title || t("share.untitled")}
          </span>
        )}
      </Header>
      {error && <p className="p-8 text-center text-lg" role="alert">{t("share.notFound")}</p>}
      {!data && !error && <p className="p-8 text-center">⏳ {t("common.loading")}</p>}
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            <span className="rounded-xl px-3 py-2 font-bold" style={{ background: "var(--tip-bg)" }}>
              👀 {t("share.readOnly")}
            </span>
            <button className="btn btn-primary text-lg" onClick={tryCopy} data-testid="make-copy">
              📋 {t("share.makeCopy")}
            </button>
          </div>
          <main className="min-h-0 flex-1 p-4">
            <div className="h-full min-h-[50vh] overflow-hidden rounded-2xl" style={{ border: "3px solid var(--border)" }}>
              <CodeEditor value={data.code} lang={data.language} onChange={() => {}} readOnly ariaLabel={t("share.readOnly")} />
            </div>
          </main>
        </>
      )}
      {confirm && (
        <Modal title={t("share.replaceTitle")} onClose={() => setConfirm(false)}>
          <p className="mb-4">{t("share.replaceText")}</p>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={copy}>
              {t("share.makeCopy")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
