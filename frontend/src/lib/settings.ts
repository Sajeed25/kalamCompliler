import { useSyncExternalStore } from "react";
import { getJSON, setJSON } from "./storage";

export interface Settings {
  fontSize: number;
  theme: "light" | "dark";
  dyslexicFont: boolean;
  uiLang: "en" | "te" | "hi";
  /** Draw turtle pictures instantly instead of animating (for slow computers). */
  fastTurtle: boolean;
}

const KEY = "kalam:settings";
const defaults: Settings = {
  fontSize: 18,
  theme: "light",
  dyslexicFont: false,
  uiLang: detectLang(),
  fastTurtle: false,
};

function detectLang(): Settings["uiLang"] {
  const l = (navigator.language || "en").slice(0, 2);
  return l === "te" || l === "hi" ? l : "en";
}

let settings: Settings = { ...defaults, ...getJSON<Partial<Settings>>(KEY, {}) };
const listeners = new Set<() => void>();

export const FONT_MIN = 12;
export const FONT_MAX = 32;

export function getSettings(): Settings {
  return settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  settings.fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, settings.fontSize));
  setJSON(KEY, settings);
  applySettingsToDocument();
  listeners.forEach((l) => l());
}

export function applySettingsToDocument(): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.classList.toggle("dark", settings.theme === "dark");
  root.classList.toggle("dyslexic", settings.dyslexicFont);
  root.style.setProperty("--code-font-size", `${settings.fontSize}px`);
  root.lang = settings.uiLang;
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => settings,
  );
}
