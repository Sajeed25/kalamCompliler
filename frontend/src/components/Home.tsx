import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Mascot from "./Mascot";
import { LANGUAGES, LANG_IDS } from "../languages";
import { getRunner, preloadPythonWhenIdle } from "../runners";
import { useSession } from "../lib/auth";

export default function Home() {
  const { t } = useTranslation();
  const session = useSession();
  const tips = t("tips", { returnObjects: true }) as string[];
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], [tips]);

  useEffect(() => {
    preloadPythonWhenIdle();
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <h1 className="mb-2 text-center text-3xl font-bold sm:text-4xl">{t("home.title")}</h1>
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
                  className={`group flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-br ${l.cardClass} p-6 text-center text-white no-underline shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus-visible:-translate-y-1`}
                >
                  <span className="text-6xl drop-shadow" aria-hidden="true">
                    {l.emoji}
                  </span>
                  <span className="text-3xl font-bold drop-shadow">{l.name}</span>
                  <span className="text-lg font-bold leading-snug drop-shadow-sm">{t(`home.cards.${id}`)}</span>
                  <span className="mt-1 rounded-full bg-white/25 px-4 py-1 font-bold">{t("home.start")} →</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mx-auto mt-10 max-w-2xl">
          <Mascot text={tip} />
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-3">
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
          {!session && (
            <a className="btn" href="#/login">
              🔑 {t("home.loginHint")}
            </a>
          )}
          <a className="btn" href="#/badges">
            🏅 {t("nav.badges")}
          </a>
        </div>
      </main>
      <footer className="muted px-4 py-4 text-center text-sm">
        {t("footer.madeBy")} · {t("footer.privacy")}
      </footer>
    </div>
  );
}
