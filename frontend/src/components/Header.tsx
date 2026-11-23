import { useTranslation } from "react-i18next";
import { navigate } from "../lib/router";
import { useSession, setSession } from "../lib/auth";
import { useServerConfig } from "../lib/serverConfig";
import SettingsMenu from "./SettingsMenu";
import { KalamFace } from "./Mascot";
import type { ReactNode } from "react";

export default function Header({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const session = useSession();
  const server = useServerConfig(); // no backend (e.g. web hosting) = no accounts
  return (
    <header
      className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4"
      style={{ background: "var(--surface)", borderBottom: "2px solid var(--border)" }}
    >
      <a href="#/" className="mr-1 flex items-center gap-2 rounded-xl px-1 font-bold no-underline" style={{ color: "var(--text)" }}>
        <KalamFace size={36} />
        <span className="text-lg leading-tight sm:text-xl">
          Kalam <span style={{ color: "var(--primary)" }}>Compiler</span>
        </span>
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
    </header>
  );
}
