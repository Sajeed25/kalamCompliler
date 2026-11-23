export type LangId = "python" | "c" | "cpp";

export interface LangInfo {
  id: LangId;
  name: string;
  emoji: string;
  /** File extension without the dot. */
  ext: string;
  /** Extra extensions accepted by "Open file". */
  openExts: string[];
  /** Where the code runs. */
  engine: "pyodide" | "server";
  /** Home card colours (Robokalam brand). */
  card: { bg: string; fg: string };
}

export const LANGUAGES: Record<LangId, LangInfo> = {
  python: {
    id: "python",
    name: "Python",
    emoji: "🐍",
    ext: "py",
    openExts: ["py", "txt"],
    engine: "pyodide",
    card: { bg: "#98bd3a", fg: "#023152" },
  },
  c: {
    id: "c",
    name: "C",
    emoji: "🔧",
    ext: "c",
    openExts: ["c", "h", "txt"],
    engine: "server",
    card: { bg: "#01bce1", fg: "#023152" },
  },
  cpp: {
    id: "cpp",
    name: "C++",
    emoji: "🚀",
    ext: "cpp",
    openExts: ["cpp", "cc", "cxx", "hpp", "txt"],
    engine: "server",
    card: { bg: "#f9a912", fg: "#023152" },
  },
};

export const LANG_IDS = Object.keys(LANGUAGES) as LangId[];

export function isLangId(x: string): x is LangId {
  return x in LANGUAGES;
}

/** Pick a language from a file name, e.g. "game.cpp" -> "cpp". */
export function langFromFileName(name: string): LangId | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "txt") return null;
  for (const l of LANG_IDS) if (LANGUAGES[l].openExts.includes(ext)) return l;
  return null;
}
