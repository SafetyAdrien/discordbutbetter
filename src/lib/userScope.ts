/*
 * Donnees locales propres a un compte. Le stockage du navigateur est partage par toutes les sessions d'une meme
 * machine : sans prefixe, les emojis recents / favoris / reactions rapides... d'un compte apparaitraient chez le suivant.
 * `userKey('cle')` donne `cle@<id du compte>` ; l'identifiant est fixe par AuthProvider des qu'il est connu.
 */
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

export function setScopeUser(id: string | null) {
  if (id === currentUserId) return;
  currentUserId = id;
  listeners.forEach((l) => l());
}

/** Appelle `fn` quand le compte change (pour vider les caches en memoire). */
export function onScopeUserChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const userKey = (base: string) => `${base}@${currentUserId ?? 'anon'}`;
