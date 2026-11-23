import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { EXAMPLES, localized, type CbseChapter, type Example } from "../examples";
import type { LangId } from "../languages";
import { useProgress } from "../lib/progress";
import { getJSON, setJSON } from "../lib/storage";

const CBSE_ORDER: CbseChapter[] = ["basics", "flow", "strings", "lists", "tuples", "dictionaries", "modules", "functions", "exceptions", "files", "stack"];
const CBSE_KEY = "kalam:examples:cbseOnly";

export default function ExamplesDialog({ lang, currentId, onPick, onClose }: { lang: LangId; currentId: string | null; onPick: (e: Example) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const progress = useProgress();
  const hasCbse = EXAMPLES[lang].some((e) => e.cbse);
  const [cbseOnly, setCbseOnly] = useState<boolean>(() => hasCbse && getJSON<boolean>(CBSE_KEY, false));

  const card = (e: Example) => {
    const stars = progress.stars[`${lang}/${e.id}`] ?? 0;
    return (
      <li key={e.id}>
        <button
          className="btn h-full w-full flex-col items-start text-start"
          style={e.id === currentId ? { borderColor: "var(--primary)" } : undefined}
          onClick={() => onPick(e)}
          data-testid={`example-${e.id}`}
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span>
              {e.turtle ? "🐢 " : e.input ? "⌨️ " : ""}
              {localized(e.title, i18n.language)}
            </span>
            <span className="shrink-0" aria-label={t("examples.stars", { count: stars })} title={t("examples.stars", { count: stars })}>
              {"⭐".repeat(stars)}
              <span className="opacity-30">{"☆".repeat(2 - stars)}</span>
            </span>
          </span>
          <span className="muted text-[15px] font-normal">{localized(e.about, i18n.language)}</span>
          {e.cbse && (
            <span className="mt-1 rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--info-bg)", color: "var(--link)" }} data-testid="cbse-chip">
              📘 {t("cbse.label")} · {t(`cbse.class${e.cbse.cls}`)} · {t(`cbse.chapters.${e.cbse.chapter}`)}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <Modal title={`📚 ${t("examples.title")}`} onClose={onClose} wide>
      {hasCbse && (
        <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl p-3 font-bold" style={{ background: "var(--info-bg)" }}>
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={cbseOnly}
            onChange={(e) => {
              setCbseOnly(e.target.checked);
              setJSON(CBSE_KEY, e.target.checked);
            }}
            data-testid="cbse-only"
          />
          <span>
            📘 {t("cbse.onlyCbse")}
            <span className="muted block text-sm font-normal">{t("cbse.note")}</span>
          </span>
        </label>
      )}

      {cbseOnly
        ? ([11, 12] as const).map((cls) => {
            const list = EXAMPLES[lang].filter((e) => e.cbse?.cls === cls);
            if (!list.length) return null;
            return (
              <section key={cls} className="mb-6">
                <h3 className="mb-3 text-lg font-bold">
                  📘 {t("cbse.label")} {t(`cbse.class${cls}`)}
                </h3>
                {CBSE_ORDER.map((ch) => {
                  const inChapter = list.filter((e) => e.cbse!.chapter === ch);
                  if (!inChapter.length) return null;
                  return (
                    <div key={ch} className="mb-4">
                      <h4 className="muted mb-2 font-bold">{t(`cbse.chapters.${ch}`)}</h4>
                      <ul className="grid gap-3 sm:grid-cols-2">{inChapter.map(card)}</ul>
                    </div>
                  );
                })}
              </section>
            );
          })
        : ([1, 2, 3] as const).map((level) => (
            <section key={level} className="mb-6">
              <h3 className="mb-3 text-lg font-bold">
                {t(`examples.level${level}`)} <span className="muted text-base font-normal">· {t(`examples.grades${level}`)}</span>
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">{EXAMPLES[lang].filter((e) => e.level === level).map(card)}</ul>
            </section>
          ))}
      <p className="muted text-[15px]">⭐ {t("examples.starHelp")}</p>
    </Modal>
  );
}
