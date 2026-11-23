import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ACTIVITIES } from "./activities";
import { EXAMPLES } from "./examples";
import { LANGUAGES, LANG_IDS } from "./languages";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Reads `--name: #hex;` from the light (:root) or dark (.dark) token block of index.css. */
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
function token(block: ":root" | ".dark", name: string): string {
  const read = (b: string, n: string): string | null => {
    const start = css.indexOf(`${b} {`);
    const body = css.slice(start, css.indexOf("\n}", start));
    return new RegExp(`--${n}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? null;
  };
  // dark mode inherits anything it doesn't override from :root
  let value = (block === ".dark" ? read(".dark", name) : null) ?? read(":root", name);
  for (let i = 0; value && value.startsWith("var(") && i < 5; i++) {
    const ref = /var\(--([\w-]+)\)/.exec(value)![1];
    value = (block === ".dark" ? read(".dark", ref) : null) ?? read(":root", ref);
  }
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error(`token --${name} in ${block}: ${value}`);
  return value;
}

describe("activities", () => {
  it("each points at an existing example and has all three languages", () => {
    for (const a of ACTIVITIES) {
      expect(EXAMPLES[a.lang].some((e) => e.id === a.exampleId), `${a.id} -> ${a.exampleId}`).toBe(true);
      for (const lang of ["en", "te", "hi", "ur"] as const) {
        expect(a.title[lang], `${a.id} title ${lang}`).toBeTruthy();
        expect(a.challenge[lang], `${a.id} challenge ${lang}`).toBeTruthy();
      }
    }
    expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
  });
});

describe("examples", () => {
  it("every example has a title and description in English, Telugu, Hindi and Urdu", () => {
    for (const lang of LANG_IDS)
      for (const e of EXAMPLES[lang])
        for (const l of ["en", "te", "hi", "ur"] as const) {
          expect(e.title[l], `${lang}/${e.id} title ${l}`).toBeTruthy();
          expect(e.about[l], `${lang}/${e.id} about ${l}`).toBeTruthy();
        }
  });
  it("CBSE programs cover every Computer Science chapter of Classes 11 and 12", () => {
    const has = (cls: number, ch: string) => EXAMPLES.python.some((e) => e.cbse?.cls === cls && e.cbse.chapter === ch);
    for (const ch of ["basics", "flow", "strings", "lists", "tuples", "dictionaries", "modules"]) expect(has(11, ch), `Class 11 ${ch}`).toBe(true);
    for (const ch of ["functions", "exceptions", "files", "stack"]) expect(has(12, ch), `Class 12 ${ch}`).toBe(true);
    expect(EXAMPLES.python.filter((e) => e.cbse).length).toBeGreaterThanOrEqual(20);
  });
  it("example ids are unique per language", () => {
    for (const lang of LANG_IDS) expect(new Set(EXAMPLES[lang].map((e) => e.id)).size).toBe(EXAMPLES[lang].length);
  });
});

describe("Robokalam colours are readable (WCAG AA)", () => {
  it("language cards", () => {
    for (const id of LANG_IDS) expect(contrast(LANGUAGES[id].card.fg, LANGUAGES[id].card.bg), id).toBeGreaterThanOrEqual(4.5);
  });
  for (const block of [":root", ".dark"] as const) {
    it(`${block} theme text pairs`, () => {
      const pairs: [string, string][] = [
        ["text", "bg"],
        ["text", "surface"],
        ["muted", "surface"],
        ["primary-text", "primary"],
        ["run-text", "run"],
        ["stop-text", "stop"],
        ["link", "surface"],
        ["screen-fg", "screen-bg"],
        ["screen-input", "screen-bg"],
        ["editor-fg", "editor-bg"],
        ["syn-keyword", "editor-bg"],
        ["syn-string", "editor-bg"],
        ["syn-number", "editor-bg"],
        ["syn-comment", "editor-bg"],
        ["syn-function", "editor-bg"],
        ["syn-type", "editor-bg"],
      ];
      for (const [fg, bg] of pairs) {
        const fgHex = token(block, fg);
        const bgHex = token(block, bg);
        expect(contrast(fgHex, bgHex), `${block} ${fg} ${fgHex} on ${bg} ${bgHex}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
