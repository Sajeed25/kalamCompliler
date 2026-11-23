/**
 * Kid-friendly error explainer.
 *
 * Turns a raw interpreter/compiler error into a message id + parameters. The
 * text for each id lives in the i18n files (errors.<id>) so it can be shown in
 * English, Telugu or Hindi. Rules are tried in order; the first match wins.
 *
 * To add a rule: add an entry to PYTHON_RULES or C_RULES, add the text for its
 * id to every locale file (src/i18n/locales/*.json -> "errors"), and add a test
 * in explain.test.ts.
 */
import type { ProgramError } from "../runners/types";
import type { LangId } from "../languages";

export interface Explanation {
  /** i18n key under "errors." */
  id: string;
  params: Record<string, string>;
  line?: number;
  column?: number;
}

interface Ctx {
  err: ProgramError;
  code: string;
  /** The text of the line the error points at (trimmed). */
  lineText: string;
  msg: string;
  raw: string;
}

type Params = Record<string, string | undefined>;
type Rule = { id: string; match: (c: Ctx) => Params | boolean | null | undefined };

// ---------------------------------------------------------------- helpers

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function isSubsequence(short: string, long: string): boolean {
  let i = 0;
  for (const ch of long) if (ch === short[i]) i++;
  return i === short.length;
}

/** Closest known word, if it's close enough to be a likely typo. */
export function closest(word: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  const lw = word.toLowerCase();
  for (const c of candidates) {
    if (c === word) continue;
    const lc = c.toLowerCase();
    let d = lc === lw ? 0.5 : levenshtein(lw, lc);
    // "cnt" for "count", "prnt" for "print": a short form with letters in the right order.
    if (lw.length >= 3 && lc.length - lw.length <= 3 && (isSubsequence(lw, lc) || isSubsequence(lc, lw))) d = Math.min(d, 1);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const limit = word.length <= 3 ? 1 : word.length <= 6 ? 2 : 3;
  return best && bestD <= limit ? best : null;
}

const PY_KNOWN = [
  "print", "input", "int", "float", "str", "len", "range", "list", "dict", "set", "tuple", "bool",
  "abs", "max", "min", "sum", "round", "sorted", "reversed", "enumerate", "zip", "type", "open",
  "True", "False", "None", "and", "or", "not", "if", "elif", "else", "for", "while", "def",
  "return", "import", "from", "break", "continue", "pass", "in", "is", "lambda", "class", "random",
  "turtle", "math", "time", "append",
];

function identifiers(code: string): Set<string> {
  return new Set(code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
}

function q(s: string | undefined): string {
  return (s ?? "").replace(/^['"‘’`]|['"‘’`]$/g, "");
}

// ---------------------------------------------------------------- Python

const PY_RULES: Rule[] = [
  // --- names
  {
    id: "py_name_bool",
    match: ({ err, msg }) => {
      const m = /name '(true|false|none|TRUE|FALSE|NONE)' is not defined/.exec(msg);
      if (err.type !== "NameError" || !m) return null;
      const w = m[1].toLowerCase();
      return { name: m[1], correct: w[0].toUpperCase() + w.slice(1) };
    },
  },
  {
    id: "py_name_typo",
    match: ({ err, msg, raw, code }) => {
      const m = /name '([^']+)' is not defined/.exec(msg);
      if (err.type !== "NameError" || !m) return null;
      const name = m[1];
      const hint = /Did you mean: '([^']+)'/.exec(raw)?.[1];
      const ids = identifiers(code);
      ids.delete(name);
      const suggestion = hint ?? closest(name, [...PY_KNOWN, ...ids]);
      return suggestion ? { name, suggestion } : null;
    },
  },
  {
    id: "py_name_quotes",
    match: ({ err, msg, lineText }) => {
      const m = /name '([^']+)' is not defined/.exec(msg);
      if (err.type !== "NameError" || !m) return null;
      // print(hello) — probably meant the text "hello"
      return new RegExp(`print\\s*\\(.*\\b${m[1]}\\b`).test(lineText) ? { name: m[1] } : null;
    },
  },
  {
    id: "py_name_undefined",
    match: ({ err, msg }) => {
      const m = /name '([^']+)' is not defined/.exec(msg);
      return err.type === "NameError" && m ? { name: m[1] } : null;
    },
  },
  {
    id: "py_unbound_local",
    match: ({ err, msg }) => {
      if (err.type !== "UnboundLocalError") return null;
      return { name: /'([^']+)'/.exec(msg)?.[1] ?? "" };
    },
  },
  // --- syntax: specific first
  {
    id: "py_smart_quotes",
    match: ({ msg }) => /invalid character '[“”‘’]'/.test(msg) || /invalid character/.test(msg) && /[“”‘’]/.test(msg),
  },
  {
    id: "py_invalid_char",
    match: ({ msg }) => {
      const m = /invalid character '(.)'/.exec(msg);
      return m ? { char: m[1] } : null;
    },
  },
  {
    id: "py_print_parens",
    match: ({ msg }) => /Missing parentheses in call to 'print'/.test(msg),
  },
  {
    id: "py_else_if",
    match: ({ err, lineText }) => err.kind === "compile" && /^\s*else\s+if\b/.test(lineText),
  },
  {
    id: "py_missing_colon",
    match: ({ msg, lineText }) => {
      if (!/expected ':'/.test(msg)) return null;
      const word = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/.exec(lineText)?.[1] ?? "";
      return { word };
    },
  },
  {
    id: "py_assign_in_if",
    match: ({ msg, lineText }) =>
      /Maybe you meant '==' or ':=' instead of '='/.test(msg) ||
      (/invalid syntax/.test(msg) && /^\s*(if|elif|while)\b[^=]*[^=!<>]=[^=]/.test(lineText)),
  },
  {
    id: "py_never_closed",
    match: ({ msg }) => {
      const m = /'([([{])' was never closed/.exec(msg);
      return m ? { open: m[1], close: { "(": ")", "[": "]", "{": "}" }[m[1]]! } : null;
    },
  },
  {
    id: "py_unmatched",
    match: ({ msg }) => {
      const m = /unmatched '([)\]}])'/.exec(msg);
      return m ? { close: m[1] } : null;
    },
  },
  {
    id: "py_bracket_mismatch",
    match: ({ msg }) => {
      const m = /closing parenthesis '(.)' does not match opening parenthesis '(.)'/.exec(msg);
      return m ? { close: m[1], open: m[2] } : null;
    },
  },
  {
    id: "py_unterminated_triple",
    match: ({ msg }) => /unterminated triple-quoted string/.test(msg),
  },
  {
    id: "py_unterminated_string",
    match: ({ msg }) => /unterminated string literal|EOL while scanning string literal/.test(msg),
  },
  {
    id: "py_expected_indent",
    match: ({ err, msg }) => err.type === "IndentationError" && /expected an indented block/.test(msg),
  },
  {
    id: "py_unexpected_indent",
    match: ({ msg }) => /unexpected indent/.test(msg),
  },
  {
    id: "py_unindent_mismatch",
    match: ({ msg }) => /unindent does not match any outer indentation level/.test(msg),
  },
  {
    id: "py_tabs_spaces",
    match: ({ err, msg }) => err.type === "TabError" || /inconsistent use of tabs and spaces/.test(msg),
  },
  {
    id: "py_number_name",
    match: ({ msg }) => /invalid decimal literal|invalid imaginary literal/.test(msg),
  },
  {
    id: "py_assign_literal",
    match: ({ msg }) => /cannot assign to (literal|function call|expression)/.test(msg),
  },
  {
    id: "py_outside_function",
    match: ({ msg }) => {
      const m = /'(return|yield)' outside function/.exec(msg);
      return m ? { word: m[1] } : null;
    },
  },
  {
    id: "py_outside_loop",
    match: ({ msg }) => {
      const m = /'(break|continue)' (outside loop|not properly in loop)/.exec(msg);
      return m ? { word: m[1] } : null;
    },
  },
  {
    id: "py_forgot_comma",
    match: ({ msg }) => /Perhaps you forgot a comma/.test(msg),
  },
  {
    id: "py_eof",
    match: ({ msg }) => /unexpected EOF|incomplete input/.test(msg),
  },
  {
    id: "py_keyword_name",
    match: ({ msg, lineText }) => {
      if (!/invalid syntax/.test(msg)) return null;
      const m = /^\s*(class|def|if|for|while|import|return|lambda|pass|in|is|not|and|or|global)\s*=/.exec(lineText);
      return m ? { word: m[1] } : null;
    },
  },
  // --- types
  {
    id: "py_concat_str_num",
    match: ({ msg }) => /can only concatenate str \(not "(int|float)"\) to str/.test(msg),
  },
  {
    id: "py_add_num_str",
    match: ({ msg }) => /unsupported operand type\(s\) for [-+*/%]+: '(int|float)' and 'str'|unsupported operand type\(s\) for [-/%]+: 'str' and '(int|float|str)'/.test(msg),
  },
  {
    id: "py_compare_str_num",
    match: ({ msg }) => /'[<>]=?' not supported between instances of '(str|int|float)' and '(str|int|float)'/.test(msg),
  },
  {
    id: "py_multiply_seq",
    match: ({ msg }) => /can't multiply sequence by non-int/.test(msg),
  },
  {
    id: "py_not_callable",
    match: ({ msg, code }) => {
      const m = /'(\w+)' object is not callable/.exec(msg);
      if (!m) return null;
      const shadowed = ["print", "input", "int", "str", "len", "list", "sum", "max", "min", "range"].find((f) =>
        new RegExp(`^\\s*${f}\\s*=[^=]`, "m").test(code),
      );
      return shadowed ? { type: m[1], name: shadowed, context: "shadow" } : { type: m[1], name: "" };
    },
  },
  {
    id: "py_missing_arg",
    match: ({ msg }) => {
      const m = /(\w+)\(\) missing (\d+) required positional argument/.exec(msg);
      return m ? { func: m[1], count: m[2] } : null;
    },
  },
  {
    id: "py_too_many_args",
    match: ({ msg }) => {
      const m = /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:were|was) given/.exec(msg);
      return m ? { func: m[1], expected: m[2], given: m[3] } : null;
    },
  },
  {
    id: "py_not_iterable",
    match: ({ msg }) => {
      const m = /'(int|float)' object is not iterable/.exec(msg);
      return m ? { type: m[1] } : null;
    },
  },
  {
    id: "py_not_subscriptable",
    match: ({ msg }) => {
      const m = /'(\w+)' object is not subscriptable/.exec(msg);
      return m ? { type: m[1] } : null;
    },
  },
  {
    id: "py_index_type",
    match: ({ msg }) => /(list|string|tuple) indices must be integers/.test(msg),
  },
  {
    id: "py_none_type",
    match: ({ msg }) => /'NoneType' object/.test(msg),
  },
  // --- values
  {
    id: "py_int_conversion",
    match: ({ msg }) => {
      const m = /invalid literal for int\(\) with base 10: (.*)$/.exec(msg);
      if (!m) return null;
      const typed = q(m[1]);
      const context = /^\s*-?\d+\.\d*\s*$/.test(typed) ? "decimal" : typed.trim() === "" ? "empty" : undefined;
      return context ? { typed, context } : { typed };
    },
  },
  {
    id: "py_float_conversion",
    match: ({ msg }) => {
      const m = /could not convert string to float: (.*)$/.exec(msg);
      return m ? { typed: q(m[1]) } : null;
    },
  },
  {
    id: "py_zero_division",
    match: ({ err }) => err.type === "ZeroDivisionError",
  },
  {
    id: "py_index_range",
    match: ({ msg }) => {
      const m = /(list|string|tuple) index out of range/.exec(msg);
      return m ? { kind: m[1] } : null;
    },
  },
  {
    id: "py_key_error",
    match: ({ err, msg }) => (err.type === "KeyError" ? { key: q(msg) } : null),
  },
  {
    id: "py_attribute",
    match: ({ err, msg, raw }) => {
      if (err.type !== "AttributeError") return null;
      const m = /'(\w+)' object has no attribute '(\w+)'|module '(\w+)' has no attribute '(\w+)'/.exec(msg);
      if (!m) return null;
      const owner = m[1] ?? m[3];
      const attr = m[2] ?? m[4];
      const suggestion =
        /Did you mean: '([^']+)'/.exec(raw)?.[1] ??
        closest(attr, ["append", "upper", "lower", "split", "strip", "replace", "forward", "backward", "left", "right", "penup", "pendown", "color", "circle", "randint", "choice", "sqrt"]) ??
        "";
      return suggestion ? { owner, attr, suggestion } : { owner, attr, context: "nosuggest" };
    },
  },
  {
    id: "py_module_missing",
    match: ({ err, msg }) => {
      if (err.type !== "ModuleNotFoundError") return null;
      return { module: /No module named '([^']+)'/.exec(msg)?.[1] ?? "" };
    },
  },
  {
    id: "py_import_name",
    match: ({ err, msg }) => {
      if (err.type !== "ImportError") return null;
      const m = /cannot import name '(\w+)' from '(\w+)'/.exec(msg);
      return m ? { name: m[1], module: m[2] } : { name: "", module: "" };
    },
  },
  {
    id: "py_recursion",
    match: ({ err }) => err.type === "RecursionError",
  },
  {
    id: "py_overflow",
    match: ({ err }) => err.type === "OverflowError",
  },
  {
    id: "py_turtle_color",
    match: ({ err, msg }) => err.type === "TurtleGraphicsError" && /color/.test(msg),
  },
  {
    id: "py_value_unpack",
    match: ({ msg }) => /(not enough|too many) values to unpack/.test(msg),
  },
  {
    id: "py_eof_input",
    match: ({ err }) => err.type === "EOFError",
  },
  // --- generic Python fallbacks
  { id: "py_generic_syntax", match: ({ err }) => err.type === "SyntaxError" || err.type === "IndentationError" },
  { id: "py_generic_type", match: ({ err }) => err.type === "TypeError" },
  { id: "py_generic_value", match: ({ err }) => err.type === "ValueError" },
];

// ---------------------------------------------------------------- C / C++

/** Pull the first compiler error out of gcc/g++ output. */
export function parseGccError(raw: string): { line?: number; column?: number; msg: string; lineText: string } {
  const re = /(?:^|[\s/])main\.(?:c|cpp|cc):(\d+):(\d+):\s*(?:fatal error|error):\s*(.*)$/m;
  const m = re.exec(raw);
  if (m) {
    // gcc prints the source line right after the message: "    5 |   printf("hi")"
    const after = raw.slice((m.index ?? 0) + m[0].length);
    const src = /^\s*\d+\s*\|(.*)$/m.exec(after)?.[1] ?? "";
    return { line: +m[1], column: +m[2], msg: m[3].trim(), lineText: src };
  }
  const link = /undefined reference to [`'‘]([^'’`]+)['’`]/.exec(raw);
  if (link) return { msg: `undefined reference to '${link[1]}'`, lineText: "" };
  return { msg: raw.split("\n").find((l) => l.trim()) ?? "", lineText: "" };
}

const HEADER_FOR: Record<string, string> = {
  printf: "stdio.h", scanf: "stdio.h", puts: "stdio.h", getchar: "stdio.h", putchar: "stdio.h", fgets: "stdio.h",
  malloc: "stdlib.h", free: "stdlib.h", rand: "stdlib.h", srand: "stdlib.h", exit: "stdlib.h", abs: "stdlib.h", atoi: "stdlib.h",
  strlen: "string.h", strcpy: "string.h", strcmp: "string.h", strcat: "string.h",
  sqrt: "math.h", pow: "math.h", sin: "math.h", cos: "math.h", floor: "math.h", ceil: "math.h", fabs: "math.h",
  time: "time.h", isdigit: "ctype.h", isalpha: "ctype.h", toupper: "ctype.h", tolower: "ctype.h", bool: "stdbool.h",
};
const CPP_HEADER_FOR: Record<string, string> = {
  cout: "iostream", cin: "iostream", endl: "iostream", cerr: "iostream", string: "string", getline: "string",
  vector: "vector", sort: "algorithm", max: "algorithm", min: "algorithm", swap: "utility", setw: "iomanip",
  setprecision: "iomanip", sqrt: "cmath", pow: "cmath", abs: "cmath", map: "map", set: "set",
};
const C_KEYWORDS = new Set(
  "int char float double void long short unsigned signed return if else for while do switch case break continue const struct include define main bool auto using namespace std".split(" "),
);
const KNOWN_C_HEADERS = ["stdio.h", "stdlib.h", "string.h", "math.h", "time.h", "ctype.h", "stdbool.h", "limits.h"];
const KNOWN_CPP_HEADERS = ["iostream", "string", "vector", "algorithm", "cmath", "iomanip", "map", "set", "cstdlib", "ctime", "cstdio", "bits/stdc++.h"];

function cRules(lang: LangId): Rule[] {
  const cpp = lang === "cpp";
  return [
    {
      id: "c_missing_semicolon",
      match: ({ msg }) => {
        const m = /expected ';' (before|at end of|after) ?(.*)$/.exec(msg);
        return m ? {} : /expected ';'/.test(msg);
      },
    },
    {
      id: "c_std_missing",
      match: ({ msg }) => {
        if (!cpp) return null;
        const m = /'(\w+)' was not declared in this scope; did you mean 'std::(\w+)'/.exec(msg);
        return m ? { name: m[1], header: CPP_HEADER_FOR[m[1]] ?? "iostream" } : null;
      },
    },
    {
      id: "c_cpp_missing_include",
      match: ({ msg, code }) => {
        if (!cpp) return null;
        const m = /'(\w+)' (?:was not declared in this scope|is not a member of 'std'|does not name a type)/.exec(msg);
        if (!m) return null;
        const header = CPP_HEADER_FOR[m[1]];
        if (!header || new RegExp(`#\\s*include\\s*<${header}>`).test(code)) return null;
        return { name: m[1], header };
      },
    },
    {
      id: "c_implicit_function_header",
      match: ({ msg, code }) => {
        const m = /implicit declaration of function '(\w+)'/.exec(msg);
        if (!m) return null;
        const header = HEADER_FOR[m[1]];
        if (!header || code.includes(`<${header}>`)) return null;
        return { name: m[1], header };
      },
    },
    {
      id: "c_name_typo",
      match: ({ msg, code }) => {
        const m =
          /implicit declaration of function '(\w+)'(?:.*did you mean '(\w+)')?/.exec(msg) ??
          /'(\w+)' undeclared(?:.*did you mean '(\w+)')?/.exec(msg) ??
          /'(\w+)' was not declared in this scope(?:; did you mean '(\w+)')?/.exec(msg);
        if (!m) return null;
        const gccHint = m[2] && !C_KEYWORDS.has(m[2]) ? m[2] : undefined;
        const suggestion =
          closest(m[1], [...identifiers(code)].filter((x) => x !== m[1] && !C_KEYWORDS.has(x))) ??
          gccHint ??
          closest(m[1], [...Object.keys(HEADER_FOR), ...Object.keys(CPP_HEADER_FOR), "main"].filter((x) => x !== m[1]));
        return suggestion ? { name: m[1], suggestion: suggestion.replace(/^std::/, "") } : null;
      },
    },
    {
      id: "c_undeclared",
      match: ({ msg }) => {
        const m = /'(\w+)' undeclared|'(\w+)' was not declared in this scope|implicit declaration of function '(\w+)'/.exec(msg);
        return m ? { name: m[1] ?? m[2] ?? m[3] } : null;
      },
    },
    {
      id: "c_bad_header",
      match: ({ msg }) => {
        const m = /([\w./+]+): No such file or directory/.exec(msg);
        if (!m) return null;
        const suggestion = closest(m[1], cpp ? [...KNOWN_CPP_HEADERS, ...KNOWN_C_HEADERS] : KNOWN_C_HEADERS) ?? "";
        return suggestion ? { header: m[1], suggestion } : { header: m[1], context: "nosuggest" };
      },
    },
    {
      id: "c_include_syntax",
      match: ({ msg }) => /#include expects "FILENAME" or <FILENAME>|invalid preprocessing directive/.test(msg),
    },
    {
      id: "c_unknown_type",
      match: ({ msg }) => {
        const m = /unknown type name '(\w+)'/.exec(msg);
        if (!m) return null;
        if (m[1] === "string" || m[1] === "bool") return { name: m[1], context: m[1] };
        return { name: m[1] };
      },
    },
    {
      id: "c_missing_brace_end",
      match: ({ msg }) => /expected '}' at end of input|expected declaration or statement at end of input/.test(msg),
    },
    {
      id: "c_missing_paren",
      match: ({ msg }) => /expected '\)' before|expected '\)' at end/.test(msg),
    },
    {
      id: "c_unterminated_string",
      match: ({ msg }) => /missing terminating (["']) character/.test(msg),
    },
    {
      id: "c_stray_char",
      match: ({ msg }) => /stray '\\?(3\d\d|\S)' in program/.test(msg),
    },
    {
      id: "c_main_missing",
      match: ({ raw }) => /undefined reference to [`'‘](main|WinMain)/.test(raw),
    },
    {
      id: "c_undefined_reference",
      match: ({ msg }) => {
        const m = /undefined reference to '(\w+)'/.exec(msg);
        return m ? { name: m[1] } : null;
      },
    },
    {
      id: "c_else_without_if",
      match: ({ msg }) => /'else' without a previous 'if'/.test(msg),
    },
    {
      id: "c_break_outside",
      match: ({ msg }) => /break statement not within loop or switch|continue statement not within a loop/.test(msg),
    },
    {
      id: "c_lvalue",
      match: ({ msg }) => /lvalue required as left operand of assignment/.test(msg),
    },
    {
      id: "c_redefinition",
      match: ({ msg }) => {
        const m = /(?:redefinition|redeclaration|conflicting declaration|conflicting types) (?:of )?(?:for )?'([^']+)'/.exec(msg);
        return m ? { name: m[1].replace(/^.*\s/, "") } : null;
      },
    },
    {
      id: "c_too_few_args",
      match: ({ msg }) => {
        const m = /too few arguments to function '([^']+)'/.exec(msg);
        return m ? { func: m[1].replace(/\(.*$/, "").replace(/^.*\s/, "") } : null;
      },
    },
    {
      id: "c_too_many_args",
      match: ({ msg }) => {
        const m = /too many arguments to function '([^']+)'/.exec(msg);
        return m ? { func: m[1].replace(/\(.*$/, "").replace(/^.*\s/, "") } : null;
      },
    },
    {
      id: "c_void_value",
      match: ({ msg }) => /void value not ignored|return-statement with a value, in function returning 'void'/.test(msg),
    },
    {
      id: "c_return_no_value",
      match: ({ msg }) => /return-statement with no value/.test(msg),
    },
    {
      id: "c_type_mismatch",
      match: ({ msg }) =>
        /incompatible types|invalid conversion from|cannot convert|incompatible type for argument|makes (integer|pointer) from (pointer|integer) without a cast/.test(msg),
    },
    {
      id: "c_invalid_operands",
      match: ({ msg }) => /invalid operands to binary|no match for 'operator[+\-*/]'/.test(msg),
    },
    {
      id: "c_cin_cout_arrows",
      match: ({ msg, lineText }) =>
        cpp && /no match for 'operator(<<|>>)'/.test(msg) && /\b(cin\s*<<|cout\s*>>)/.test(lineText),
    },
    {
      id: "c_subscript",
      match: ({ msg }) => /subscripted value is neither array nor pointer|invalid types .* for array subscript/.test(msg),
    },
    {
      id: "c_member_access",
      match: ({ msg }) => /request for member '(\w+)' in something not a structure|has no member named/.test(msg),
    },
    {
      id: "c_case_outside",
      match: ({ msg }) => /case label not within a switch|'default' label not within a switch/.test(msg),
    },
    {
      id: "c_duplicate_case",
      match: ({ msg }) => /duplicate case value/.test(msg),
    },
    {
      id: "c_jump_case",
      match: ({ msg }) => /jump to case label|crosses initialization/.test(msg),
    },
    {
      id: "c_expected_expression",
      match: ({ msg }) => /expected (expression|primary-expression) before/.test(msg),
    },
    {
      id: "c_expected_identifier",
      match: ({ msg }) => /expected identifier|expected unqualified-id|expected '=', ',', ';', 'asm' or '__attribute__'/.test(msg),
    },
    {
      id: "c_does_not_name_type",
      match: ({ msg }) => {
        const m = /'(\w+)' does not name a type/.exec(msg);
        return m ? { name: m[1] } : null;
      },
    },
    {
      id: "c_main_return_type",
      match: ({ msg }) => /'::main' must return 'int'|return type of 'main' is not 'int'/.test(msg),
    },
    {
      id: "c_string_literal_char",
      match: ({ msg }) => /multi-character character constant|character constant too long/.test(msg),
    },
    // ---- runtime problems (exit signals)
    { id: "c_segfault", match: ({ err }) => err.type === "SIGSEGV" || err.type === "SIGBUS" },
    { id: "c_div_zero", match: ({ err }) => err.type === "SIGFPE" },
    {
      id: "c_out_of_range",
      match: ({ raw }) => /std::out_of_range/.test(raw),
    },
    {
      id: "c_invalid_argument",
      match: ({ raw }) => /std::invalid_argument/.test(raw),
    },
    { id: "c_abort", match: ({ err }) => err.type === "SIGABRT" },
    {
      id: "c_exit_code",
      match: ({ err }) => (err.type === "exit" ? { code: /(-?\d+)/.exec(err.message)?.[1] ?? "?" } : null),
    },
    { id: "c_generic_compile", match: ({ err }) => err.kind === "compile" },
  ];
}

// ---------------------------------------------------------------- shared

const SHARED_RULES: Rule[] = [
  { id: "timeout", match: ({ err }) => err.kind === "timeout" },
  { id: "output_limit", match: ({ err }) => err.kind === "output-limit" },
  { id: "memory", match: ({ err }) => err.kind === "memory" || err.type === "MemoryError" },
  { id: "rate_limited", match: ({ err }) => err.type === "rate_limited" },
  { id: "busy", match: ({ err }) => err.type === "busy" },
  { id: "offline", match: ({ err }) => err.type === "offline" },
  { id: "server_setup", match: ({ err }) => err.type === "server_setup" },
  { id: "code_too_long", match: ({ err }) => err.type === "code_too_long" },
  { id: "python_load", match: ({ err }) => err.type === "LoadError" },
];

export function explainError(lang: LangId, err: ProgramError, code: string): Explanation {
  let line = err.line;
  let column = err.column;
  let msg = err.message ?? "";
  let lineText = "";
  if (lang !== "python" && err.kind === "compile") {
    // gcc uses curly quotes in UTF-8 locales: ‘x’ -> 'x'
    const g = parseGccError(err.raw.replace(/[‘’]/g, "'"));
    line = g.line ?? line;
    column = g.column ?? column;
    msg = g.msg;
    lineText = g.lineText;
  }
  if (!lineText && line) lineText = code.split("\n")[line - 1] ?? "";
  const ctx: Ctx = { err, code, lineText, msg, raw: err.raw ?? "" };
  const rules = [...SHARED_RULES, ...(lang === "python" ? PY_RULES : cRules(lang))];
  for (const r of rules) {
    const res = r.match(ctx);
    if (res) {
      const params: Record<string, string> = {};
      if (typeof res === "object") for (const [k, v] of Object.entries(res)) if (v !== undefined) params[k] = v;
      return { id: r.id, params, line, column };
    }
  }
  return { id: "generic", params: { type: err.type ?? "" }, line, column };
}

/** Friendly tips for gcc warnings that usually cause wrong answers or crashes. */
export function explainWarnings(rawText: string): Explanation[] {
  const raw = rawText.replace(/[‘’]/g, "'");
  const out: Explanation[] = [];
  const re = /main\.(?:c|cpp):(\d+):\d+:\s*warning:\s*(.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) && out.length < 3) {
    const line = +m[1];
    const w = m[2];
    if (/format '%\w+' expects argument of type '\w+ \*', but argument \d+ has type/.test(w))
      out.push({ id: "w_scanf_ampersand", params: {}, line });
    else if (/suggest parentheses around assignment used as truth value/.test(w))
      out.push({ id: "w_assign_in_if", params: {}, line });
    else if (/format '%(\w+)' expects argument of type '(\w+)', but argument \d+ has type '(\w+)'/.test(w))
      out.push({ id: "w_format_type", params: {}, line });
    else if (/control reaches end of non-void function/.test(w)) out.push({ id: "w_no_return", params: {}, line });
    else if (/is used uninitialized/.test(w)) {
      const name = /'(\w+)' is used uninitialized/.exec(w)?.[1] ?? "";
      out.push({ id: "w_uninitialized", params: { name }, line });
    } else if (/division by zero/.test(w)) out.push({ id: "w_div_zero", params: {}, line });
  }
  return out;
}

/** Every message id the explainer can return (used by tests to check translations exist). */
export const ALL_IDS = (() => {
  const ids = new Set<string>(["generic"]);
  for (const r of [...SHARED_RULES, ...PY_RULES, ...cRules("c"), ...cRules("cpp")]) ids.add(r.id);
  for (const w of ["w_scanf_ampersand", "w_assign_in_if", "w_format_type", "w_no_return", "w_uninitialized", "w_div_zero"]) ids.add(w);
  return [...ids];
})();
