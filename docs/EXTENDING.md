# Extending Kalam Compiler

## Add an example

Examples live in `frontend/src/examples/python.ts`, `c.ts` and `cpp.ts`. Add an object:

```ts
{
  id: "rainbow",                 // unique, URL-safe, never rename (stars are saved under it)
  level: 2,                      // 1 = Grades 3–5, 2 = Grades 6–8, 3 = Grade 9+
  turtle: true,                  // optional: shows 🐢 in the list
  input: false,                  // optional: shows ⌨️ (program asks for input)
  title: { en: "Rainbow", te: "ఇంద్రధనుస్సు", hi: "इंद्रधनुष" },   // te/hi optional
  about: { en: "Seven colourful arcs.", te: "...", hi: "..." },
  code: `import turtle
...
`,
},
```

The first example in each file is the one shown when a student opens that language.
Run `npm run dev` and open 📚 Examples to check it. Level badges update automatically.

## Add an activity

Activities are the project cards on the home page (`frontend/src/activities.ts`). Each points at an
existing example and adds a challenge:

```ts
{
  id: "turtle-house",          // unique, used in the link #/code/python?activity=turtle-house
  emoji: "🏠",
  lang: "python",
  exampleId: "turtle_square",  // must exist in src/examples/python.ts
  level: 1,
  title: { en: "Draw a house", te: "…", hi: "…" },
  challenge: { en: "Add a triangle roof on top of the square.", te: "…", hi: "…" },
},
```

`npx vitest run` checks the example exists and all three languages are filled in.

## Add a UI language

Example: Kannada (`kn`).

1. Copy `frontend/src/i18n/locales/en.json` to `kn.json` and translate the **values** only.
   Keep keys, `{{placeholders}}` and emoji. Code words (`print`, `int`, `#include`) stay in English.
2. In `frontend/src/i18n/index.ts`, add `kn: () => import("./locales/kn.json")` to `LOADERS`
   and `{ code: "kn", label: "ಕನ್ನಡ" }` to `UI_LANGUAGES`.
3. In `frontend/src/lib/settings.ts`, add `"kn"` to the `uiLang` type and to `detectLang()`.
4. Add a font if the script needs one: `npm i @fontsource/noto-sans-kannada`, import its
   `400.css`/`700.css` in `src/index.css`, and add an `html[lang="kn"] { --ui-font: ... }` rule.
5. Add the locale to the `translations` tests in `src/explainer/explain.test.ts`. They check
   that every key and placeholder exists. Run `npx vitest run`.

Example titles can get a `kn` field (`Localized` type in `examples/types.ts`).

## Add an error explanation

1. Reproduce the error and copy the real message (for C/C++ run gcc with `LC_ALL=C`).
2. Add a rule to `PY_RULES` or `cRules()` in `frontend/src/explainer/explain.ts`. Rules are tried
   in order (specific ones first). A rule returns `true`, or an object of parameters for the message:

```ts
{
  id: "py_float_to_int",
  match: ({ msg }) => {
    const m = /'float' object cannot be interpreted as an integer/.exec(msg);
    return m ? {} : null;
  },
},
```

3. Add `"py_float_to_int": "…"` to `errors` in **en.json, te.json and hi.json**.
   A variant of a message can use i18next context: return `{ context: "short" }` and add `"<id>_short"`.
4. Add a test case in `explain.test.ts`.

## Add a programming language

Example: **Java** through Piston.

**Frontend**
1. `src/languages.ts`: add `java: { id: "java", name: "Java", emoji: "☕", ext: "java", openExts: ["java"], engine: "server", cardClass: "from-amber-400 to-orange-500" }` and extend `LangId`.
2. `src/components/CodeEditor.tsx`: syntax highlighting, e.g. `npm i @codemirror/lang-java` and return `java()` in `langExtension`.
3. `src/examples/java.ts` with at least one example, registered in `examples/index.ts`.
4. Card text `home.cards.java` in all locale files. Error rules if you want them (otherwise the generic message is shown).

**Backend**
1. `app/executors/base.py`: add `"java"` to `Language` and `SOURCE_NAME` (`"Main.java"`).
2. `app/executors/piston.py`: add `"java": "java"` to `PISTON_LANG`. Piston has a `java` package; install it by
   adding `("java", "15.0.2")` to `PACKAGES` in `app/tools/piston_setup.py`.
3. `app/runs.py`: allow `"java"` in the language check. `routers/assignments.py`: add it to the `Literal` types.
4. For the local executor, add a compile/run command in `LocalExecutor` (javac + java). Java needs a
   larger `memory_mb` for the JVM.
5. Add tests to `tests/test_api.py` and an E2E Hello World in `frontend/e2e/hello.spec.ts`.

## Change limits

Edit `backend/config/limits.yaml`. Nothing else needs to change.
