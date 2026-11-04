/**
 * Centralized icon design tokens.
 * Use with the <Icon /> wrapper in src/components/ui/icon.tsx
 * to keep stroke widths, sizes and pill containers consistent across
 * mobile, tablet and desktop.
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconVariant = 'outline' | 'filled' | 'duotone';

export const ICON_SIZE_PX: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

/**
 * Taille canonique des icones "style Discord" (encre de la planche Discord,
 * mesuree sur les references : 20px dans la liste des salons). C'est la taille
 * reelle par defaut que toutes les icones du systeme doivent respecter.
 */
export const DISCORD_ICON_SIZE_PX = ICON_SIZE_PX.md;

/** Taille par defaut des icones (token `md` = 20px). */
export const DEFAULT_ICON_SIZE: IconSize = 'md';

/**
 * Resout une taille d'icone vers des pixels.
 * Priorite : taille explicite (nombre brut en px) > token ('xs'..'xl') >
 * taille par defaut (canonique Discord-style `md` = 20px).
 */
export function resolveIconSize(size?: IconSize | number | string | null): number {
  if (typeof size === 'number') return size;
  if (typeof size === 'string') {
    const n = Number(size);
    if (size.trim() !== '' && Number.isFinite(n)) return n;
    if (size in ICON_SIZE_PX) return ICON_SIZE_PX[size as IconSize];
  }
  return ICON_SIZE_PX[DEFAULT_ICON_SIZE];
}

/**
 * Une classe de taille explicite (`w-*`, `h-*`, `size-*`) a ete donnee : elle
 * fixe la taille mesuree pour ce contexte (en-tete 24px, menus 16px...), et
 * la taille canonique ne doit pas l'ecraser.
 */
export function hasSizeClass(className?: string | null): boolean {
  return !!className && /(^|\s|:)(w|h|size)-(\d|\[|px|full)/.test(className);
}

export const ICON_STROKE_WIDTH = 2.25;

/** Tailwind classes for icon buttons (round pill containers). */
export const ICON_BUTTON_CLASSES = {
  /** Subtle ghost — for low-priority actions. */
  ghost:
    'inline-flex items-center justify-center rounded-2xl transition-colors duration-150 active:scale-95 hover:bg-muted/60',
  /** Soft primary pill — main action accent. */
  soft:
    'inline-flex items-center justify-center rounded-2xl transition-colors duration-150 active:scale-95 bg-primary/10 text-primary hover:bg-primary/15',
  /** Solid primary — call-to-action (e.g. send). */
  solid:
    'inline-flex items-center justify-center rounded-full transition-colors duration-150 active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90',
  /** Destructive — disconnect, delete, end-call. */
  danger:
    'inline-flex items-center justify-center rounded-2xl transition-colors duration-150 active:scale-95 bg-destructive/15 text-destructive hover:bg-destructive/25',
  /** Round circular — tappable target on mobile (≥44px). */
  round:
    'inline-flex items-center justify-center rounded-full transition-colors duration-150 active:scale-95',
};

export const ICON_BUTTON_SIZE_CLASSES = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
  lg: 'w-11 h-11', // 44px — minimum tap target
  xl: 'w-12 h-12',
};

/** Lucide icons whose SVG path is closed and can be filled with currentColor. */
export const FILLABLE_LUCIDE_ICONS = new Set<string>([
  'Heart', 'Star', 'Bookmark', 'Bell', 'BellOff', 'Flag', 'Pin',
  'PinOff', 'Circle', 'CheckCircle', 'CheckCircle2', 'XCircle', 'AlertCircle',
  'PlayCircle', 'PauseCircle', 'StopCircle', 'Sun', 'Moon', 'Cloud',
  'ThumbsUp', 'ThumbsDown', 'MessageCircle', 'MessageSquare',
]);
