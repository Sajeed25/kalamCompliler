import type { ExampleSet, Example } from "./types";
import type { LangId } from "../languages";
import { PYTHON_EXAMPLES } from "./python";
import { C_EXAMPLES } from "./c";
import { CPP_EXAMPLES } from "./cpp";

export const EXAMPLES: ExampleSet = {
  python: PYTHON_EXAMPLES,
  c: C_EXAMPLES,
  cpp: CPP_EXAMPLES,
};

export function getExample(lang: LangId, id: string | null | undefined): Example {
  return EXAMPLES[lang].find((e) => e.id === id) ?? EXAMPLES[lang][0];
}

export * from "./types";
