export type CLang = "c" | "cpp";

/** Same as the server: unbuffered stdout so "Age? " shows before the program waits. */
export const UNBUFFER_RUNTIME = `#include <stdio.h>
__attribute__((constructor)) static void kalam_unbuffer(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
}
`;

/** 128 MB memory cap (in 64 KiB pages) and an 8 MB stack for recursive programs. */
const LINK = ["-Wl,--max-memory=134217728", "-Wl,-z,stack-size=8388608"];

export function compileArgs(lang: CLang): { src: string; rt: string; args: string[] } {
  if (lang === "c") {
    return {
      src: "main.c",
      rt: "kalam_rt.c",
      args: ["clang", "-std=gnu17", "-O1", "-Wall", "-fno-color-diagnostics", "-ferror-limit=5", ...LINK, "main.c", "kalam_rt.c", "-o", "prog.wasm"],
    };
  }
  return {
    src: "main.cpp",
    rt: "kalam_rt.cpp",
    // The bundled libc++ is built without exception support.
    args: ["clang++", "-std=gnu++17", "-O1", "-Wall", "-fno-exceptions", "-fno-color-diagnostics", "-ferror-limit=5", ...LINK, "main.cpp", "kalam_rt.cpp", "-o", "prog.wasm"],
  };
}
