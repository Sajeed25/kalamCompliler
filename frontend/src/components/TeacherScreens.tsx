import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Modal from "./Modal";
import CodeEditor from "./CodeEditor";
import { NeedLogin, type Assignment, type TestCase, type TestResult } from "./StudentScreens";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/auth";
import { navigate } from "../lib/router";
import { apiUrl } from "../runners/serverRunner";
import { getAuthToken } from "../lib/auth";
import { LANGUAGES, LANG_IDS, type LangId } from "../languages";
import { EXAMPLES } from "../examples";

interface ClassInfo {
  id: number;
  name: string;
  code: string;
  student_count: number;
}
interface Student {
  id: number;
  name: string;
}
interface NewStudent extends Student {
  pin: string;
}
interface Submission {
  student_id: number;
  student_name: string;
  submitted_at: string | null;
  passed: number;
  total: number;
  attempts: number;
  code: string | null;
  results: TestResult[] | null;
}

function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header>{title && <span className="truncate text-lg font-bold">{title}</span>}</Header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!path) return;
    api<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: ApiError) => setError(e.message));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, error, reload, setData };
}

// ------------------------------------------------------------------ dashboard

export function TeacherHome() {
  const { t } = useTranslation();
  const session = useSession();
  const { data: classes, error, reload } = useLoad<ClassInfo[]>(session?.role === "teacher" ? "/api/classes" : null);
  const [name, setName] = useState("");

  if (session?.role !== "teacher") return <NeedLogin />;

  const create = async () => {
    if (!name.trim()) return;
    const c = await api<ClassInfo>("/api/classes", { body: { name: name.trim() } });
    setName("");
    navigate(`/teacher/class/${c.id}`);
    reload();
  };

  return (
    <Shell>
      <h1 className="mb-6 brand-title text-3xl">🧑‍🏫 {t("teacher.hello", { name: session.name })}</h1>
      {session.isAdmin && (
        <a className="btn mb-6" href="#/admin">
          🛠️ {t("admin.title")}
        </a>
      )}
      <h2 className="mb-3 text-xl font-bold">{t("teacher.myClasses")}</h2>
      {error && <p role="alert">{error}</p>}
      <ul className="mb-6 grid gap-3 sm:grid-cols-3">
        {classes?.map((c) => (
          <li key={c.id}>
            <a href={`#/teacher/class/${c.id}`} className="card flex flex-col p-4 no-underline" style={{ color: "var(--text)" }}>
              <span className="text-lg font-bold">{c.name}</span>
              <span className="muted">
                {t("teacher.classCode")}: <strong className="tracking-widest">{c.code}</strong>
              </span>
              <span className="muted">{t("teacher.studentCount", { count: c.student_count })}</span>
            </a>
          </li>
        ))}
      </ul>
      <form
        className="card flex flex-wrap items-end gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div className="min-w-48 flex-1">
          <label className="mb-1 block font-bold" htmlFor="class-name">
            ➕ {t("teacher.newClass")}
          </label>
          <input id="class-name" className="field" placeholder={t("teacher.classNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          {t("teacher.create")}
        </button>
      </form>
    </Shell>
  );
}

// ------------------------------------------------------------------ one class

export function TeacherClass({ id }: { id: number }) {
  const { t } = useTranslation();
  const session = useSession();
  const { data, error, reload } = useLoad<{ class: ClassInfo; students: Student[]; assignments: Assignment[] }>(
    session?.role === "teacher" ? `/api/classes/${id}` : null,
  );
  const [tab, setTab] = useState<"assignments" | "students">("assignments");
  const [names, setNames] = useState("");
  const [cards, setCards] = useState<NewStudent[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (session?.role !== "teacher") return <NeedLogin />;
  if (error) return <Shell><p role="alert">{error}</p></Shell>;
  if (!data) return <Shell><p>⏳ {t("common.loading")}</p></Shell>;

  const addStudents = async () => {
    const list = names.split(/\n|,/).map((n) => n.trim()).filter(Boolean);
    if (!list.length) return;
    setBusy(true);
    try {
      const created = await api<NewStudent[]>(`/api/classes/${id}/students`, { body: { names: list } });
      setCards(created);
      setNames("");
      reload();
    } finally {
      setBusy(false);
    }
  };

  const resetPin = async (s: Student) => {
    const res = await api<{ pin: string }>(`/api/students/${s.id}/reset-pin`, { method: "POST" });
    setCards([{ ...s, pin: res.pin }]);
  };

  const remove = async (s: Student) => {
    if (!confirm(t("teacher.confirmRemove", { name: s.name }))) return;
    await api(`/api/students/${s.id}`, { method: "DELETE" });
    reload();
  };

  return (
    <Shell title={data.class.name}>
      <a href="#/teacher" className="btn mb-4">
        ← {t("teacher.myClasses")}
      </a>
      <div className="card mb-6 flex flex-wrap items-center gap-4 p-4">
        <div>
          <h1 className="brand-title text-2xl">{data.class.name}</h1>
          <p className="text-lg">
            {t("teacher.classCode")}: <strong className="text-2xl tracking-[0.25em]" data-testid="class-code-display">{data.class.code}</strong>
          </p>
        </div>
        <p className="muted min-w-60 flex-1">{t("teacher.classCodeHelp")}</p>
      </div>
      <div className="mb-4 flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === "assignments"} className={`btn ${tab === "assignments" ? "btn-primary" : ""}`} onClick={() => setTab("assignments")}>
          📝 {t("teacher.assignments")} ({data.assignments.length})
        </button>
        <button role="tab" aria-selected={tab === "students"} className={`btn ${tab === "students" ? "btn-primary" : ""}`} onClick={() => setTab("students")}>
          🎒 {t("teacher.students")} ({data.students.length})
        </button>
      </div>

      {tab === "assignments" && (
        <section>
          <a className="btn btn-primary mb-4" href={`#/teacher/assignment/new?class=${id}`}>
            ➕ {t("teacher.newAssignment")}
          </a>
          <ul className="space-y-2">
            {data.assignments.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center gap-3 p-3">
                <span className="flex-1 text-lg font-bold">
                  {LANGUAGES[a.language].emoji} {a.title}
                </span>
                <a className="btn" href={`#/teacher/assignment/${a.id}`}>
                  📊 {t("teacher.submissions")}
                </a>
                <a className="btn" href={`#/teacher/assignment/${a.id}/edit`}>
                  ✏️ {t("teacher.edit")}
                </a>
              </li>
            ))}
          </ul>
          {data.assignments.length === 0 && <p className="muted">{t("teacher.noAssignments")}</p>}
        </section>
      )}

      {tab === "students" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <ul className="space-y-2">
              {data.students.map((s) => (
                <li key={s.id} className="card flex flex-wrap items-center gap-2 p-3">
                  <span className="flex-1 font-bold">{s.name}</span>
                  <button className="btn" onClick={() => void resetPin(s)}>
                    🔢 {t("teacher.newPin")}
                  </button>
                  <button className="btn" onClick={() => void remove(s)} aria-label={t("teacher.remove") + " " + s.name}>
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
            {data.students.length === 0 && <p className="muted">{t("teacher.noStudents")}</p>}
          </div>
          <form
            className="card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void addStudents();
            }}
          >
            <label htmlFor="names" className="mb-1 block font-bold">
              ➕ {t("teacher.addStudents")}
            </label>
            <textarea id="names" className="field min-h-40" value={names} onChange={(e) => setNames(e.target.value)} placeholder={t("teacher.namesPlaceholder")} />
            <p className="muted mt-1 text-sm">{t("teacher.namesHelp")}</p>
            <button className="btn btn-primary mt-3" type="submit" disabled={busy || !names.trim()}>
              {t("teacher.addAndMakePins")}
            </button>
          </form>
        </section>
      )}

      {cards && (
        <Modal title={`🔢 ${t("teacher.pinCards")}`} onClose={() => setCards(null)} wide>
          <p className="mb-3">{t("teacher.pinCardsHelp")}</p>
          <div id="pin-cards" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.id} className="rounded-xl p-3 text-center" style={{ border: "2px dashed var(--border)" }}>
                <div className="text-sm">Kalam Compiler</div>
                <div className="text-lg font-bold">{c.name}</div>
                <div className="text-sm">
                  {t("teacher.classCode")}: <strong>{data.class.code}</strong>
                </div>
                <div className="text-sm">
                  PIN: <strong className="text-xl tracking-widest" data-testid="new-pin">{c.pin}</strong>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-4" onClick={() => printCards()}>
            🖨️ {t("teacher.print")}
          </button>
        </Modal>
      )}
    </Shell>
  );
}

function printCards() {
  const el = document.getElementById("pin-cards");
  if (!el) return;
  const w = window.open("", "_blank", "width=800,height=600");
  if (!w) return;
  w.document.write(
    `<!doctype html><title>PIN cards</title><style>body{font-family:sans-serif}#c{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}#c>div{border:2px dashed #888;border-radius:12px;padding:12px;text-align:center}</style><div id="c">${el.innerHTML}</div>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

// ------------------------------------------------------------------ assignment editor

const emptyTest = (): TestCase => ({ input: "", expected: "", hidden: false });

export function AssignmentEditor({ id, classId }: { id: number | null; classId: number | null }) {
  const { t } = useTranslation();
  const session = useSession();
  const [form, setForm] = useState<Omit<Assignment, "id" | "created_at"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TestResult[] | null>(null);

  useEffect(() => {
    if (session?.role !== "teacher") return;
    if (id) {
      api<Assignment>(`/api/assignments/${id}`).then((a) => setForm(a)).catch((e) => setError(e.message));
    } else if (classId) {
      setForm({
        class_id: classId,
        title: "",
        instructions: "",
        language: "python",
        starter_code: "",
        tests: [emptyTest()],
        match_mode: "exact",
      });
    }
  }, [id, classId, session]);

  if (session?.role !== "teacher") return <NeedLogin />;
  if (!form) return <Shell><p>{error ?? "⏳ " + t("common.loading")}</p></Shell>;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const setTest = (i: number, patch: Partial<TestCase>) => set("tests", form.tests.map((tc, j) => (j === i ? { ...tc, ...patch } : tc)));

  const save = async () => {
    setError(null);
    try {
      const body = { ...form, tests: form.tests.filter((tc) => tc.expected.trim() || tc.input.trim()) };
      const res = id ? await api<Assignment>(`/api/assignments/${id}`, { method: "PUT", body }) : await api<Assignment>(`/api/classes/${form.class_id}/assignments`, { body });
      navigate(`/teacher/class/${res.class_id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const tryTests = async () => {
    setPreview(null);
    setError(null);
    try {
      const res = await api<{ results: TestResult[] }>(`/api/assignments/try`, {
        body: { language: form.language, code: form.starter_code, tests: form.tests, match_mode: form.match_mode },
      });
      setPreview(res.results);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async () => {
    if (!id || !confirm(t("teacher.confirmDeleteAssignment"))) return;
    await api(`/api/assignments/${id}`, { method: "DELETE" });
    navigate(`/teacher/class/${form.class_id}`);
  };

  return (
    <Shell title={form.title || t("teacher.newAssignment")}>
      <a href={`#/teacher/class/${form.class_id}`} className="btn mb-4">
        ← {t("common.back")}
      </a>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-1 block font-bold" htmlFor="a-title">{t("teacher.aTitle")}</label>
            <input id="a-title" className="field" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block font-bold" htmlFor="a-lang">{t("teacher.aLanguage")}</label>
            <select id="a-lang" className="field" value={form.language} onChange={(e) => set("language", e.target.value as LangId)}>
              {LANG_IDS.map((l) => (
                <option key={l} value={l}>
                  {LANGUAGES[l].name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block font-bold" htmlFor="a-instr">{t("teacher.aInstructions")}</label>
          <textarea id="a-instr" className="field min-h-28" maxLength={5000} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder={t("teacher.aInstructionsPlaceholder")} />
        </div>
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{t("teacher.aStarter")}</span>
            <select
              className="field w-auto"
              aria-label={t("teacher.fromExample")}
              value=""
              onChange={(e) => {
                const ex = EXAMPLES[form.language].find((x) => x.id === e.target.value);
                if (ex) set("starter_code", ex.code);
              }}
            >
              <option value="">{t("teacher.fromExample")}</option>
              {EXAMPLES[form.language].map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title.en}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64 overflow-hidden rounded-2xl" style={{ border: "2px solid var(--border)" }}>
            <CodeEditor value={form.starter_code} lang={form.language} onChange={(c) => set("starter_code", c)} ariaLabel={t("teacher.aStarter")} />
          </div>
        </div>

        <fieldset className="card p-4">
          <legend className="px-2 text-lg font-bold">✅ {t("teacher.tests")}</legend>
          <p className="muted mb-3 text-[15px]">{t("teacher.testsHelp")}</p>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="font-bold">{t("teacher.matchMode")}:</span>
            <label className="flex items-center gap-2">
              <input type="radio" name="mm" checked={form.match_mode === "exact"} onChange={() => set("match_mode", "exact")} /> {t("teacher.matchExact")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mm" checked={form.match_mode === "contains"} onChange={() => set("match_mode", "contains")} /> {t("teacher.matchContains")}
            </label>
          </div>
          <ol className="space-y-3">
            {form.tests.map((tc, i) => (
              <li key={i} className="grid gap-2 rounded-xl p-3 sm:grid-cols-[1fr_1fr_auto]" style={{ background: "var(--surface-2)" }}>
                <div>
                  <label className="mb-1 block text-sm font-bold" htmlFor={`in-${i}`}>
                    {t("teacher.testN", { n: i + 1 })} · {t("assignment.input")}
                  </label>
                  <textarea id={`in-${i}`} className="field min-h-20 font-mono" value={tc.input} onChange={(e) => setTest(i, { input: e.target.value })} placeholder={t("teacher.inputPlaceholder")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold" htmlFor={`out-${i}`}>
                    {t("assignment.expected")}
                  </label>
                  <textarea id={`out-${i}`} className="field min-h-20 font-mono" value={tc.expected} onChange={(e) => setTest(i, { expected: e.target.value })} />
                </div>
                <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch">
                  <label className="flex min-h-11 items-center gap-2">
                    <input type="checkbox" checked={tc.hidden} onChange={(e) => setTest(i, { hidden: e.target.checked })} /> {t("assignment.secret")}
                  </label>
                  <button type="button" className="btn" onClick={() => set("tests", form.tests.filter((_, j) => j !== i))} aria-label={t("teacher.removeTest", { n: i + 1 })}>
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => set("tests", [...form.tests, emptyTest()])} disabled={form.tests.length >= 20}>
              ➕ {t("teacher.addTest")}
            </button>
            <button type="button" className="btn" onClick={() => void tryTests()}>
              🧪 {t("teacher.tryWithStarter")}
            </button>
          </div>
          {preview && (
            <ul className="mt-3 space-y-1">
              {preview.map((r) => (
                <li key={r.index}>
                  {r.passed ? "✅" : "❌"} {t("assignment.test", { n: r.index + 1 })}
                  {!r.passed && r.actual != null && <span className="muted"> — {t("assignment.yours")}: {JSON.stringify(r.actual.slice(0, 80))}</span>}
                  {r.problem && <span className="muted"> — {r.problem}</span>}
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        {error && <p className="font-bold" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary text-lg">
            💾 {t("teacher.saveAssignment")}
          </button>
          {id && (
            <button type="button" className="btn" onClick={() => void remove()}>
              🗑️ {t("teacher.deleteAssignment")}
            </button>
          )}
        </div>
      </form>
    </Shell>
  );
}

// ------------------------------------------------------------------ submissions

export function AssignmentSubmissions({ id }: { id: number }) {
  const { t } = useTranslation();
  const session = useSession();
  const { data, error, reload } = useLoad<{ assignment: Assignment; submissions: Submission[] }>(session?.role === "teacher" ? `/api/assignments/${id}/submissions` : null);
  const [view, setView] = useState<Submission | null>(null);

  useEffect(() => {
    // Live-ish class view: refresh every 20 s while open.
    const timer = window.setInterval(reload, 20_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  if (session?.role !== "teacher") return <NeedLogin />;
  if (error) return <Shell><p role="alert">{error}</p></Shell>;
  if (!data) return <Shell><p>⏳ {t("common.loading")}</p></Shell>;

  const a = data.assignment;
  const done = data.submissions.filter((s) => s.total > 0 && s.passed === s.total).length;
  const tried = data.submissions.filter((s) => s.submitted_at).length;

  const downloadCsv = async () => {
    const res = await fetch(apiUrl(`/api/assignments/${id}/export.csv`), { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${a.title.replace(/\W+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title={a.title}>
      <a href={`#/teacher/class/${a.class_id}`} className="btn mb-4">
        ← {t("common.back")}
      </a>
      <h1 className="mb-1 brand-title text-2xl">
        {LANGUAGES[a.language].emoji} {a.title}
      </h1>
      <p className="muted mb-4">
        {t("teacher.summary", { done, tried, total: data.submissions.length })}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn" onClick={reload}>
          🔄 {t("teacher.refresh")}
        </button>
        <button className="btn" onClick={() => void downloadCsv()}>
          ⬇️ {t("teacher.exportCsv")}
        </button>
        <a className="btn" href={`#/assignment/${a.id}`}>
          👀 {t("teacher.tryAsStudent")}
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left">
              <th className="px-3">{t("teacher.student")}</th>
              <th className="px-3">{t("teacher.result")}</th>
              <th className="px-3">{t("teacher.attempts")}</th>
              <th className="px-3">{t("teacher.lastTry")}</th>
              <th className="px-3"><span className="sr-only">{t("teacher.viewCode")}</span></th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((s) => (
              <tr key={s.student_id} style={{ background: "var(--surface)" }}>
                <td className="rounded-l-xl px-3 py-2 font-bold">{s.student_name}</td>
                <td className="px-3 py-2">
                  {!s.submitted_at ? "—" : s.passed === s.total ? `✅ ${s.passed}/${s.total}` : `🟡 ${s.passed}/${s.total}`}
                </td>
                <td className="px-3 py-2">{s.attempts}</td>
                <td className="px-3 py-2">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : t("teacher.notYet")}</td>
                <td className="rounded-r-xl px-3 py-2 text-right">
                  {s.code != null && (
                    <button className="btn" onClick={() => setView(s)}>
                      👀 {t("teacher.viewCode")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view && (
        <Modal title={`${view.student_name} — ${a.title}`} onClose={() => setView(null)} wide>
          <div className="h-[50vh] overflow-hidden rounded-xl" style={{ border: "2px solid var(--border)" }}>
            <CodeEditor value={view.code ?? ""} lang={a.language} onChange={() => {}} readOnly ariaLabel={t("teacher.viewCode")} />
          </div>
          {view.results && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {view.results.map((r) => (
                <li key={r.index} className="rounded-lg px-2 py-1" style={{ background: r.passed ? "var(--success-bg)" : "var(--error-bg)" }}>
                  {r.passed ? "✅" : "❌"} {t("assignment.test", { n: r.index + 1 })}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </Shell>
  );
}

// ------------------------------------------------------------------ admin (Phase 3)

export function AdminScreen() {
  const { t } = useTranslation();
  const session = useSession();
  const { data, error, reload } = useLoad<Record<string, unknown>>(session?.role === "teacher" && session.isAdmin ? "/api/admin/stats" : null);
  if (session?.role !== "teacher" || !session.isAdmin) return <NeedLogin />;
  return (
    <Shell title={t("admin.title")}>
      <h1 className="mb-4 brand-title text-2xl">🛠️ {t("admin.title")}</h1>
      <button className="btn mb-4" onClick={reload}>
        🔄 {t("teacher.refresh")}
      </button>
      {error && <p role="alert">{error}</p>}
      {data && (
        <pre className="card overflow-auto p-4 text-sm" style={{ fontFamily: "var(--code-font)" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <p className="muted mt-4">{t("admin.help")}</p>
    </Shell>
  );
}
