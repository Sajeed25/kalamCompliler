import type { LangId } from "../languages";

export type Level = 1 | 2 | 3;

/** Text in each UI language. English is required; others fall back to English. */
export type Localized = { en: string; te?: string; hi?: string };

export interface Example {
  /** Unique within its language, URL-safe, never change once published (used for progress/badges). */
  id: string;
  level: Level;
  title: Localized;
  /** One short sentence about what the program does. */
  about: Localized;
  code: string;
  /** Uses input()/scanf/cin. */
  input?: boolean;
  /** Draws with turtle (Python only). */
  turtle?: boolean;
}

export type ExampleSet = Record<LangId, Example[]>;

export function localized(text: Localized, lang: string): string {
  return (text as Record<string, string | undefined>)[lang] ?? text.en;
}
