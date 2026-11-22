import { useEffect, useRef, type ReactNode } from "react";

/** Accessible dialog using the native <dialog> element (focus trap + Escape built in). */
export default function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="card m-auto max-h-[90vh] overflow-auto p-0 backdrop:bg-black/40"
      style={{ color: "var(--text)", width: `min(94vw, ${wide ? 900 : 520}px)` }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3" style={{ background: "var(--surface)", borderBottom: "2px solid var(--border)" }}>
        <h2 className="text-xl font-bold">{title}</h2>
        <button className="btn" onClick={onClose} aria-label="Close">
          ✖
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
