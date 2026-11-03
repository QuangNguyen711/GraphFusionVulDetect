export const Wordmark = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center gap-2 text-base text-ink ${className}`}>
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-signal" aria-hidden="true">
      <circle cx="4" cy="15" r="2.25" fill="currentColor" />
      <circle cx="10" cy="5" r="2.25" fill="currentColor" />
      <circle cx="16" cy="13" r="2.25" fill="currentColor" opacity="0.55" />
    </svg>
    GraphFusion
  </span>
);
