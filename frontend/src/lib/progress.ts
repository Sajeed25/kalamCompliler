import { useSyncExternalStore } from "react";
import { getJSON, setJSON } from "./storage";
import type { LangId } from "../languages";
import { EXAMPLES } from "../examples";

/**
 * Stars and badges. Stored in this browser; synced to the server when a
 * student is logged in (see syncProgress in lib/api usage in App).
 *
 * Stars per example: ⭐ run it successfully, ⭐⭐ change it and run it again.
 * No leaderboards: progress is only shown to the student themself.
 */
export interface Progress {
  stars: Record<string, number>; // "python/hello" -> 1..2
  badges: Record<string, string>; // badge id -> ISO date earned
  counters: { runs: number; fixes: number };
}

export const BADGES = [
  { id: "first_run", emoji: "🎉" },
  { id: "bug_fixer", emoji: "🐞" },
  { id: "bug_hunter", emoji: "🔍" },
  { id: "turtle_artist", emoji: "🐢" },
  { id: "chatty", emoji: "💬" },
  { id: "explorer_python", emoji: "🐍" },
  { id: "explorer_c", emoji: "🔧" },
  { id: "explorer_cpp", emoji: "🚀" },
  { id: "level1_python", emoji: "🥉" },
  { id: "level2_python", emoji: "🥈" },
  { id: "level3_python", emoji: "🥇" },
  { id: "level1_c", emoji: "🥉" },
  { id: "level2_c", emoji: "🥈" },
  { id: "level3_c", emoji: "🥇" },
  { id: "level1_cpp", emoji: "🥉" },
  { id: "level2_cpp", emoji: "🥈" },
  { id: "level3_cpp", emoji: "🥇" },
  { id: "creator", emoji: "🎨" },
  { id: "runs_50", emoji: "🏃" },
  { id: "assignment_star", emoji: "🌟" },
  { id: "cbse_11", emoji: "📘" },
  { id: "cbse_12", emoji: "🎓" },
] as const;
export type BadgeId = (typeof BADGES)[number]["id"];

const KEY = "kalam:progress";
let progress: Progress = { stars: {}, badges: {}, counters: { runs: 0, fixes: 0 }, ...getJSON<Partial<Progress>>(KEY, {}) };
const listeners = new Set<() => void>();
let lastNew: BadgeId[] = [];

function save() {
  setJSON(KEY, progress);
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => progress,
  );
}

export function getProgress(): Progress {
  return progress;
}

/** Merge progress from the server (take the best of both). */
export function mergeProgress(remote: Partial<Progress> | null | undefined): void {
  if (!remote) return;
  const stars = { ...progress.stars };
  for (const [k, v] of Object.entries(remote.stars ?? {})) stars[k] = Math.max(stars[k] ?? 0, v);
  const badges = { ...(remote.badges ?? {}), ...progress.badges };
  const counters = {
    runs: Math.max(progress.counters.runs, remote.counters?.runs ?? 0),
    fixes: Math.max(progress.counters.fixes, remote.counters?.fixes ?? 0),
  };
  progress = { stars, badges, counters };
  save();
}

function award(id: BadgeId) {
  if (!progress.badges[id]) {
    progress.badges = { ...progress.badges, [id]: new Date().toISOString() };
    lastNew.push(id);
  }
}

export interface RunInfo {
  lang: LangId;
  ok: boolean;
  exampleId: string | null;
  /** Code differs from the example's original code. */
  changed: boolean;
  usedTurtle: boolean;
  usedInput: boolean;
  /** Previous run of this editor ended with an error. */
  previousFailed: boolean;
}

/** Record a finished run. Returns badges earned by this run (to celebrate). */
export function recordRun(r: RunInfo): BadgeId[] {
  lastNew = [];
  const counters = { ...progress.counters, runs: progress.counters.runs + 1 };
  progress = { ...progress, counters };
  if (!r.ok) {
    save();
    return [];
  }
  award("first_run");
  if (r.previousFailed) {
    progress.counters = { ...progress.counters, fixes: progress.counters.fixes + 1 };
    award("bug_fixer");
    if (progress.counters.fixes >= 10) award("bug_hunter");
  }
  if (r.usedTurtle) award("turtle_artist");
  if (r.usedInput) award("chatty");
  if (progress.counters.runs >= 50) award("runs_50");
  award(`explorer_${r.lang}` as BadgeId);
  if (r.exampleId) {
    const key = `${r.lang}/${r.exampleId}`;
    const s = Math.max(progress.stars[key] ?? 0, r.changed ? 2 : 1);
    progress.stars = { ...progress.stars, [key]: s };
    if (r.changed) award("creator");
    // Level badges count the general examples; CBSE programs have their own badges.
    for (const level of [1, 2, 3] as const) {
      const ex = EXAMPLES[r.lang].filter((e) => e.level === level && !e.cbse);
      if (ex.length && ex.every((e) => (progress.stars[`${r.lang}/${e.id}`] ?? 0) >= 1)) award(`level${level}_${r.lang}` as BadgeId);
    }
    for (const cls of [11, 12] as const) {
      const ex = EXAMPLES[r.lang].filter((e) => e.cbse?.cls === cls);
      if (ex.length && ex.every((e) => (progress.stars[`${r.lang}/${e.id}`] ?? 0) >= 1)) award(`cbse_${cls}` as BadgeId);
    }
  }
  save();
  return [...lastNew];
}

export function awardBadge(id: BadgeId): boolean {
  lastNew = [];
  award(id);
  save();
  return lastNew.length > 0;
}

export function starCount(): number {
  return Object.values(progress.stars).reduce((a, b) => a + b, 0);
}
