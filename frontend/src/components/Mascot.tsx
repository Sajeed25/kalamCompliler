/** "Kalam" — the friendly robot helper. An original, simple illustration. */
export function KalamFace({ mood = "happy", size = 64 }: { mood?: "happy" | "think" | "oops" | "party"; size?: number }) {
  const mouth =
    mood === "oops" ? "M24 44 q8 -6 16 0" : mood === "think" ? "M25 43 h14" : "M23 41 q9 9 18 0";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <line x1="32" y1="4" x2="32" y2="13" stroke="#1d5fd1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="4" fill={mood === "oops" ? "#ef5350" : "#fbbf24"} />
      <rect x="8" y="13" width="48" height="42" rx="14" fill="#5b9bff" />
      <rect x="13" y="19" width="38" height="30" rx="10" fill="#eaf3ff" />
      <circle cx="24" cy="31" r="4.5" fill="#1b2433" />
      <circle cx="40" cy="31" r="4.5" fill="#1b2433" />
      <circle cx="25.5" cy="29.5" r="1.4" fill="#fff" />
      <circle cx="41.5" cy="29.5" r="1.4" fill="#fff" />
      <path d={mouth} stroke="#1b2433" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="2" y="27" width="6" height="14" rx="3" fill="#1d5fd1" />
      <rect x="56" y="27" width="6" height="14" rx="3" fill="#1d5fd1" />
      {mood === "party" && <path d="M48 8 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#fbbf24" />}
    </svg>
  );
}

export default function Mascot({ text, mood = "happy" }: { text: string; mood?: "happy" | "think" | "oops" | "party" }) {
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <div className="kalam-bob">
        <KalamFace mood={mood} size={56} />
      </div>
      <div
        className="relative rounded-2xl px-4 py-3 text-[15px] leading-snug"
        style={{ background: "var(--tip-bg)", border: "2px solid var(--border)" }}
      >
        <span className="sr-only">Kalam: </span>
        {text}
      </div>
    </div>
  );
}
