import { describe, expect, it } from 'vitest';
import { finalizeRail, planRailDrop, type RailEntry } from '../railDrop';

const srv = (id: string) => ({ id, name: id } as never);
const loose = (id: string): RailEntry => ({ id, server: srv(id) });
const folder = (id: string, ids: string[]): RailEntry => ({
  id: `folder:${id}`,
  folder: { id, name: null, color: null, serverIds: ids, position: 0, expanded: true },
  servers: ids.map(srv),
});
const shape = (list: RailEntry[]) => list.map((e) => (e.folder ? `[${e.servers!.map((s) => s.id).join(',')}]` : e.id)).join(' ');

const rail = () => [loose('a'), folder('f', ['b', 'c', 'd']), loose('e')];

describe('planRailDrop', () => {
  it('reordonne dans le dossier : avant / apres un serveur du dossier', () => {
    expect(shape(planRailDrop(rail(), 'd', { type: 'before', id: 'b' })!.next)).toBe('a [d,b,c] e');
    expect(shape(planRailDrop(rail(), 'b', { type: 'after', id: 'c' })!.next)).toBe('a [c,b,d] e');
    expect(shape(planRailDrop(rail(), 'b', { type: 'after', id: 'd' })!.next)).toBe('a [c,d,b] e');
  });

  it('depose au centre de son propre dossier : rien ne change', () => {
    expect(planRailDrop(rail(), 'c', { type: 'into', id: 'folder:f' })).toBeNull();
  });

  it('sort du dossier : avant / apres une entree du rail', () => {
    expect(shape(planRailDrop(rail(), 'c', { type: 'after', id: 'folder:f' })!.next)).toBe('a [b,d] c e');
    expect(shape(planRailDrop(rail(), 'c', { type: 'before', id: 'folder:f' })!.next)).toBe('a c [b,d] e');
    expect(shape(planRailDrop(rail(), 'b', { type: 'before', id: 'a' })!.next)).toBe('b a [c,d] e');
  });

  it('entre dans un dossier : a une position precise ou au centre (a la fin)', () => {
    expect(shape(planRailDrop(rail(), 'e', { type: 'before', id: 'c' })!.next)).toBe('a [b,e,c,d]');
    expect(shape(planRailDrop(rail(), 'a', { type: 'into', id: 'folder:f' })!.next)).toBe('[b,c,d,a] e');
  });

  it("un serveur libre au centre d'un autre : cree un dossier", () => {
    const plan = planRailDrop(rail(), 'a', { type: 'into', id: 'e' })!;
    expect(plan.createFolder?.targetServer.id).toBe('e');
    expect(plan.createFolder?.at).toBe(1);
  });

  it('deplace un serveur libre ou un dossier entier', () => {
    expect(shape(planRailDrop(rail(), 'a', { type: 'after', id: 'e' })!.next)).toBe('[b,c,d] e a');
    expect(shape(planRailDrop(rail(), 'folder:f', { type: 'before', id: 'a' })!.next)).toBe('[b,c,d] a e');
    expect(planRailDrop(rail(), 'folder:f', { type: 'into', id: 'e' })).toBeNull();
  });

  it('ignore une cible identique a la source', () => {
    expect(planRailDrop(rail(), 'c', { type: 'before', id: 'c' })).toBeNull();
  });
});

describe('finalizeRail', () => {
  it('supprime un dossier vide et signale les contenus modifies', () => {
    const r = [loose('a'), folder('f', ['b'])];
    const plan = planRailDrop(r, 'b', { type: 'after', id: 'a' })!;
    const out = finalizeRail(plan.next);
    expect(out.deleted).toEqual(['f']);
    expect(shape(out.next)).toBe('a b');
    const r2 = rail();
    const out2 = finalizeRail(planRailDrop(r2, 'c', { type: 'before', id: 'b' })!.next);
    expect(out2.updates).toEqual([{ id: 'f', serverIds: ['c', 'b', 'd'] }]);
  });
});
