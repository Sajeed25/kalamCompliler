import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { TurtleOp } from "../runners/turtleTypes";

/** World coordinates go from -WORLD/2 to +WORLD/2 on both axes, (0,0) in the middle, y up. */
const WORLD = 600;

export interface TurtleCanvasHandle {
  push(ops: TurtleOp[]): void;
  reset(): void;
  /** Skip the animation and draw everything that is queued right now. */
  finishNow(): void;
}

interface Sprite {
  x: number;
  y: number;
  h: number;
  visible: boolean;
  speed: number;
  pc: string;
  fc: string;
  shape: string;
}

type MoveOp = Extract<TurtleOp, { o: "move" }> & { from?: [number, number] };

/** Pixels moved per animation frame for turtle speed 1..10 (0 = instant). */
function pxPerFrame(speed: number): number {
  if (speed === 0) return Infinity;
  return [0, 2, 3, 4, 6, 8, 11, 15, 22, 34, 60][Math.max(1, Math.min(10, speed))];
}

const TurtleCanvas = forwardRef<TurtleCanvasHandle, { label: string }>(function TurtleCanvas({ label }, ref) {
  const drawRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    queue: [] as TurtleOp[],
    progress: 0, // pixels already drawn of the first queued line/move
    sprites: new Map<number, Sprite>(),
    bg: "white",
    raf: 0,
    // Each turtle's own strokes so turtle.clear() only clears its drawings.
    strokes: new Map<number, ((ctx: CanvasRenderingContext2D) => void)[]>(),
  });

  const sprite = (id: number): Sprite => {
    const s = state.current.sprites;
    let sp = s.get(id);
    if (!sp) {
      sp = { x: 0, y: 0, h: 0, visible: true, speed: 3, pc: "black", fc: "black", shape: "classic" };
      s.set(id, sp);
    }
    return sp;
  };

  const ctx2d = (c: HTMLCanvasElement | null) => {
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return null;
    const scale = c.width / WORLD;
    ctx.setTransform(scale, 0, 0, -scale, c.width / 2, c.height / 2); // y up, origin centre
    return ctx;
  };

  const record = (t: number, fn: (ctx: CanvasRenderingContext2D) => void) => {
    const st = state.current;
    if (!st.strokes.has(t)) st.strokes.set(t, []);
    st.strokes.get(t)!.push(fn);
    const ctx = ctx2d(drawRef.current);
    if (ctx) fn(ctx);
  };

  const redrawAll = () => {
    const c = drawRef.current;
    const ctx = ctx2d(c);
    if (!ctx || !c) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    for (const list of state.current.strokes.values()) for (const fn of list) fn(ctx);
  };

  const strokeLine = (x1: number, y1: number, x2: number, y2: number, color: string, w: number) => (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const drawSprites = () => {
    const c = spriteRef.current;
    const ctx = ctx2d(c);
    if (!ctx || !c) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    for (const sp of state.current.sprites.values()) if (sp.visible) drawShape(ctx, sp);
  };

  const drawShape = (ctx: CanvasRenderingContext2D, sp: Sprite) => {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((sp.h * Math.PI) / 180);
    ctx.fillStyle = sp.fc;
    ctx.strokeStyle = sp.pc;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (sp.shape === "circle") ctx.arc(0, 0, 8, 0, Math.PI * 2);
    else if (sp.shape === "square") ctx.rect(-8, -8, 16, 16);
    else if (sp.shape === "turtle") {
      ctx.ellipse(0, 0, 9, 7, 0, 0, Math.PI * 2);
      ctx.moveTo(14, 0);
      ctx.arc(12, 0, 3.5, 0, Math.PI * 2);
    } else {
      // "classic" / "arrow" / "triangle"
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, 7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, -7);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  /** Apply one op instantly (non-moving ops, or the end of a move). */
  const applyOp = (op: TurtleOp) => {
    const st = state.current;
    switch (op.o) {
      case "line": {
        const [x1, y1, x2, y2] = op.a;
        record(op.t, strokeLine(x1, y1, x2, y2, op.c, op.w));
        Object.assign(sprite(op.t), { x: x2, y: y2 });
        break;
      }
      case "move":
        Object.assign(sprite(op.t), { x: op.a[0], y: op.a[1] });
        break;
      case "turn":
        sprite(op.t).h = op.h;
        break;
      case "fill":
        record(op.t, (ctx) => {
          ctx.fillStyle = op.c;
          ctx.beginPath();
          op.p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          ctx.fill();
          for (const l of op.s) strokeLine(l.a[0], l.a[1], l.a[2], l.a[3], l.c, l.w)(ctx);
        });
        break;
      case "dot":
        record(op.t, (ctx) => {
          ctx.fillStyle = op.c;
          ctx.beginPath();
          ctx.arc(op.a[0], op.a[1], op.r / 2, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      case "text":
        record(op.t, (ctx) => {
          ctx.save();
          ctx.scale(1, -1);
          ctx.fillStyle = op.c;
          ctx.font = `${Math.max(6, op.f * 1.35)}px sans-serif`;
          ctx.textAlign = op.al === "center" ? "center" : op.al === "right" ? "right" : "left";
          ctx.fillText(op.x, op.a[0], -op.a[1]);
          ctx.restore();
        });
        break;
      case "stamp": {
        const sp = { ...sprite(op.t) };
        record(op.t, (ctx) => drawShape(ctx, sp));
        break;
      }
      case "bg":
        st.bg = op.c;
        if (drawRef.current?.parentElement) drawRef.current.parentElement.style.background = op.c;
        break;
      case "clear":
        st.strokes.delete(op.t);
        redrawAll();
        break;
      case "speed":
        sprite(op.t).speed = op.v;
        break;
      case "vis":
        sprite(op.t).visible = op.v;
        break;
      case "look":
        Object.assign(sprite(op.t), { pc: op.pc, fc: op.fc, shape: op.sh });
        break;
    }
  };

  const tick = () => {
    const st = state.current;
    st.raf = 0;
    let guard = 0;
    // Budget per frame comes from the first moving turtle's speed.
    let budget = -1;
    while (st.queue.length && guard++ < 5000) {
      const op = st.queue[0];
      if (op.o === "line" || op.o === "move") {
        const sp = sprite(op.t);
        if (budget < 0) budget = pxPerFrame(sp.speed);
        if (op.o === "move" && !(op as MoveOp).from) (op as MoveOp).from = [sp.x, sp.y];
        const [x1, y1] = op.o === "line" ? [op.a[0], op.a[1]] : (op as MoveOp).from!;
        const [x2, y2] = op.o === "line" ? [op.a[2], op.a[3]] : op.a;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const remaining = len - st.progress;
        if (remaining > budget) {
          // Draw part of the line this frame.
          const f0 = st.progress / len;
          const f1 = (st.progress + budget) / len;
          if (op.o === "line") {
            const px = (f: number) => x1 + (x2 - x1) * f;
            const py = (f: number) => y1 + (y2 - y1) * f;
            const ctx = ctx2d(drawRef.current);
            if (ctx) strokeLine(px(f0), py(f0), px(f1), py(f1), op.c, op.w)(ctx);
            Object.assign(sp, { x: px(f1), y: py(f1) });
          } else {
            Object.assign(sp, { x: x1 + (x2 - x1) * f1, y: y1 + (y2 - y1) * f1 });
          }
          st.progress += budget;
          break;
        }
        budget -= remaining;
        st.progress = 0;
        st.queue.shift();
        if (op.o === "line") {
          // Partial strokes are already on the canvas; record the full line for redraws.
          const fn = strokeLine(x1, y1, x2, y2, op.c, op.w);
          if (!st.strokes.has(op.t)) st.strokes.set(op.t, []);
          st.strokes.get(op.t)!.push(fn);
          const ctx = ctx2d(drawRef.current);
          if (ctx) fn(ctx);
          Object.assign(sp, { x: x2, y: y2 });
        } else applyOp(op);
        if (budget <= 0) break;
      } else {
        st.queue.shift();
        applyOp(op);
      }
    }
    drawSprites();
    if (st.queue.length) st.raf = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (!state.current.raf) state.current.raf = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    push(ops) {
      state.current.queue.push(...ops);
      schedule();
    },
    reset() {
      const st = state.current;
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.queue = [];
      st.progress = 0;
      st.sprites.clear();
      st.strokes.clear();
      st.bg = "white";
      if (drawRef.current?.parentElement) drawRef.current.parentElement.style.background = "white";
      redrawAll();
      drawSprites();
    },
    finishNow() {
      const st = state.current;
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.progress = 0;
      const q = st.queue;
      st.queue = [];
      for (const op of q) applyOp(op);
      drawSprites();
    },
  }));

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [drawRef.current, spriteRef.current]) if (c) c.width = c.height = Math.round(WORLD * dpr);
    return () => cancelAnimationFrame(state.current.raf);
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border-2 border-[var(--border)] bg-white">
      <canvas ref={drawRef} role="img" aria-label={label} className="absolute inset-0 h-full w-full" />
      <canvas ref={spriteRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  );
});

export default TurtleCanvas;
