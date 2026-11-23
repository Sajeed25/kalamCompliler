import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings, updateSettings, FONT_MAX, FONT_MIN } from "../lib/settings";
import { UI_LANGUAGES, setUiLanguage } from "../i18n";

export default function SettingsMenu() {
  const { t } = useTranslation();
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button className="btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">⚙️</span>
        <span className="text-sm sm:text-base">{t("settings.title")}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("settings.title")}
          className="card absolute end-0 z-50 mt-2 w-[min(92vw,330px)] space-y-4 p-4 shadow-xl"
        >
          <div>
            <label className="mb-1 block font-bold" htmlFor="ui-lang">
              🌐 {t("settings.language")}
            </label>
            <select
              id="ui-lang"
              className="field"
              value={s.uiLang}
              onChange={(e) => {
                const v = e.target.value as typeof s.uiLang;
                updateSettings({ uiLang: v });
                void setUiLanguage(v);
              }}
            >
              {UI_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 font-bold" id="font-size-label">
              🔠 {t("settings.fontSize")}: {s.fontSize}px
            </div>
            <div className="flex gap-2" role="group" aria-labelledby="font-size-label">
              <button dir="ltr" className="btn flex-1" disabled={s.fontSize <= FONT_MIN} onClick={() => updateSettings({ fontSize: s.fontSize - 2 })}>
                A− <span className="sr-only">{t("settings.smaller")}</span>
              </button>
              <button className="btn flex-1" onClick={() => updateSettings({ fontSize: 18 })}>
                {t("settings.reset")}
              </button>
              <button dir="ltr" className="btn flex-1 text-xl" disabled={s.fontSize >= FONT_MAX} onClick={() => updateSettings({ fontSize: s.fontSize + 2 })}>
                A+ <span className="sr-only">{t("settings.bigger")}</span>
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1 font-bold">🎨 {t("settings.theme")}</div>
            <div className="flex gap-2">
              <button className={`btn flex-1 ${s.theme === "light" ? "btn-primary" : ""}`} aria-pressed={s.theme === "light"} onClick={() => updateSettings({ theme: "light" })}>
                ☀️ {t("settings.light")}
              </button>
              <button className={`btn flex-1 ${s.theme === "dark" ? "btn-primary" : ""}`} aria-pressed={s.theme === "dark"} onClick={() => updateSettings({ theme: "dark" })}>
                🌙 {t("settings.dark")}
              </button>
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="h-6 w-6" checked={s.dyslexicFont} onChange={(e) => updateSettings({ dyslexicFont: e.target.checked })} />
            <span>📖 {t("settings.dyslexic")}</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="h-6 w-6" checked={s.fastTurtle} onChange={(e) => updateSettings({ fastTurtle: e.target.checked })} />
            <span>🐢 {t("settings.fastTurtle")}</span>
          </label>
        </div>
      )}
    </div>
  );
}
