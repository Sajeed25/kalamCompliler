import type { TurtleOp } from "./turtleTypes";

/** A problem the program hit. `raw` is the original, expert-level message. */
export interface ProgramError {
  kind: "compile" | "runtime" | "timeout" | "output-limit" | "memory" | "system";
  /** e.g. "NameError", "error" (gcc), "SyntaxError" */
  type?: string;
  message: string;
  /** 1-based line in the student's code, if known. */
  line?: number;
  column?: number;
  raw: string;
}

export interface RunResult {
  ok: boolean;
  stopped?: boolean;
  error?: ProgramError;
  /** Wall-clock milliseconds. */
  timeMs?: number;
}

export type RunEvent =
  | { type: "status"; status: "loading" | "compiling" | "running" }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "input-request" }
  /** Downloading something big the first time (e.g. the in-browser C/C++ compiler). */
  | { type: "progress"; loaded: number; total: number }
  | { type: "turtle"; ops: TurtleOp[] };

export interface Runner {
  /** Start loading heavy assets early (e.g. Pyodide) so the first Run is fast. */
  preload(): void;
  run(code: string, onEvent: (e: RunEvent) => void): Promise<RunResult>;
  /** Send one line typed by the student to a program waiting for input. */
  sendInput(line: string): void;
  stop(): void;
}
