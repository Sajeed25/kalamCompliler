import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { EXAMPLES, localized, type Example } from "../examples";
import type { LangId } from "../languages";
import { useProgress } from "../lib/progress";

export default function ExamplesDialog({ lang, currentId, onPick, onClose }: { lang: LangId; currentId: string | null; onPick: (e: Example) => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const progress = useProgress();
  const levels = [1, 2, 3] as const;
  return (
    <Modal title={`📚 ${t("examples.title")}`} onClose={onClose} wide>
      {levels.map((level) => (
        <section key={level} className="mb-6">
          <h3 className="mb-3 text-lg font-bold">
            {t(`examples.level${level}`)} <span className="muted text-base font-normal">· {t(`examples.grades${level}`)}</span>
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {EXAMPLES[lang]
              .filter((e) => e.level === level)
              .map((e) => {
                const stars = progress.stars[`${lang}/${e.id}`] ?? 0;
                return (
                  <li key={e.id}>
                    <button
                      className="btn h-full w-full flex-col items-start text-left"
                      style={e.id === currentId ? { borderColor: "var(--primary)" } : undefined}
                      onClick={() => onPick(e)}
                      data-testid={`example-${e.id}`}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span>
                          {e.turtle ? "🐢 " : e.input ? "⌨️ " : ""}
                          {localized(e.title, i18n.language)}
                        </span>
                        <span aria-label={t("examples.stars", { count: stars })} title={t("examples.stars", { count: stars })}>
                          {"⭐".repeat(stars)}
                          <span className="opacity-30">{"☆".repeat(2 - stars)}</span>
                        </span>
                      </span>
                      <span className="muted text-[15px] font-normal">{localized(e.about, i18n.language)}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <p className="muted text-[15px]">⭐ {t("examples.starHelp")}</p>
    </Modal>
  );
}
