import { hexToRgb } from '@/lib/colorMath';

/*
 * Theme d'un profil (video de reference : carte bleu nuit, fond de la fenetre plus sombre, contour de la carte de la
 * couleur d'accent). La couleur choisie dans l'editeur de profil (couleur ou debut du degrade) donne la couleur de la
 * carte ; elle est assombrie pour rester lisible. Sans couleur choisie, le profil garde le style par defaut.
 */

export interface ProfileTheme {
  /** Carte de profil. */
  card: string;
  /** Fond de la fenetre de profil complet. */
  backdrop: string;
  /** Contour du panneau (couleur d'accent). */
  accent: string;
  /** Blocs poses sur la carte (collection de jeux, souhaits, boutons). */
  surface: string;
  surfaceHover: string;
}

interface ThemeSource {
  theme_color?: string | null;
  theme_gradient?: string | null;
}

function toHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${(l * 100).toFixed(1)}%)`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isHex = (v: string | undefined | null): v is string => !!v && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v.trim());

export function profileTheme(user: ThemeSource | null | undefined): ProfileTheme | null {
  if (!user) return null;
  const [start, end] = user.theme_gradient ? user.theme_gradient.split(',').map((c) => c.trim()) : [user.theme_color?.trim(), undefined];
  if (!isHex(start)) return null;
  const { h, s, l } = toHsl(start);
  const sat = clamp(s, 0.3, 1);
  const cardL = clamp(l, 0.12, 0.26);
  const accent = isHex(end) ? end : hsl(h, sat, 0.5);
  return {
    card: hsl(h, sat, cardL),
    backdrop: hsl(h, sat, cardL * 0.37),
    accent,
    surface: 'rgba(255,255,255,0.07)',
    surfaceHover: 'rgba(255,255,255,0.11)',
  };
}
