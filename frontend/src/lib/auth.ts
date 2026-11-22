import { useSyncExternalStore } from "react";
import { getJSON, setJSON, safeRemove } from "./storage";

export interface StudentSession {
  role: "student";
  token: string;
  studentId: number;
  name: string;
  classCode: string;
  className: string;
}
export interface TeacherSession {
  role: "teacher";
  token: string;
  teacherId: number;
  name: string;
  email: string;
  isAdmin: boolean;
}
export type Session = StudentSession | TeacherSession;

const KEY = "kalam:session";
let session: Session | null = getJSON<Session | null>(KEY, null);
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return session;
}

export function getAuthToken(): string | null {
  return session?.token ?? null;
}

export function setSession(s: Session | null): void {
  session = s;
  if (s) setJSON(KEY, s);
  else safeRemove(KEY);
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => session,
  );
}
