/*
 * Illustrations des etats vides de la boite de reception : un livre ouvert
 * violet ("Messages marques") et une montre connectee ("Rappels"), dans les
 * teintes violet / rose de la video de reference.
 */

export function InboxBookIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bk-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#c04ad9" />
        </linearGradient>
        <linearGradient id="bk-page" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9e4ff" />
          <stop offset="1" stopColor="#a8a0e8" />
        </linearGradient>
      </defs>
      <path d="M10 34 56 18l46 16v44L56 94 10 78Z" fill="#4c3aa8" />
      <path d="M12 30 56 14v70L12 70Z" fill="url(#bk-page)" />
      <path d="M100 30 56 14v70l44-14Z" fill="#c9c2f5" />
      <path d="M56 14 56 84" stroke="#7a6ad8" strokeWidth="2" />
      <path d="M22 38l28-9M22 46l28-9M22 54l28-9" stroke="#8b7fe0" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 38 62 29M90 46 62 37" stroke="#9a8fe8" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 6h22v34l-11-7-11 7Z" fill="url(#bk-cover)" transform="rotate(-6 41 20)" />
    </svg>
  );
}

export function InboxWatchIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 112" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wt-case" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cf2" />
          <stop offset="1" stopColor="#c04ad9" />
        </linearGradient>
        <linearGradient id="wt-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bcd0ff" />
          <stop offset="1" stopColor="#7e9bf5" />
        </linearGradient>
      </defs>
      <rect x="26" y="0" width="44" height="30" rx="8" fill="#6a46c9" />
      <rect x="26" y="82" width="44" height="30" rx="8" fill="#6a46c9" />
      <path d="M26 8h44M26 16h44M26 24h44M26 90h44M26 98h44M26 106h44" stroke="#8d6bea" strokeWidth="2" />
      <rect x="10" y="22" width="76" height="68" rx="20" fill="url(#wt-case)" />
      <rect x="18" y="30" width="60" height="52" rx="13" fill="url(#wt-face)" />
      <rect x="24" y="36" width="48" height="40" rx="10" fill="#8a9cf0" opacity=".45" />
      <path d="M48 44v16" stroke="#f0558f" strokeWidth="6" strokeLinecap="round" />
      <circle cx="48" cy="68" r="3.5" fill="#f0558f" />
      <rect x="84" y="46" width="6" height="14" rx="3" fill="#6a46c9" />
    </svg>
  );
}
