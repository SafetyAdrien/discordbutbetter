import { describe, expect, it } from 'vitest';
import { sanitizeTagName, tagIconColor, tagErrorMessage, validateTagName } from '../serverTags';

describe('serverTags', () => {
  it('filtre le nom : lettres et chiffres uniquement, 4 caracteres maximum', () => {
    expect(sanitizeTagName('sp ce!<b>')).toBe('spce');
    expect(sanitizeTagName('ÉCLAIR')).toBe('ÉCLA');
    expect(sanitizeTagName('<script>')).toBe('scri');
  });
  it('valide la longueur et les caracteres', () => {
    expect(validateTagName('A')).toMatch(/au moins/);
    expect(validateTagName('SPCE')).toBeNull();
    expect(validateTagName('A-B')).toMatch(/lettres/);
    expect(validateTagName('ABCDE')).toMatch(/maximum/);
  });
  it("couleur : ne teinte que l'icone, ignoree si invalide", () => {
    expect(tagIconColor(null)).toBeNull();
    expect(tagIconColor('red')).toBeNull();
    expect(tagIconColor('#2880FB')).toBe('#2880FB');
  });
  it("traduit les erreurs structurees du serveur", () => {
    expect(tagErrorMessage({ message: 'server_tag_rate_limited' })).toMatch(/trop vite/);
    expect(tagErrorMessage({ message: 'server_tag_forbidden' })).toMatch(/permission/);
    expect(tagErrorMessage({ message: 'TypeError: Failed to fetch' })).toMatch(/réseau/);
  });
});
