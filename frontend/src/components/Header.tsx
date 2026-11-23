import { useTranslation } from "react-i18next";
import { navigate } from "../lib/router";
import { useSession, setSession } from "../lib/auth";
import { useServerConfig } from "../lib/serverConfig";
import SettingsMenu from "./SettingsMenu";
import type { ReactNode } from "react";

export default function Header({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const session = useSession();
  const server = useServerConfig(); // no backend (e.g. web hosting) = no accounts
  return (
    <header className="relative flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4" style={{ background: "var(--surface)" }}>
      <a href="#/" className="me-1 flex min-w-0 items-center gap-2 rounded-xl px-1 no-underline sm:gap-3" aria-label="Kalam Compiler by Robokalam — home">
        <span className="flex items-center rounded-lg dark:bg-white dark:px-1.5 dark:py-1">
          <img src={`${import.meta.env.BASE_URL}brand/robokalam-logo.webp`} alt="Robokalam" className="hidden h-9 w-auto sm:block" width={153} height={36} />
          <img src={`${import.meta.env.BASE_URL}brand/robokalam-globe.png`} alt="Robokalam" className="h-9 w-9 sm:hidden" width={36} height={36} />
        </span>
        <span aria-hidden="true" className="hidden h-8 w-0.5 rounded-full sm:block" style={{ background: "var(--border)" }} />
        <span className="brand-title whitespace-nowrap text-xl leading-none sm:text-2xl">Kalam Compiler</span>
      </a>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      <nav className="flex flex-wrap items-center gap-2" aria-label={t("nav.label")}>
        <a className="btn" href="#/badges">
          <span aria-hidden="true">🏅</span>
          <span className="text-sm sm:text-base">{t("nav.badges")}</span>
        </a>
        {session ? (
          <>
            <a className="btn" href={session.role === "teacher" ? "#/teacher" : "#/student"}>
              <span aria-hidden="true">{session.role === "teacher" ? "🧑‍🏫" : "🎒"}</span>
              <span className="max-w-[10ch] truncate">{session.name}</span>
            </a>
            <button
              className="btn"
              onClick={() => {
                setSession(null);
                navigate("/");
              }}
            >
              <span aria-hidden="true">👋</span>
              <span className="text-sm sm:text-base">{t("nav.logout")}</span>
            </button>
          </>
        ) : server?.accounts_enabled ? (
          <a className="btn" href="#/login">
            <span aria-hidden="true">🔑</span>
            <span className="text-sm sm:text-base">{t("nav.login")}</span>
          </a>
        ) : null}
        <SettingsMenu />
      </nav>
      <div className="brand-stripe absolute inset-x-0 bottom-0" aria-hidden="true" />
    </header>
  );
}
