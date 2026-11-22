import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import { getSettings } from "../lib/settings";

/**
 * To add a UI language: copy locales/en.json to locales/<code>.json, translate
 * the values (keep the keys and {{placeholders}}), add a loader to LOADERS and
 * an entry to UI_LANGUAGES. Missing keys fall back to English. The unit tests
 * check that every locale has the same keys and placeholders as English.
 *
 * Only English is bundled; other languages download when chosen (faster first load).
 */
export const UI_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "te", label: "తెలుగు" },
  { code: "hi", label: "हिन्दी" },
] as const;

const LOADERS: Record<string, () => Promise<{ default: object }>> = {
  te: () => import("./locales/te.json"),
  hi: () => import("./locales/hi.json"),
};

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Download (if needed) and switch to a UI language. */
export async function setUiLanguage(code: string): Promise<void> {
  if (!i18n.hasResourceBundle(code, "translation") && LOADERS[code]) {
    try {
      const mod = await LOADERS[code]();
      i18n.addResourceBundle(code, "translation", mod.default, true, true);
    } catch {
      return; // offline and not cached: stay in the current language
    }
  }
  await i18n.changeLanguage(code);
}

export const ready = setUiLanguage(getSettings().uiLang);

export default i18n;
