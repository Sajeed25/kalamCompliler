import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Home from "./components/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { useRoute, routeQuery } from "./lib/router";
import { isLangId } from "./languages";
import { useSession } from "./lib/auth";
import { api } from "./lib/api";
import { getProgress, mergeProgress, useProgress, type Progress } from "./lib/progress";

// Screens are split into separate files so the home page loads instantly.
const loadEditor = () => import("./components/EditorScreen");
const EditorScreen = lazy(loadEditor);
const LoginScreen = lazy(() => import("./components/LoginScreen"));
const ShareView = lazy(() => import("./components/ShareView"));
const BadgesScreen = lazy(() => import("./components/BadgesScreen"));
const StudentHome = lazy(() => import("./components/StudentScreens").then((m) => ({ default: m.StudentHome })));
const AssignmentScreen = lazy(() => import("./components/StudentScreens").then((m) => ({ default: m.AssignmentScreen })));
const TeacherHome = lazy(() => import("./components/TeacherScreens").then((m) => ({ default: m.TeacherHome })));
const TeacherClass = lazy(() => import("./components/TeacherScreens").then((m) => ({ default: m.TeacherClass })));
const AssignmentEditor = lazy(() => import("./components/TeacherScreens").then((m) => ({ default: m.AssignmentEditor })));
const AssignmentSubmissions = lazy(() => import("./components/TeacherScreens").then((m) => ({ default: m.AssignmentSubmissions })));
const AdminScreen = lazy(() => import("./components/TeacherScreens").then((m) => ({ default: m.AdminScreen })));

/** Warm the editor bundle while the student looks at the home page. */
export function prefetchEditor(): void {
  void loadEditor();
}

function Loading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center text-xl" role="status">
      ⏳ {t("common.loading")}
    </div>
  );
}

function useProgressSync() {
  const session = useSession();
  const progress = useProgress();
  const isStudent = session?.role === "student";
  useEffect(() => {
    if (!isStudent) return;
    api<Partial<Progress>>("/api/progress").then(mergeProgress).catch(() => {});
  }, [isStudent]);
  useEffect(() => {
    if (!isStudent) return;
    const id = window.setTimeout(() => {
      api("/api/progress", { method: "PUT", body: getProgress() }).catch(() => {});
    }, 2000);
    return () => window.clearTimeout(id);
  }, [progress, isStudent]);
}

function Screen() {
  const r = useRoute();
  // A new boundary per page, so going to another page clears an error.
  return (
    <ErrorBoundary key={r.join("/")}>
      <ScreenFor r={r} />
    </ErrorBoundary>
  );
}

function ScreenFor({ r }: { r: string[] }) {
  const [a, b, c, d] = r;
  if (!a) return <Home />;
  if (a === "code" && b && isLangId(b)) return <EditorScreen key={b} lang={b} />;
  if (a === "s" && b) return <ShareView slug={b} />;
  if (a === "login") return <LoginScreen />;
  if (a === "badges") return <BadgesScreen />;
  if (a === "student") return <StudentHome />;
  if (a === "assignment" && b) return <AssignmentScreen key={b} id={+b} />;
  if (a === "admin") return <AdminScreen />;
  if (a === "teacher") {
    if (b === "class" && c) return <TeacherClass key={c} id={+c} />;
    if (b === "assignment" && c === "new") return <AssignmentEditor id={null} classId={+(routeQuery().get("class") ?? 0)} />;
    if (b === "assignment" && c && d === "edit") return <AssignmentEditor key={c} id={+c} classId={null} />;
    if (b === "assignment" && c) return <AssignmentSubmissions key={c} id={+c} />;
    return <TeacherHome />;
  }
  return <Home />;
}

export default function App() {
  useProgressSync();
  useEffect(() => {
    const id = window.setTimeout(prefetchEditor, 800);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <Suspense fallback={<Loading />}>
      <Screen />
    </Suspense>
  );
}
