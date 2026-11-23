import { useTranslation } from "react-i18next";
import Header from "./Header";
import { BADGES, starCount, useProgress } from "../lib/progress";
import { EXAMPLES } from "../examples";
import { LANGUAGES, LANG_IDS } from "../languages";
import { KalamFace } from "./Mascot";

/** The student's own stars and badges. No leaderboards, no comparison with others. */
export default function BadgesScreen() {
  const { t } = useTranslation();
  const progress = useProgress();
  const stars = starCount();
  const earned = BADGES.filter((b) => progress.badges[b.id]).length;

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <KalamFace size={64} mood="party" />
          <div>
            <h1 className="brand-title text-3xl">🏅 {t("badges.title")}</h1>
            <p className="muted text-lg">{t("badges.summary", { stars, badges: earned, total: BADGES.length })}</p>
          </div>
        </div>

        <h2 className="mb-3 text-xl font-bold">⭐ {t("badges.levels")}</h2>
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {LANG_IDS.map((lang) => (
            <div key={lang} className="card p-4">
              <h3 className="mb-2 text-lg font-bold">
                {LANGUAGES[lang].emoji} <span dir="ltr">{LANGUAGES[lang].name}</span>
              </h3>
              {[1, 2, 3].map((level) => {
                const ex = EXAMPLES[lang].filter((e) => e.level === level && !e.cbse);
                const got = ex.reduce((n, e) => n + (progress.stars[`${lang}/${e.id}`] ?? 0), 0);
                const max = ex.length * 2;
                return (
                  <div key={level} className="mb-2">
                    <div className="flex justify-between text-[15px]">
                      <span>{t(`examples.level${level}`)}</span>
                      <span>
                        ⭐ {got}/{max}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={got} aria-label={`${LANGUAGES[lang].name} ${t(`examples.level${level}`)}`}>
                      <div className="h-full rounded-full" style={{ background: "var(--brand-orange)", width: `${(got / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              {([11, 12] as const).map((cls) => {
                const ex = EXAMPLES[lang].filter((e) => e.cbse?.cls === cls);
                if (!ex.length) return null;
                const got = ex.filter((e) => (progress.stars[`${lang}/${e.id}`] ?? 0) >= 1).length;
                return (
                  <div key={cls} className="mb-2">
                    <div className="flex justify-between text-[15px]">
                      <span>
                        📘 {t("cbse.label")} {t(`cbse.class${cls}`)}
                      </span>
                      <span>
                        {got}/{ex.length}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }} role="progressbar" aria-valuemin={0} aria-valuemax={ex.length} aria-valuenow={got} aria-label={`${t("cbse.label")} ${t(`cbse.class${cls}`)}`}>
                      <div className="h-full rounded-full" style={{ background: "var(--brand-sky)", width: `${(got / ex.length) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              <a className="btn mt-2 w-full" href={`#/code/${lang}`}>
                ▶ {t("badges.practise")}
              </a>
            </div>
          ))}
        </div>

        <h2 className="mb-3 text-xl font-bold">🏅 {t("badges.collection")}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => {
            const when = progress.badges[b.id];
            return (
              <li key={b.id} className="card flex flex-col items-center p-3 text-center" style={when ? undefined : { opacity: 0.55 }}>
                <span className="text-4xl" aria-hidden="true" style={when ? undefined : { filter: "grayscale(1)" }}>
                  {when ? b.emoji : "🔒"}
                </span>
                <span className="mt-1 font-bold">{t(`badges.items.${b.id}.name`)}</span>
                <span className="muted text-sm">{t(`badges.items.${b.id}.how`)}</span>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
