/*
 * Tags de serveur : catalogue des badges pixel art (fichiers dans public/server-tag-badges, generes par
 * scripts/generate-server-tag-badges.py), validation du nom / de la couleur et messages d'erreur.
 * Les regles reproduisent celles de Discord : 2 a 4 lettres ou chiffres, un tag par serveur, un tag actif par utilisateur.
 */

export interface TagBadge {
  id: string;
  name: string;
  pack: 'essentials' | 'cosmos' | 'treasures';
}

export const BADGE_PACKS: { id: TagBadge['pack']; label: string }[] = [
  { id: 'essentials', label: 'Essentiels' },
  { id: 'cosmos', label: 'Cosmos' },
  { id: 'treasures', label: 'Trésors' },
];

export const TAG_BADGES: TagBadge[] = [
  { id: 'leaf', name: 'Feuille', pack: 'essentials' },
  { id: 'sword', name: 'Épée', pack: 'essentials' },
  { id: 'heart', name: 'Cœur', pack: 'essentials' },
  { id: 'flame', name: 'Flamme', pack: 'essentials' },
  { id: 'drop', name: 'Goutte', pack: 'essentials' },
  { id: 'skull', name: 'Crâne', pack: 'essentials' },
  { id: 'moon', name: 'Lune', pack: 'essentials' },
  { id: 'bolt', name: 'Éclair', pack: 'essentials' },
  { id: 'gem', name: 'Gemme', pack: 'essentials' },
  { id: 'mushroom', name: 'Champignon', pack: 'essentials' },
  { id: 'planet', name: 'Planète', pack: 'cosmos' },
  { id: 'star', name: 'Étoile', pack: 'cosmos' },
  { id: 'rocket', name: 'Fusée', pack: 'cosmos' },
  { id: 'comet', name: 'Comète', pack: 'cosmos' },
  { id: 'ufo', name: 'Soucoupe', pack: 'cosmos' },
  { id: 'sprout', name: 'Pousse', pack: 'treasures' },
  { id: 'clover', name: 'Trèfle', pack: 'treasures' },
  { id: 'crown', name: 'Couronne', pack: 'treasures' },
  { id: 'trophy', name: 'Trophée', pack: 'treasures' },
];

export const badgeById = (id: string | null | undefined) => TAG_BADGES.find((b) => b.id === id) ?? null;
export const badgeUrl = (id: string) => `/server-tag-badges/${encodeURIComponent(id)}.svg`;

export const TAG_NAME_MAX = 4;
export const TAG_NAME_MIN = 2;
const NAME_RE = /^[\p{L}\p{N}]+$/u;

/** Retire tout ce qui n'est pas lettre / chiffre (caracteres de controle, HTML, espaces...) et borne a 4. */
export function sanitizeTagName(raw: string): string {
  return Array.from(raw).filter((c) => NAME_RE.test(c)).join('').slice(0, TAG_NAME_MAX);
}

export function validateTagName(name: string): string | null {
  if (name.length < TAG_NAME_MIN) return `Le tag doit faire au moins ${TAG_NAME_MIN} caractères.`;
  if (name.length > TAG_NAME_MAX) return `Le tag fait ${TAG_NAME_MAX} caractères maximum.`;
  if (!NAME_RE.test(name)) return 'Uniquement des lettres et des chiffres.';
  return null;
}

export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
export const DEFAULT_TAG_COLOR = '#ffffff';

/** Couleur valide du badge (la couleur du tag ne teinte que l'icone ; pastille grise et texte blanc restent fixes). */
export function tagIconColor(color: string | null | undefined): string | null {
  return color && HEX_COLOR_RE.test(color) ? color : null;
}

const MESSAGES: Record<string, string> = {
  server_tag_unauthenticated: 'Connecte-toi pour continuer.',
  server_tag_forbidden: "Tu n'as pas la permission de modifier le tag de ce serveur.",
  server_tag_invalid_name: 'Nom de tag invalide (2 à 4 lettres ou chiffres).',
  server_tag_invalid_color: 'Couleur invalide.',
  server_tag_invalid_badge: "Ce badge n'est pas disponible.",
  server_tag_conflict: "Le tag a été modifié entre-temps par quelqu'un d'autre. Recharge la page puis réessaie.",
  server_tag_not_member: "Tu dois être membre de ce serveur pour utiliser son tag.",
  server_tag_unavailable: "Ce serveur n'a pas de tag actif.",
  server_tag_rate_limited: 'Tu changes de tag trop vite. Réessaie dans quelques secondes.',
};

export function tagErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? '';
  const key = Object.keys(MESSAGES).find((k) => msg.includes(k));
  if (key) return MESSAGES[key];
  if (/network|fetch|Failed to/i.test(msg)) return 'Erreur réseau. Vérifie ta connexion et réessaie.';
  return 'Une erreur est survenue. Réessaie.';
}
