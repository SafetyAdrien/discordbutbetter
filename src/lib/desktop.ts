import { useSyncExternalStore } from 'react';

/*
 * Application de bureau (Electron, ou Tauri) : detection et titre de la barre de fenetre.
 * La barre reprend celle de Discord Desktop : fleches precedent / suivant,
 * icone + nom du serveur au centre, raccourcis et boutons de fenetre.
 */

/** Crans du zoom (Ctrl +/-) et reperes du curseur des parametres. */
export const DESKTOP_ZOOM_STEPS = [50, 75, 90, 100, 110, 125, 150, 200];

/** Vrai dans la fenetre de bureau (Electron ou Tauri), jamais dans un navigateur. */
export const isDesktopApp = typeof window !== 'undefined' && ('desktop' in window || '__TAURI_INTERNALS__' in window);

export interface DesktopTitle {
  name: string | null;
  iconUrl: string | null;
  /** Pictogramme de remplacement quand il n'y a pas d'icone de serveur (page Decouvrir). */
  glyph?: 'discover';
}

let title: DesktopTitle = { name: null, iconUrl: null };
const listeners = new Set<() => void>();

export function setDesktopTitle(next: DesktopTitle) {
  if (next.name === title.name && next.iconUrl === title.iconUrl && next.glyph === title.glyph) return;
  title = next;
  listeners.forEach((l) => l());
}

export function useDesktopTitle(): DesktopTitle {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => title,
  );
}
