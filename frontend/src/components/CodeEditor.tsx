import { useEffect, useRef } from "react";
import { EditorState, Compartment, StateEffect, StateField, type Extension } from "@codemirror/state";
import {
  EditorView,
  Decoration,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  type DecorationSet,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
  indentUnit,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { tags as t } from "@lezer/highlight";
import type { LangId } from "../languages";

// Colours come from CSS variables so light/dark themes switch without rebuilding the editor.
const kidHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "var(--syn-keyword)", fontWeight: "600" },
  { tag: [t.string, t.special(t.string), t.character], color: "var(--syn-string)" },
  { tag: [t.number, t.bool, t.null], color: "var(--syn-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--syn-function)" },
  { tag: [t.typeName, t.className, t.standard(t.typeName)], color: "var(--syn-type)" },
  { tag: [t.processingInstruction, t.meta], color: "var(--syn-meta)" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--syn-punct)" },
]);

const editorTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "var(--code-font-size)", backgroundColor: "var(--editor-bg)", color: "var(--editor-fg)" },
  ".cm-scroller": { fontFamily: "var(--code-font)", lineHeight: "1.55" },
  ".cm-content": { caretColor: "var(--editor-caret)", padding: "10px 0" },
  ".cm-cursor": { borderLeftColor: "var(--editor-caret)", borderLeftWidth: "3px" },
  ".cm-gutters": { backgroundColor: "var(--editor-gutter-bg)", color: "var(--editor-gutter-fg)", border: "none" },
  ".cm-activeLine": { backgroundColor: "var(--editor-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--editor-active-line)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "var(--editor-selection) !important" },
  ".cm-matchingBracket": { backgroundColor: "var(--editor-bracket)", outline: "1px solid var(--editor-caret)" },
  ".cm-error-line": { backgroundColor: "var(--editor-error-line)", boxShadow: "inset 4px 0 0 var(--danger)" },
});

// ---- error line highlight ----
const setErrorLine = StateEffect.define<number | null>();
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    if (tr.docChanged) deco = Decoration.none;
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value == null || e.value < 1 || e.value > tr.state.doc.lines) deco = Decoration.none;
        else {
          const line = tr.state.doc.line(e.value);
          deco = Decoration.set([Decoration.line({ class: "cm-error-line" }).range(line.from)]);
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function langExtension(lang: LangId): Extension {
  return lang === "python" ? [python(), indentUnit.of("    ")] : [cpp(), indentUnit.of("    ")];
}

interface Props {
  value: string;
  lang: LangId;
  onChange: (code: string) => void;
  onRun?: () => void;
  errorLine?: number | null;
  readOnly?: boolean;
  ariaLabel: string;
}

export default function CodeEditor({ value, lang, onChange, onRun, errorLine, readOnly, ariaLabel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const roComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(kidHighlight),
        errorLineField,
        EditorState.tabSize.of(4),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current?.();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        langComp.current.of(langExtension(lang)),
        roComp.current.of(EditorState.readOnly.of(!!readOnly)),
        editorTheme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          autocapitalize: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current! });
    return () => view.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (Open file, Reset example) replace the document.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: langComp.current.reconfigure(langExtension(lang)) });
  }, [lang]);

  useEffect(() => {
    view.current?.dispatch({ effects: roComp.current.reconfigure(EditorState.readOnly.of(!!readOnly)) });
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const effects: StateEffect<unknown>[] = [setErrorLine.of(errorLine ?? null)];
    if (errorLine && errorLine >= 1 && errorLine <= v.state.doc.lines) {
      effects.push(EditorView.scrollIntoView(v.state.doc.line(errorLine).from, { y: "center" }));
    }
    v.dispatch({ effects });
  }, [errorLine]);

  return <div ref={host} dir="ltr" className="h-full min-h-0 overflow-hidden" data-testid="code-editor" />;
}
