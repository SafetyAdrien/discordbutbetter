/* Icones de la navigation des MP (video de reference) : Nitro, Boutique, Quetes. */
const base = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const;

export const NitroIcon = ({ className }: { className?: string }) => (
  <svg {...base} className={className}>
    <path fillRule="evenodd" d="M12 3a9 9 0 100 18 9 9 0 000-18zM5 12a7 7 0 1114 0 7 7 0 01-14 0z" clipRule="evenodd" />
    <path d="M4 14.5l4.2-3.3 3.2 2 5.6-4.2-1 3.2-4.4 3.2-3.2-1.9-3.4 2.4z" />
  </svg>
);

export const ShopIcon = ({ className }: { className?: string }) => (
  <svg {...base} className={className}>
    <path d="M3 4h8v8H3V4zm10 0h8v8h-8V4zM3 14h8v6H3v-6zm10 0h8v6h-8v-6z" opacity=".95" />
    <path d="M6 7h2v2H6zM16 7h2v2h-2z" fill="#2b2c31" />
  </svg>
);

export const QuestIcon = ({ className }: { className?: string }) => (
  <svg {...base} className={className}>
    <path fillRule="evenodd" d="M10.6 2h2.8l.6 2.3a8 8 0 011.8.8l2-1.2 2 2-1.2 2a8 8 0 01.8 1.8l2.3.6v2.8l-2.3.6a8 8 0 01-.8 1.8l1.2 2-2 2-2-1.2a8 8 0 01-1.8.8l-.6 2.3h-2.8l-.6-2.3a8 8 0 01-1.8-.8l-2 1.2-2-2 1.2-2a8 8 0 01-.8-1.8L2 13.4v-2.8l2.3-.6a8 8 0 01.8-1.8l-1.2-2 2-2 2 1.2a8 8 0 011.8-.8L10.6 2zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
  </svg>
);
