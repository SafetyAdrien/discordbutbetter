import { cn } from '@/lib/utils';

/** Icone de l'origine "Integre" : carre gris clair, barre oblique sombre (video de reference). */
export function SlashGlyph({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-[6px] bg-[#c9c9d1]', className)}>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]">
        <path d="M13.6 3.5h5L10.4 20.5h-5z" fill="#2b2d31" />
      </svg>
    </span>
  );
}

/** Avatar de Clyde, l'expediteur des messages ephemeres. */
export function ClydeAvatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#5865f2]', className)}>
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width="40" height="40" fill="#5865f2" />
        <path d="M10 15.5c0-3 2.4-5.5 5.4-5.5h9.2c3 0 5.4 2.5 5.4 5.5v9c0 3-2.4 5.5-5.4 5.5h-9.2c-3 0-5.4-2.5-5.4-5.5z" fill="#f2f3f8" />
        <path d="M12.5 17c0-1.6 1.2-2.8 2.8-2.8h9.4c1.6 0 2.8 1.2 2.8 2.8v6c0 1.6-1.2 2.8-2.8 2.8h-9.4c-1.6 0-2.8-1.2-2.8-2.8z" fill="#23232a" />
        <ellipse cx="16.7" cy="20" rx="1.7" ry="2.3" fill="#3fe0a0" />
        <ellipse cx="23.3" cy="20" rx="1.7" ry="2.3" fill="#3fe0a0" />
      </svg>
    </span>
  );
}
