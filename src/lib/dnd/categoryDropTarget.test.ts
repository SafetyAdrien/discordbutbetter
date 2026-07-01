import { describe, expect, it } from 'vitest';
import { resolveCategoryDropTarget } from './categoryDropTarget';

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
    const headers = [
      { id: 'A', top: 0, height: 28 },
      { id: 'B', top: 28, height: 28 },
      { id: 'C', top: 500, height: 28 },
    ];
    expect(resolveCategoryDropTarget(headers, 60)).toEqual({ overCatId: 'C', position: 'before' });
    expect(resolveCategoryDropTarget(headers, 300)).toEqual({ overCatId: 'C', position: 'before' });
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
