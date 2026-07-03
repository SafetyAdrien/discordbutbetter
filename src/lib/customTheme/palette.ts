/**
 * Build a full HSL token palette from a set of custom-theme chips.
 * The primary chip drives hue/saturation across every surface token,
 * while original lightness is preserved to keep contrast intact.
 */

export type ThemeMode = 'dark' | 'light';

type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function relLuminance(hex: string): number {
  const m = hex.replace('#', '');
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(m.slice(0, 2), 16));
  const g = toLin(parseInt(m.slice(2, 4), 16));
  const b = toLin(parseInt(m.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function fmt(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** Blend a token's original H/S toward the chip's H/S; keep L. */
function tint(orig: HSL, base: HSL, k: number): string {
  // circular hue interpolation (shortest path)
  let dh = base.h - orig.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (orig.h + dh * k + 360) % 360;
  const targetS = Math.min(base.s, 70);
  const s = Math.max(0, Math.min(100, orig.s + (targetS - orig.s) * k));
  return fmt(h, s, orig.l);
}

/**
 * Base token map per mode — mirrors :root and .dark in index.css.
 * Keep in sync when new surface tokens are added.
 */
const BASE: Record<ThemeMode, Record<string, HSL>> = {
  light: {
    '--background': { h: 220, s: 20, l: 98 },
    '--foreground': { h: 225, s: 25, l: 12 },
    '--card': { h: 0, s: 0, l: 100 },
    '--card-foreground': { h: 225, s: 25, l: 12 },
    '--popover': { h: 0, s: 0, l: 100 },
    '--popover-foreground': { h: 225, s: 25, l: 12 },
    '--toolbar': { h: 220, s: 16, l: 94 },
    '--secondary': { h: 270, s: 55, l: 58 },
    '--muted': { h: 220, s: 14, l: 94 },
    '--muted-foreground': { h: 225, s: 12, l: 40 },
    '--accent': { h: 186, s: 70, l: 42 },
    '--border': { h: 220, s: 14, l: 88 },
    '--input': { h: 220, s: 14, l: 96 },
    '--surface-server-list': { h: 220, s: 16, l: 92 },
    '--surface-1': { h: 220, s: 18, l: 96 },
    '--surface-2': { h: 0, s: 0, l: 100 },
    '--surface-3': { h: 220, s: 14, l: 94 },
    '--surface-elevated': { h: 0, s: 0, l: 100 },
    '--surface-header': { h: 220, s: 16, l: 92 },
    '--surface-hover': { h: 220, s: 14, l: 90 },
    '--poll-background': { h: 220, s: 14, l: 94 },
    '--sidebar-background': { h: 220, s: 16, l: 92 },
    '--sidebar-foreground': { h: 225, s: 25, l: 12 },
    '--sidebar-accent': { h: 220, s: 14, l: 90 },
    '--sidebar-accent-foreground': { h: 225, s: 25, l: 12 },
    '--sidebar-border': { h: 220, s: 14, l: 84 },
    '--user-panel': { h: 220, s: 16, l: 92 },
  },
  dark: {
    '--background': { h: 225, s: 18, l: 11 },
    '--foreground': { h: 220, s: 10, l: 93 },
    '--card': { h: 225, s: 20, l: 15 },
    '--card-foreground': { h: 220, s: 10, l: 93 },
    '--popover': { h: 225, s: 18, l: 17 },
    '--popover-foreground': { h: 220, s: 10, l: 93 },
    '--toolbar': { h: 225, s: 16, l: 20 },
    '--secondary': { h: 270, s: 55, l: 58 },
    '--muted': { h: 225, s: 14, l: 20 },
    '--muted-foreground': { h: 220, s: 10, l: 60 },
    '--accent': { h: 186, s: 70, l: 42 },
    '--border': { h: 225, s: 14, l: 22 },
    '--input': { h: 225, s: 20, l: 18 },
    '--surface-server-list': { h: 225, s: 22, l: 6 },
    '--surface-1': { h: 225, s: 20, l: 9 },
    '--surface-2': { h: 225, s: 18, l: 14 },
    '--surface-3': { h: 225, s: 16, l: 20 },
    '--surface-elevated': { h: 225, s: 18, l: 17 },
    '--surface-header': { h: 225, s: 22, l: 6 },
    '--surface-hover': { h: 225, s: 14, l: 24 },
    '--poll-background': { h: 228, s: 20, l: 15 },
    '--sidebar-background': { h: 225, s: 22, l: 6 },
    '--sidebar-foreground': { h: 220, s: 10, l: 93 },
    '--sidebar-accent': { h: 225, s: 16, l: 20 },
    '--sidebar-accent-foreground': { h: 220, s: 10, l: 93 },
    '--sidebar-border': { h: 225, s: 14, l: 16 },
    '--user-panel': { h: 225, s: 22, l: 6 },
  },
};

export function buildPalette(
  chips: string[],
  intensity: number,
  mode: ThemeMode,
): Record<string, string> {
  if (chips.length === 0) return {};
  const primary = chips[0];
  const base = hexToHsl(primary);
  const k = Math.max(0, Math.min(1, (intensity / 100) * 0.9));
  const out: Record<string, string> = {};

  const tokens = BASE[mode];
  for (const name in tokens) {
    out[name] = tint(tokens[name], base, k);
  }

  // Primary / ring use the chip itself so buttons and focus states feel branded.
  out['--primary'] = fmt(base.h, base.s, base.l);
  out['--ring'] = fmt(base.h, base.s, base.l);
  out['--sidebar-primary'] = fmt(base.h, base.s, base.l);
  out['--sidebar-ring'] = fmt(base.h, base.s, base.l);
  out['--glow-primary'] = fmt(base.h, base.s, base.l);

  const fg = relLuminance(primary) > 0.45 ? '225 25% 12%' : '0 0% 100%';
  out['--primary-foreground'] = fg;
  out['--sidebar-primary-foreground'] = fg;
  out['--accent-foreground'] = fg;

  return out;
}
