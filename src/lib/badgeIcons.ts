/*
 * Icones des badges de profil et de serveur (planche Discord fournie,
 * decoupee en un SVG par badge dans src/assets/badges). La cle est le nom du
 * fichier sans extension, qui correspond a `badges.key` en base.
 */
const files = import.meta.glob('../assets/badges/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const BADGE_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/** Icone d'un badge : l'image definie en base, sinon celle de la planche. */
export const badgeIconUrl = (b: { key: string; icon_url: string | null }) => b.icon_url || BADGE_ICONS[b.key] || null;
