import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import { api, ApiError } from "../lib/api";
import { setSession, type StudentSession, type TeacherSession } from "../lib/auth";
import { navigate } from "../lib/router";
import { KalamFace } from "./Mascot";

interface Roster {
  name: string;
  code: string;
  students: { id: number; name: string }[];
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const [who, setWho] = useState<"student" | "teacher">("student");
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-center gap-3">
          <KalamFace size={64} />
          <h1 className="brand-title text-3xl">{t("login.title")}</h1>
        </div>
        <div className="mb-6 flex gap-2" role="tablist">
          <button role="tab" aria-selected={who === "student"} className={`btn flex-1 text-lg ${who === "student" ? "btn-primary" : ""}`} onClick={() => setWho("student")}>
            🎒 {t("login.student")}
          </button>
          <button role="tab" aria-selected={who === "teacher"} className={`btn flex-1 text-lg ${who === "teacher" ? "btn-primary" : ""}`} onClick={() => setWho("teacher")}>
            🧑‍🏫 {t("login.teacher")}
          </button>
        </div>
        {who === "student" ? <StudentLogin /> : <TeacherLogin />}
        <p className="muted mt-8 text-center">{t("login.noLoginNeeded")}</p>
      </main>
    </div>
  );
}

function StudentLogin() {
  const { t } = useTranslation();
  const [classCode, setClassCode] = useState("");
  const [roster, setRoster] = useState<Roster | null>(null);
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const findClass = async () => {
    setError(null);
    setBusy(true);
    try {
      setRoster(await api<Roster>(`/api/auth/class/${encodeURIComponent(classCode.trim().toUpperCase())}`));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? t("login.classNotFound") : t("login.serverProblem"));
    } finally {
      setBusy(false);
    }
  };

  const login = async (fullPin: string) => {
    if (!roster || !student) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; student: { id: number; name: string; class_code: string; class_name: string } }>("/api/auth/student/login", {
        body: { class_code: roster.code, student_id: student.id, pin: fullPin },
      });
      const s: StudentSession = {
        role: "student",
        token: res.token,
        studentId: res.student.id,
        name: res.student.name,
        classCode: res.student.class_code,
        className: res.student.class_name,
      };
      setSession(s);
      navigate("/student");
    } catch (e) {
      setPin("");
      setError(e instanceof ApiError && e.status === 429 ? t("login.tooManyTries") : t("login.wrongPin"));
    } finally {
      setBusy(false);
    }
  };

  const press = (d: string) => {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) void login(next);
  };

  if (!roster)
    return (
      <form
        className="card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void findClass();
        }}
      >
        <label htmlFor="class-code" className="mb-2 block text-lg font-bold">
          1️⃣ {t("login.classCode")}
        </label>
        <input
          id="class-code"
          className="field text-center text-2xl font-bold uppercase tracking-[0.3em]"
          value={classCode}
          maxLength={8}
          onChange={(e) => setClassCode(e.target.value.replace(/[^a-z0-9]/gi, ""))}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC123"
          data-testid="class-code"
        />
        {error && <p className="mt-3 font-bold" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary mt-4 w-full text-lg" disabled={classCode.length < 4 || busy}>
          {t("login.next")} →
        </button>
      </form>
    );

  if (!student)
    return (
      <div className="card p-5">
        <h2 className="mb-1 text-lg font-bold">2️⃣ {t("login.pickName")}</h2>
        <p className="muted mb-4">{roster.name}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roster.students.map((s) => (
            <li key={s.id}>
              <button className="btn w-full text-lg" onClick={() => setStudent(s)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
        {roster.students.length === 0 && <p>{t("login.emptyClass")}</p>}
        <button className="btn mt-4" onClick={() => setRoster(null)}>
          ← {t("common.back")}
        </button>
      </div>
    );

  return (
    <div className="card p-5 text-center">
      <h2 className="mb-1 text-lg font-bold">3️⃣ {t("login.enterPin", { name: student.name })}</h2>
      <div className="my-4 flex justify-center gap-3" aria-label={t("login.pinProgress", { count: pin.length })} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex h-14 w-12 items-center justify-center rounded-xl text-3xl" style={{ border: "3px solid var(--border)", background: "var(--surface-2)" }}>
            {i < pin.length ? "●" : ""}
          </span>
        ))}
      </div>
      {error && <p className="mb-3 font-bold" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} className="btn h-16 text-2xl" onClick={() => press(d)} data-testid={`pin-${d}`}>
            {d}
          </button>
        ))}
        <button className="btn h-16 text-xl" onClick={() => setPin(pin.slice(0, -1))} aria-label={t("login.deleteDigit")}>
          ⌫
        </button>
        <button className="btn h-16 text-2xl" onClick={() => press("0")} data-testid="pin-0">
          0
        </button>
        <button className="btn h-16 text-lg" onClick={() => { setStudent(null); setPin(""); }}>
          ←
        </button>
      </div>
      <input
        className="sr-only"
        aria-label={t("login.pinTyping")}
        inputMode="numeric"
        value=""
        onChange={() => {}}
        onKeyDown={(e) => {
          if (/^\d$/.test(e.key)) press(e.key);
          if (e.key === "Backspace") setPin(pin.slice(0, -1));
        }}
      />
    </div>
  );
}

function TeacherLogin() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; teacher: { id: number; name: string; email: string; is_admin: boolean } }>(
        mode === "login" ? "/api/auth/teacher/login" : "/api/auth/teacher/register",
        { body: mode === "login" ? { email, password } : { name, email, password, invite_code: invite } },
      );
      const s: TeacherSession = {
        role: "teacher",
        token: res.token,
        teacherId: res.teacher.id,
        name: res.teacher.name,
        email: res.teacher.email,
        isAdmin: res.teacher.is_admin,
      };
      setSession(s);
      navigate("/teacher");
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 401 ? t("login.badPassword") : e.status === 429 ? t("login.tooManyTries") : e.message) : t("login.serverProblem"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {mode === "register" && (
        <div>
          <label className="mb-1 block font-bold" htmlFor="t-name">{t("login.yourName")}</label>
          <input id="t-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        </div>
      )}
      <div>
        <label className="mb-1 block font-bold" htmlFor="t-email">{t("login.email")}</label>
        <input id="t-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>
      <div>
        <label className="mb-1 block font-bold" htmlFor="t-pass">{t("login.password")}</label>
        <input id="t-pass" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      {mode === "register" && (
        <div>
          <label className="mb-1 block font-bold" htmlFor="t-invite">{t("login.inviteCode")}</label>
          <input id="t-invite" className="field" value={invite} onChange={(e) => setInvite(e.target.value)} />
          <p className="muted mt-1 text-sm">{t("login.inviteHelp")}</p>
        </div>
      )}
      {error && <p className="font-bold" style={{ color: "var(--danger)" }} role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary w-full text-lg" disabled={busy}>
        {mode === "login" ? t("login.signIn") : t("login.createAccount")}
      </button>
      <button type="button" className="btn w-full" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? t("login.needAccount") : t("login.haveAccount")}
      </button>
    </form>
  );
}
