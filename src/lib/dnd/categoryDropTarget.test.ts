import { describe, expect, it } from 'vitest';
import { pickCategoryDropTarget, resolveCategoryDropTarget } from './categoryDropTarget';

describe('resolveCategoryDropTarget', () => {
  it("retourne null s'il n'y a aucun en-tête candidat", () => {
    expect(resolveCategoryDropTarget([], 100)).toBeNull();
  });

  it('place avant le premier en-tête si le curseur est au-dessus de tout', () => {
    const headers = [
      { id: 'A', top: 100, height: 30 },
      { id: 'B', top: 200, height: 30 },
    ];
    expect(resolveCategoryDropTarget(headers, 0)).toEqual({ overCatId: 'A', position: 'before' });
  });

  it('place après le dernier en-tête si le curseur est en dessous de tout', () => {
    const headers = [
      { id: 'A', top: 100, height: 30 },
      { id: 'B', top: 200, height: 30 },
    ];
    expect(resolveCategoryDropTarget(headers, 9999)).toEqual({ overCatId: 'B', position: 'after' });
  });

  it('choisit le bon voisin même quand une catégorie est beaucoup plus haute que les autres', () => {
    // Reproduit le bug initial : A collapsed (fin), B expanded (haut mais son
    // EN-TÊTE reste fin), C collapsed (fin). L'ancienne méthode "distance
    // brute au rect le plus proche" pouvait mal résoudre ce cas selon la
    // position du curseur dans la zone des salons de B.
    const headers = [
      { id: 'A', top: 0, height: 28 },
      { id: 'B', top: 28, height: 28 }, // en-tête fin même si B est "dépliée" visuellement plus bas
      { id: 'C', top: 500, height: 28 }, // C est loin en dessous car B a beaucoup de salons
    ];
    // Curseur juste sous l'en-tête de B, bien avant C → doit résoudre "after B", pas C.
    expect(resolveCategoryDropTarget(headers, 60)).toEqual({ overCatId: 'C', position: 'before' });
    // Curseur dans la zone des salons de B, bien avant le milieu de C → doit rester "before C".
    expect(resolveCategoryDropTarget(headers, 300)).toEqual({ overCatId: 'C', position: 'before' });
    // Curseur pile sous le milieu de B → "before B".
    expect(resolveCategoryDropTarget(headers, 41)).toEqual({ overCatId: 'B', position: 'before' });
  });

  it('est monotone : le résultat avance dans le même sens que le curseur, jamais en arrière', () => {
    const headers = [
      { id: 'A', top: 0, height: 20 },
      { id: 'B', top: 50, height: 20 },
      { id: 'C', top: 100, height: 20 },
      { id: 'D', top: 150, height: 20 },
    ];
    const order = ['A', 'B', 'C', 'D'];
    let lastIndex = -1;
    for (let y = -20; y <= 200; y += 5) {
      const result = resolveCategoryDropTarget(headers, y);
      expect(result).not.toBeNull();
      const idx = order.indexOf(result!.overCatId);
      expect(idx).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = idx;
    }
  });

  it("fonctionne quel que soit l'ordre d'entrée des en-têtes (trie en interne)", () => {
    const headersShuffled = [
      { id: 'C', top: 200, height: 30 },
      { id: 'A', top: 0, height: 30 },
      { id: 'B', top: 100, height: 30 },
    ];
    expect(resolveCategoryDropTarget(headersShuffled, 10)).toEqual({ overCatId: 'A', position: 'before' });
  });
});

describe('pickCategoryDropTarget', () => {
  it("privilégie l'état de survol déjà validé visuellement, même si un recalcul DOM existe", () => {
    // C'est le vrai bug rapporté : le DropIndicator affichait la bonne
    // position pendant le glisser, mais handleDragEnd recalculait une
    // position DIFFÉRENTE au moment du drop. Ce test verrouille que le
    // survol gagne toujours quand il est disponible.
    const hoverTarget = { overCatId: 'B', position: 'before' as const };
    const domFallbackTarget = { overCatId: 'C', position: 'after' as const };
    expect(pickCategoryDropTarget(hoverTarget, domFallbackTarget)).toEqual(hoverTarget);
  });

  it("retombe sur le recalcul DOM seulement si aucun survol n'a eu lieu", () => {
    const domFallbackTarget = { overCatId: 'C', position: 'after' as const };
    expect(pickCategoryDropTarget(null, domFallbackTarget)).toEqual(domFallbackTarget);
  });

  it('retourne null si ni le survol ni le recalcul DOM ne donnent de cible', () => {
    expect(pickCategoryDropTarget(null, null)).toBeNull();
  });
});
