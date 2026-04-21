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
