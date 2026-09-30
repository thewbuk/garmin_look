// Same drawing as src/app/icon.svg; keep them in sync.
export function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="5 14 54 36" className={className} aria-hidden>
      <path d="M9.6 43.9 20.8 33.8 27.7 38.6 38.9 20.5 46.9 30.1 54.4 25.3" fill="none" stroke="currentColor" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={38.9} cy={20.5} r={4.6} className="fill-signal" />
    </svg>
  );
}
