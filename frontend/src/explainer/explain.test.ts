import { describe, expect, it } from "vitest";
import { ALL_IDS, closest, explainError, explainWarnings, parseGccError } from "./explain";
import type { ProgramError } from "../runners/types";
import en from "../i18n/locales/en.json";
import te from "../i18n/locales/te.json";
import hi from "../i18n/locales/hi.json";

const py = (type: string, message: string, extra: Partial<ProgramError> = {}, code = "") =>
  explainError("python", { kind: type.includes("Syntax") || type.includes("Indent") ? "compile" : "runtime", type, message, raw: `${type}: ${message}`, ...extra }, code);

const gcc = (lang: "c" | "cpp", raw: string, code = "") => explainError(lang, { kind: "compile", type: "error", message: "", raw }, code);

describe("Python rules", () => {
  it("suggests print for pritn (the spec example)", () => {
    const e = py("NameError", "name 'pritn' is not defined", { line: 1, raw: "NameError: name 'pritn' is not defined. Did you mean: 'print'?" }, 'pritn("hi")');
    expect(e).toMatchObject({ id: "py_name_typo", params: { name: "pritn", suggestion: "print" }, line: 1 });
  });
  it("suggests a variable the student defined", () => {
    const e = py("NameError", "name 'scroe' is not defined", { line: 2 }, "score = 5\nprint(scroe)");
    expect(e.params.suggestion).toBe("score");
  });
  it("explains true -> True", () => {
    expect(py("NameError", "name 'true' is not defined").id).toBe("py_name_bool");
  });
  it("suggests quotes for print(hello)", () => {
    expect(py("NameError", "name 'hello' is not defined", { line: 1 }, "print(hello)").id).toBe("py_name_quotes");
  });
  it("falls back to undefined name", () => {
    expect(py("NameError", "name 'zzqx' is not defined", { line: 1 }, "print(zzqx)\n").id).toBe("py_name_quotes");
    expect(py("NameError", "name 'zzqx' is not defined", { line: 1 }, "y = zzqx + 1\n").id).toBe("py_name_undefined");
  });
  it.each([
    ["SyntaxError", "expected ':'", "py_missing_colon"],
    ["SyntaxError", "'(' was never closed", "py_never_closed"],
    ["SyntaxError", "unmatched ')'", "py_unmatched"],
    ["SyntaxError", "closing parenthesis ']' does not match opening parenthesis '('", "py_bracket_mismatch"],
    ["SyntaxError", "unterminated string literal (detected at line 1)", "py_unterminated_string"],
    ["SyntaxError", "unterminated triple-quoted string literal (detected at line 3)", "py_unterminated_triple"],
    ["IndentationError", "expected an indented block after 'if' statement on line 1", "py_expected_indent"],
    ["IndentationError", "unexpected indent", "py_unexpected_indent"],
    ["IndentationError", "unindent does not match any outer indentation level", "py_unindent_mismatch"],
    ["TabError", "inconsistent use of tabs and spaces in indentation", "py_tabs_spaces"],
    ["SyntaxError", "Missing parentheses in call to 'print'. Did you mean print(...)?", "py_print_parens"],
    ["SyntaxError", "invalid character '“' (U+201C)", "py_smart_quotes"],
    ["SyntaxError", "invalid character '€' (U+20AC)", "py_invalid_char"],
    ["SyntaxError", "invalid decimal literal", "py_number_name"],
    ["SyntaxError", "cannot assign to literal here. Maybe you meant '==' instead of '='?", "py_assign_literal"],
    ["SyntaxError", "'return' outside function", "py_outside_function"],
    ["SyntaxError", "'break' outside loop", "py_outside_loop"],
    ["SyntaxError", "invalid syntax. Perhaps you forgot a comma?", "py_forgot_comma"],
    ["SyntaxError", "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", "py_assign_in_if"],
    ["SyntaxError", "incomplete input", "py_eof"],
    ["TypeError", 'can only concatenate str (not "int") to str', "py_concat_str_num"],
    ["TypeError", "unsupported operand type(s) for +: 'int' and 'str'", "py_add_num_str"],
    ["TypeError", "'>' not supported between instances of 'str' and 'int'", "py_compare_str_num"],
    ["TypeError", "can't multiply sequence by non-int of type 'float'", "py_multiply_seq"],
    ["TypeError", "greet() missing 1 required positional argument: 'name'", "py_missing_arg"],
    ["TypeError", "greet() takes 0 positional arguments but 1 was given", "py_too_many_args"],
    ["TypeError", "'int' object is not iterable", "py_not_iterable"],
    ["TypeError", "'int' object is not subscriptable", "py_not_subscriptable"],
    ["TypeError", "list indices must be integers or slices, not str", "py_index_type"],
    ["AttributeError", "'NoneType' object has no attribute 'append'", "py_none_type"],
    ["ValueError", "could not convert string to float: 'abc'", "py_float_conversion"],
    ["ZeroDivisionError", "division by zero", "py_zero_division"],
    ["IndexError", "list index out of range", "py_index_range"],
    ["KeyError", "'apple'", "py_key_error"],
    ["ModuleNotFoundError", "No module named 'numpy'", "py_module_missing"],
    ["ImportError", "cannot import name 'foo' from 'math'", "py_import_name"],
    ["RecursionError", "maximum recursion depth exceeded", "py_recursion"],
    ["OverflowError", "int too large to convert to float", "py_overflow"],
    ["TurtleGraphicsError", "bad color string: rde", "py_turtle_color"],
    ["ValueError", "not enough values to unpack (expected 3, got 2)", "py_value_unpack"],
    ["UnboundLocalError", "cannot access local variable 'x' where it is not associated with a value", "py_unbound_local"],
    ["SyntaxError", "something new and strange", "py_generic_syntax"],
  ])("%s: %s -> %s", (type, message, id) => {
    expect(py(type, message, { line: 1 }, "x = 1").id).toBe(id);
  });

  it("knows else if", () => {
    expect(py("SyntaxError", "expected ':'", { line: 3 }, "if a:\n  pass\nelse if b:\n  pass").id).toBe("py_else_if");
  });
  it("int() conversion variants", () => {
    expect(py("ValueError", "invalid literal for int() with base 10: 'abc'").params).toEqual({ typed: "abc" });
    expect(py("ValueError", "invalid literal for int() with base 10: '3.5'").params.context).toBe("decimal");
    expect(py("ValueError", "invalid literal for int() with base 10: ''").params.context).toBe("empty");
  });
  it("detects a shadowed built-in", () => {
    const e = py("TypeError", "'str' object is not callable", { line: 2 }, "input = 'x'\nname = input('?')");
    expect(e.params).toMatchObject({ context: "shadow", name: "input" });
  });
  it("attribute with suggestion", () => {
    const e = py("AttributeError", "'list' object has no attribute 'apend'", { raw: "AttributeError: 'list' object has no attribute 'apend'. Did you mean: 'append'?" });
    expect(e.params).toMatchObject({ owner: "list", attr: "apend", suggestion: "append" });
  });
});

describe("C / C++ rules (real gcc output)", () => {
  it("parses the first error line", () => {
    const g = parseGccError("main.c: In function 'main':\nmain.c:4:17: error: 'cnt' undeclared (first use in this function); did you mean 'int'?\n    4 |   printf(\"%d\", cnt);\n");
    expect(g).toMatchObject({ line: 4, column: 17 });
    expect(g.lineText).toContain("printf");
  });
  it("missing semicolon", () => {
    const e = gcc("c", "main.c:3:14: error: expected ';' before 'return'\n    3 |   printf(\"x\")\n");
    expect(e).toMatchObject({ id: "c_missing_semicolon", line: 3 });
  });
  it("handles curly quotes from UTF-8 locales", () => {
    expect(gcc("c", "main.c:3:14: error: expected \u2018;\u2019 before \u2018return\u2019\n").id).toBe("c_missing_semicolon");
  });
  it("prefers the student's own variable over gcc's odd hint", () => {
    const e = gcc("c", "main.c:4:17: error: 'cnt' undeclared (first use in this function); did you mean 'int'?\n", "int main(){ int count = 0; printf(\"%d\", cnt); }");
    expect(e).toMatchObject({ id: "c_name_typo", params: { name: "cnt", suggestion: "count" } });
  });
  it("misspelled printf", () => {
    const e = gcc("c", "main.c:2:3: error: implicit declaration of function 'prinf' [-Werror=implicit-function-declaration]\n", 'int main(){\n  prinf("hi");\n}');
    expect(e.params).toMatchObject({ name: "prinf", suggestion: "printf" });
  });
  it("missing #include <stdio.h>", () => {
    const e = gcc("c", "main.c:1:13: error: implicit declaration of function 'printf' [-Werror=implicit-function-declaration]\n", 'int main(){ printf("x"); }');
    expect(e).toMatchObject({ id: "c_implicit_function_header", params: { name: "printf", header: "stdio.h" } });
  });
  it("bad header name", () => {
    const e = gcc("c", "main.c:1:10: fatal error: stdio: No such file or directory\ncompilation terminated.\n");
    expect(e).toMatchObject({ id: "c_bad_header", params: { header: "stdio", suggestion: "stdio.h" } });
  });
  it("missing closing brace", () => {
    expect(gcc("c", "main.c:3:3: error: expected declaration or statement at end of input\n").id).toBe("c_missing_brace_end");
    expect(gcc("cpp", "main.cpp:3:2: error: expected '}' at end of input\n").id).toBe("c_missing_brace_end");
  });
  it("string in C", () => {
    expect(gcc("c", "main.c:3:3: error: unknown type name 'string'; did you mean 'stdin'?\n").params.context).toBe("string");
  });
  it("lvalue", () => {
    expect(gcc("c", "main.c:4:5: error: lvalue required as left operand of assignment\n").id).toBe("c_lvalue");
  });
  it("cin with the wrong arrows", () => {
    const raw = "main.cpp:5:7: error: no match for 'operator<<' (operand types are 'std::istream' and 'int')\n    5 |   cin << x;\n";
    expect(gcc("cpp", raw).id).toBe("c_cin_cout_arrows");
  });
  it("cout without iostream", () => {
    expect(gcc("cpp", "main.cpp:2:3: error: 'cout' was not declared in this scope\n", 'int main(){ cout << "hi"; }').params).toMatchObject({ name: "cout", header: "iostream" });
  });
  it("cout without std", () => {
    const e = gcc("cpp", "main.cpp:4:3: error: 'cout' was not declared in this scope; did you mean 'std::cout'?\n", "#include <iostream>\nint main(){ cout << 1; }");
    expect(e.id).toBe("c_std_missing");
  });
  it("else without if", () => {
    expect(gcc("c", "main.c:6:3: error: 'else' without a previous 'if'\n").id).toBe("c_else_without_if");
  });
  it("missing main (linker)", () => {
    expect(gcc("c", "/usr/bin/ld: Scrt1.o: in function `_start':\n(.text+0x1b): undefined reference to `main'\ncollect2: error: ld returned 1 exit status\n").id).toBe("c_main_missing");
  });
  it("smart quotes", () => {
    expect(gcc("c", "main.c:3:10: error: stray '\\342' in program\n").id).toBe("c_stray_char");
  });
  it.each([
    ["main.c:3:5: error: too few arguments to function 'add'", "c_too_few_args"],
    ["main.c:3:5: error: redefinition of 'x'", "c_redefinition"],
    ["main.c:3:5: error: break statement not within loop or switch", "c_break_outside"],
    ["main.c:3:5: error: duplicate case value", "c_duplicate_case"],
    ["main.c:3:5: error: expected expression before ')' token", "c_expected_expression"],
    ["main.c:3:5: error: missing terminating \" character", "c_unterminated_string"],
    ["main.c:3:5: error: subscripted value is neither array nor pointer nor vector", "c_subscript"],
    ["main.c:3:5: error: #include expects \"FILENAME\" or <FILENAME>", "c_include_syntax"],
  ])("%s", (raw, id) => {
    expect(gcc("c", raw + "\n").id).toBe(id);
  });
  it("runtime signals", () => {
    expect(explainError("c", { kind: "runtime", type: "SIGSEGV", message: "", raw: "" }, "").id).toBe("c_segfault");
    expect(explainError("c", { kind: "runtime", type: "SIGFPE", message: "", raw: "" }, "").id).toBe("c_div_zero");
    expect(explainError("cpp", { kind: "runtime", type: "SIGABRT", message: "", raw: "terminate called after throwing an instance of 'std::out_of_range'" }, "").id).toBe("c_out_of_range");
  });
});

describe("C / C++ rules (real clang output, used for in-browser compiling)", () => {
  it.each([
    ["c", "main.c:4:20: error: expected ';' after expression", "c_missing_semicolon", ""],
    ["c", "main.c:2:3: error: call to undeclared function 'prinf'; ISO C99 and later do not support implicit function declarations [-Wimplicit-function-declaration]", "c_name_typo", 'int main(){\n  prinf("hi");\n}'],
    ["c", "main.c:1:13: error: call to undeclared library function 'printf' with type 'int (const char *, ...)'; ISO C99 and later do not support implicit function declarations", "c_implicit_function_header", 'int main(){ printf("x"); }'],
    ["c", "main.c:1:10: fatal error: 'stdio' file not found", "c_bad_header", ""],
    ["c", "main.c:3:16: error: expected '}'", "c_missing_brace_end", ""],
    ["c", "main.c:3:3: error: use of undeclared identifier 'string'; did you mean 'stdin'?", "c_unknown_type", ""],
    ["c", "main.c:4:5: error: expression is not assignable", "c_lvalue", ""],
    ["c", "main.c:3:10: error: unexpected character <U+201C>", "c_stray_char", ""],
    ["c", "main.c:3:18: error: too few arguments to function call, expected 2, have 1", "c_too_few_args", "int add(int a,int b){return a+b;}\nint main(){\n  add(1);\n}"],
    ["c", "main.c:2:13: error: 'break' statement not in loop or switch statement", "c_break_outside", ""],
    ["cpp", "main.cpp:3:3: error: unknown type name 'string'; did you mean 'std::string'?", "c_std_missing", "#include <iostream>\n#include <string>\nint main(){ string s; }"],
    ["cpp", "main.cpp:2:3: error: use of undeclared identifier 'cout'", "c_cpp_missing_include", 'int main(){\n  cout << "hi";\n}'],
    ["cpp", "main.cpp:3:3: error: use of undeclared identifier 'cout'; did you mean 'std::cout'?", "c_std_missing", "#include <iostream>\nint main(){\n  cout << 1;\n}"],
  ])("%s: %s", (lang, raw, id, code) => {
    expect(gcc(lang as "c" | "cpp", raw + "\n", code).id).toBe(id);
  });
  it("names the function for clang's 'too few arguments to function call'", () => {
    const e = gcc("c", "main.c:3:3: error: too few arguments to function call, expected 2, have 1\n", "int add(int a,int b){return a+b;}\nint main(){\n  add(1);\n}");
    expect(e.params.func).toBe("add");
  });
  it("unterminated string is found even though clang reports it as a warning first", () => {
    const raw = "main.c:3:10: warning: missing terminating '\"' character [-Winvalid-pp-token]\nmain.c:3:10: error: expected expression\n";
    expect(gcc("c", raw)).toMatchObject({ id: "c_unterminated_string", line: 3 });
  });
  it("cin with the wrong arrows (clang)", () => {
    const raw = "main.cpp:5:7: error: invalid operands to binary expression ('istream' (aka 'basic_istream<char>') and 'int')\n    5 |   cin << x;\n";
    expect(gcc("cpp", raw).id).toBe("c_cin_cout_arrows");
  });
  it("missing main (wasm-ld)", () => {
    expect(gcc("c", "wasm-ld: error: crt1-command.o: undefined symbol: main\n").id).toBe("c_main_missing");
  });
  it("clang warnings become tips", () => {
    const raw = [
      "main.c:2:32: warning: format specifies type 'int *' but the argument has type 'int' [-Wformat]",
      "main.c:3:7: warning: using the result of an assignment as a condition without parentheses [-Wparentheses]",
      "main.c:4:9: warning: variable 'y' is uninitialized when used here [-Wuninitialized]",
    ].join("\n");
    expect(explainWarnings(raw).map((w) => w.id)).toEqual(["w_scanf_ampersand", "w_assign_in_if", "w_uninitialized"]);
  });
  it("browser compiler download failure", () => {
    expect(explainError("c", { kind: "system", type: "compiler_load", message: "", raw: "" }, "").id).toBe("compiler_load");
  });
});

describe("shared rules", () => {
  it("timeout uses the spec message", () => {
    expect(explainError("c", { kind: "timeout", message: "", raw: "" }, "").id).toBe("timeout");
    expect((en.errors as Record<string, string>).timeout).toBe("Your program ran for too long — maybe a loop never stops? 🔁");
  });
  it("rate limit and offline", () => {
    expect(explainError("c", { kind: "system", type: "rate_limited", message: "", raw: "" }, "").id).toBe("rate_limited");
    expect(explainError("cpp", { kind: "system", type: "offline", message: "", raw: "" }, "").id).toBe("offline");
  });
});

describe("warnings", () => {
  it("scanf without &", () => {
    const raw = "main.c:2:31: warning: format '%d' expects argument of type 'int *', but argument 2 has type 'int' [-Wformat=]\n";
    expect(explainWarnings(raw)[0]).toMatchObject({ id: "w_scanf_ampersand", line: 2 });
  });
  it("assignment in if", () => {
    expect(explainWarnings("main.c:4:7: warning: suggest parentheses around assignment used as truth value [-Wparentheses]\n")[0].id).toBe("w_assign_in_if");
  });
});

describe("closest()", () => {
  it("finds typos and abbreviations, ignores far words", () => {
    expect(closest("pirnt", ["print", "input"])).toBe("print");
    expect(closest("cnt", ["count", "main"])).toBe("count");
    expect(closest("banana", ["print", "input"])).toBeNull();
  });
});

describe("translations", () => {
  const locales = { en, te, hi } as Record<string, { errors: Record<string, string> }>;
  for (const [code, loc] of Object.entries(locales)) {
    it(`${code} has a message for every explainer id`, () => {
      const missing = ALL_IDS.filter((id) => !loc.errors[id]);
      expect(missing).toEqual([]);
    });
    it(`${code} keeps the same {{placeholders}} as English`, () => {
      for (const [k, v] of Object.entries((en as { errors: Record<string, string> }).errors)) {
        const want = (v.match(/{{\w+}}/g) ?? []).sort().join();
        const got = ((loc.errors[k] ?? "").match(/{{\w+}}/g) ?? []).sort().join();
        expect([k, got]).toEqual([k, want]);
      }
    });
  }
  it("all locales have the same keys", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    const base = keys(en).sort();
    expect(keys(te).sort()).toEqual(base);
    expect(keys(hi).sort()).toEqual(base);
  });
});
