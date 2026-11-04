import { describe, expect, it } from 'vitest';
import { activeToken, completeToken, countFilters, parseSearch, serializeSearch } from '@/lib/searchQuery';

describe('searchQuery', () => {
  it('sépare les jetons du texte libre', () => {
    const p = parseSearch('de: adrien_moulin bonjour dans: général contient: image');
    expect(p.from).toEqual(['adrien_moulin']);
    expect(p.in).toEqual(['général']);
    expect(p.has).toEqual(['image']);
    expect(p.text).toBe('bonjour');
    expect(countFilters(p)).toBe(3);
  });

  it('accepte les valeurs entre guillemets et les alias anglais', () => {
    const p = parseSearch('in: "salon vocal" from:lea pinned:true');
    expect(p.in).toEqual(['salon vocal']);
    expect(p.from).toEqual(['lea']);
    expect(p.pinned).toBe(true);
  });

  it('reproduit la requête après aller-retour', () => {
    const q = 'de: lea dans: "salon vocal" contient: vidéo avant: 2026-10-22 auteur: bot coucou';
    expect(serializeSearch(parseSearch(q))).toBe(q);
  });

  it('détecte le jeton en cours de saisie et le complète', () => {
    expect(activeToken('salut dans: gé')).toMatchObject({ prefix: 'dans', partial: 'gé' });
    expect(activeToken('salut')).toBeNull();
    expect(completeToken('salut dans: gé', 'dans', 'général')).toBe('salut dans: général ');
    expect(completeToken('', 'de', 'lea')).toBe('de: lea ');
  });
});
