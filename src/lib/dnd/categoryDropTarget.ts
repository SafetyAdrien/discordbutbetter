/**
 * Sélection de la catégorie cible lors d'un drag-and-drop de catégorie
 * (ChannelList.tsx). Extrait en fonction pure pour pouvoir être testé sans
 * monter le composant ni le DOM réel.
 *
 * Algorithme "boundary-based" : parcourt les en-têtes triés de haut en bas
 * et retient le premier dont le milieu vertical est encore en dessous du
 * curseur → déterministe et monotone. Remplace l'ancienne méthode "en-tête
 * le plus proche en distance brute au pixel", qui pouvait désigner un
 * voisin non pertinent quand deux catégories ont des hauteurs très
 * différentes (une dépliée avec beaucoup de salons juste à côté d'une
 * repliée très fine).
 */

export interface CategoryHeaderRect {
  id: string;
  /** Distance du haut de l'en-tête par rapport au viewport (getBoundingClientRect().top). */
  top: number;
  height: number;
}

export interface CategoryDropTarget {
  overCatId: string;
  position: 'before' | 'after';
}

/**
 * @param headers en-têtes de catégories candidates, DANS N'IMPORTE QUEL ORDRE
 *   (la fonction trie elle-même par `top`) — la catégorie active doit déjà
 *   avoir été exclue par l'appelant.
 * @param clientY position Y du curseur au moment du survol/drop.
 */
export function resolveCategoryDropTarget(
  headers: ReadonlyArray<CategoryHeaderRect>,
  clientY: number,
): CategoryDropTarget | null {
  if (headers.length === 0) return null;

  const sorted = [...headers].sort((a, b) => a.top - b.top);

  for (const header of sorted) {
    const headerMid = header.top + header.height / 2;
    if (clientY < headerMid) {
      return { overCatId: header.id, position: 'before' };
    }
  }

  const lastHeader = sorted[sorted.length - 1];
  return { overCatId: lastHeader.id, position: 'after' };
}
