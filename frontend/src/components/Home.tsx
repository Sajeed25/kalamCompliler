import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Mascot from "./Mascot";
import { LANGUAGES, LANG_IDS } from "../languages";
import { getRunner, preloadPythonWhenIdle } from "../runners";
import { useSession } from "../lib/auth";
import { useServerConfig } from "../lib/serverConfig";
import { ACTIVITIES } from "../activities";
import { localized } from "../examples";
import { useProgress } from "../lib/progress";

/** Binary digits, like the Robokalam globe, used as a soft card pattern. */
const BINARY = "10110 01011 10010 11101 00110 10101 01101 11010";

export default function Home() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const server = useServerConfig();
  const progress = useProgress();
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0);
  const tips = t("tips", { returnObjects: true }) as string[];
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], [tips]);
  const activities = ACTIVITIES.filter((a) => level === 0 || a.level === level);

  useEffect(() => {
    preloadPythonWhenIdle();
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <h1 className="brand-title mb-2 text-center text-3xl sm:text-5xl">{t("home.title")}</h1>
        <p className="muted mb-8 text-center text-lg">{t("home.subtitle")}</p>

        <ul className="grid gap-5 sm:grid-cols-3" aria-label={t("home.chooseLanguage")}>
          {LANG_IDS.map((id) => {
            const l = LANGUAGES[id];
            return (
              <li key={id}>
                <a
                  href={`#/code/${id}`}
                  data-testid={`lang-card-${id}`}
                  onPointerEnter={() => getRunner(id).preload()}
                  onFocus={() => getRunner(id).preload()}
                  className="relative flex h-full min-h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl p-6 text-center no-underline shadow-md transition hover:-translate-y-1 hover:shadow-xl focus-visible:-translate-y-1"
                  style={{ background: l.card.bg, color: l.card.fg }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 select-none overflow-hidden break-all p-2 font-mono text-xl font-bold leading-tight opacity-[0.1]"
                    style={{ maskImage: "radial-gradient(ellipse at center, transparent 45%, black 85%)", WebkitMaskImage: "radial-gradient(ellipse at center, transparent 45%, black 85%)" }}
                  >
                    {BINARY.repeat(4)}
                  </span>
                  <span className="relative text-6xl" aria-hidden="true">
                    {l.emoji}
                  </span>
                  <span className="relative font-[family-name:var(--brand-font)] text-4xl">{l.name}</span>
                  <span className="relative text-lg font-bold leading-snug">{t(`home.cards.${id}`)}</span>
                  <span className="relative mt-1 rounded-full px-5 py-1.5 font-bold" style={{ background: "#024067", color: "#ffffff" }}>
                    {t("home.start")} →
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mx-auto mt-8 max-w-2xl">
          <Mascot text={tip} />
        </div>

        <section className="mt-12" aria-labelledby="activities-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="activities-title" className="brand-title text-3xl">
                🎯 {t("activities.title")}
              </h2>
              <p className="muted">{t("activities.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("activities.filter")}>
              {([0, 1, 2, 3] as const).map((lv) => (
                <button key={lv} className={`btn ${level === lv ? "btn-primary" : ""}`} aria-pressed={level === lv} onClick={() => setLevel(lv)}>
                  {lv === 0 ? t("activities.all") : t(`examples.level${lv}`)}
                </button>
              ))}
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activities.map((a) => {
              const l = LANGUAGES[a.lang];
              const stars = progress.stars[`${a.lang}/${a.exampleId}`] ?? 0;
              return (
                <li key={a.id}>
                  <a
                    href={`#/code/${a.lang}?activity=${a.id}`}
                    className="card flex h-full flex-col gap-2 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ color: "var(--text)", borderTop: `6px solid ${l.card.bg}` }}
                    data-testid={`activity-${a.id}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-4xl" aria-hidden="true">
                        {a.emoji}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-sm font-bold" style={{ background: l.card.bg, color: l.card.fg }}>
                        {l.name}
                      </span>
                    </span>
                    <span className="text-lg font-bold leading-snug">{localized(a.title, i18n.language)}</span>
                    <span className="muted text-[15px] leading-snug">🎯 {localized(a.challenge, i18n.language)}</span>
                    <span className="mt-auto flex items-center justify-between pt-1 text-sm">
                      <span className="muted">{t(`examples.level${a.level}`)}</span>
                      <span aria-label={t("examples.stars", { count: stars })}>
                        {"⭐".repeat(stars)}
                        <span className="opacity-30">{"☆".repeat(2 - stars)}</span>
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-3">
          {session?.role === "student" && (
            <a className="btn btn-primary" href="#/student">
              📚 {t("home.myAssignments")}
            </a>
          )}
          {session?.role === "teacher" && (
            <a className="btn btn-primary" href="#/teacher">
              🧑‍🏫 {t("home.teacherDashboard")}
            </a>
          )}
          {!session && server?.accounts_enabled && (
            <a className="btn" href="#/login">
              🔑 {t("home.loginHint")}
            </a>
          )}
          <a className="btn" href="#/badges">
            🏅 {t("nav.badges")}
          </a>
        </div>
      </main>
      <footer className="px-4 pb-6 pt-8 text-center">
        <div className="brand-stripe mx-auto mb-4 max-w-xs rounded-full" aria-hidden="true" />
        <p className="brand-title text-lg">Robokalam</p>
        <p className="font-bold" style={{ color: "var(--syn-string)" }}>
          literature of technologies
        </p>
        <p className="muted mt-2 text-sm">
          {t("footer.madeBy")} · {t("footer.privacy")}
        </p>
      </footer>
    </div>
  );
}
