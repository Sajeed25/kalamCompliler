/** Drawing operations emitted by the Python `turtle` shim (turtle.py). */
export type TurtleOp =
  | { o: "line"; t: number; a: [number, number, number, number]; c: string; w: number }
  | { o: "move"; t: number; a: [number, number] }
  | { o: "turn"; t: number; h: number }
  | { o: "fill"; t: number; p: [number, number][]; c: string; s: TurtleLine[] }
  | { o: "dot"; t: number; a: [number, number]; r: number; c: string }
  | { o: "text"; t: number; a: [number, number]; x: string; c: string; f: number; al: string }
  | { o: "stamp"; t: number }
  | { o: "bg"; c: string }
  | { o: "clear"; t: number }
  | { o: "speed"; t: number; v: number }
  | { o: "vis"; t: number; v: boolean }
  | { o: "look"; t: number; pc: string; fc: string; sh: string };

export type TurtleLine = Extract<TurtleOp, { o: "line" }>;
