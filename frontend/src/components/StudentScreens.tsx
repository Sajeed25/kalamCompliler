import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import EditorScreen from "./EditorScreen";
import { api } from "../lib/api";
import { useSession } from "../lib/auth";
import { LANGUAGES, type LangId } from "../languages";
import { awardBadge } from "../lib/progress";

export interface TestCase {
  input: string;
  expected: string;
  hidden: boolean;
}

export interface Assignment {
  id: number;
  class_id: number;
  title: string;
  instructions: string;
  language: LangId;
  starter_code: string;
  tests: TestCase[];
  match_mode: "exact" | "contains";
  created_at: string;
}

interface MyAssignment extends Assignment {
  my_status: "new" | "tried" | "passed";
  my_best: { passed: number; total: number } | null;
}

export interface TestResult {
  index: number;
  passed: boolean;
  hidden: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  problem?: "timeout" | "error" | "output-limit" | "compile";
  error?: string;
}

export function StudentHome() {
  const { t } = useTranslation();
  const session = useSession();
  const [items, setItems] = useState<MyAssignment[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (session?.role !== "student") return;
    api<MyAssignment[]>("/api/student/assignments")
      .then(setItems)
      .catch(() => setError(true));
  }, [session]);

  if (session?.role !== "student") return <NeedLogin />;

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <h1 className="mb-1 brand-title text-3xl">🎒 {t("student.hello", { name: session.name })}</h1>
        <p className="muted mb-6">{session.className}</p>
        <h2 className="mb-3 text-xl font-bold">📚 {t("student.assignments")}</h2>
        {error && <p role="alert">{t("login.serverProblem")}</p>}
        {!items && !error && <p>⏳ {t("common.loading")}</p>}
        {items?.length === 0 && <p className="card p-5">{t("student.noAssignments")} 🎉</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {items?.map((a) => (
            <li key={a.id}>
              <a href={`#/assignment/${a.id}`} className="card flex h-full flex-col gap-1 p-4 no-underline" style={{ color: "var(--text)" }}>
                <span className="flex items-center justify-between gap-2 text-lg font-bold">
                  <span>
                    {LANGUAGES[a.language].emoji} {a.title}
                  </span>
                  <span>{a.my_status === "passed" ? "✅" : a.my_status === "tried" ? "🟡" : "🆕"}</span>
                </span>
                <span className="muted">
                  {t(`student.status.${a.my_status}`)}
                  {a.my_best ? ` · ${a.my_best.passed}/${a.my_best.total}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn" href="#/">
            🏠 {t("student.freeCoding")}
          </a>
          <a className="btn" href="#/badges">
            🏅 {t("nav.badges")}
          </a>
        </div>
      </main>
    </div>
  );
}

export function NeedLogin() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto max-w-xl flex-1 px-4 py-10 text-center">
        <p className="mb-4 text-xl">{t("student.needLogin")}</p>
        <a className="btn btn-primary" href="#/login">
          🔑 {t("nav.login")}
        </a>
      </main>
    </div>
  );
}

export function AssignmentScreen({ id }: { id: number }) {
  const { t } = useTranslation();
  const session = useSession();
  const [a, setA] = useState<Assignment | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Assignment>(`/api/assignments/${id}`)
      .then(setA)
      .catch(() => setError(true));
  }, [id]);

  if (!session) return <NeedLogin />;
  if (error)
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <p className="p-8 text-center" role="alert">{t("student.assignmentMissing")}</p>
      </div>
    );
  if (!a)
    return (
      <div className="flex min-h-full flex-col">
        <Header />
        <p className="p-8 text-center">⏳ {t("common.loading")}</p>
      </div>
    );

  const owner = session.role === "student" ? session.studentId : `t${session.teacherId}`;
  return (
    <EditorScreen
      lang={a.language}
      storageKey={`kalam:assignment:${a.id}:${owner}`}
      starterCode={a.starter_code}
      hideExamples
      headerExtra={<span className="truncate font-bold">📝 {a.title}</span>}
      sidePanel={({ code }) => <AssignmentPanel assignment={a} code={code} canSubmit={session.role === "student"} />}
    />
  );
}

function AssignmentPanel({ assignment: a, code, canSubmit }: { assignment: Assignment; code: string; canSubmit: boolean }) {
  const { t } = useTranslation();
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ results: TestResult[]; passed: number; total: number }>(`/api/assignments/${a.id}/check`, { body: { code } });
      setResults(res.results);
      if (res.total > 0 && res.passed === res.total) awardBadge("assignment_star");
    } catch (e) {
      setError(String((e as Error).message) === "offline" ? t("errors.offline") : t("assignment.checkFailed"));
    } finally {
      setBusy(false);
    }
  };

  const passed = results?.filter((r) => r.passed).length ?? 0;
  const visibleTests = a.tests.filter((x) => !x.hidden);

  return (
    <section className="card max-h-[45vh] shrink-0 overflow-auto p-4" aria-label={t("assignment.panel")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">📝 {a.title}</h2>
        <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "▲" : "▼"} <span className="sr-only">{t("assignment.toggle")}</span>
        </button>
      </div>
      {open && (
        <>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{a.instructions}</p>
          {visibleTests.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer font-bold">🔎 {t("assignment.exampleTests")}</summary>
              <ul className="mt-2 space-y-2">
                {visibleTests.map((tc, i) => (
                  <li key={i} className="rounded-xl p-2 text-sm" style={{ background: "var(--surface-2)", fontFamily: "var(--code-font)" }}>
                    {tc.input && (
                      <div>
                        <strong>{t("assignment.input")}:</strong> <span className="whitespace-pre-wrap">{tc.input}</span>
                      </div>
                    )}
                    <div>
                      <strong>{t("assignment.expected")}:</strong> <span className="whitespace-pre-wrap">{tc.expected}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {canSubmit ? (
        <button className="btn btn-primary mt-3 w-full text-lg" onClick={() => void check()} disabled={busy} data-testid="check-button">
          {busy ? "⏳ " + t("assignment.checking") : "✅ " + t("assignment.check")}
        </button>
      ) : (
        <p className="muted mt-3">{t("assignment.teacherPreview")}</p>
      )}
      {error && <p className="mt-2 font-bold" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
      {results && (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="mb-2 text-lg font-bold">
            {passed === results.length ? `🎉 ${t("assignment.allPassed")}` : t("assignment.someFailed", { passed, total: results.length })}
          </p>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.index} className="rounded-xl p-2" style={{ background: r.passed ? "var(--success-bg)" : "var(--error-bg)" }}>
                <strong>
                  {r.passed ? "✅" : "❌"} {t("assignment.test", { n: r.index + 1 })}
                  {r.hidden ? ` (${t("assignment.secret")})` : ""}
                </strong>
                {!r.passed && (
                  <div className="mt-1 text-[15px]">
                    {r.problem ? t(`assignment.problem.${r.problem}`) : t("assignment.differentOutput")}
                    {!r.hidden && r.actual != null && (
                      <pre dir="ltr" className="mt-1 whitespace-pre-wrap rounded-lg p-2 text-sm" style={{ background: "var(--surface)", fontFamily: "var(--code-font)" }}>
                        {t("assignment.yours")}: {r.actual || t("assignment.nothing")}
                        {"\n"}
                        {t("assignment.expected")}: {r.expected}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
