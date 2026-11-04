import { describe, it, expect } from 'vitest';
import { attachmentsSummary, isForwardedFrom } from '@/lib/forwardMessage';
import { DEFAULT_QUICK_REACTIONS, rankQuickReactions } from '@/hooks/useFavoriteReactions';

const img = (id: string) => ({ id, url: `u/${id}`, name: id, type: 'image' as const, size: 1 });

describe('attachmentsSummary', () => {
  it('rien -> null', () => expect(attachmentsSummary([])).toBeNull());
  it('6 images', () => {
    const s = attachmentsSummary(['a', 'b', 'c', 'd', 'e', 'f'].map(img));
    expect(s).toMatchObject({ label: '6 images', count: 6, thumb: 'u/a' });
  });
  it('une image au singulier', () => expect(attachmentsSummary([img('a')])?.label).toBe('1 image'));
  it('melange -> pieces jointes', () => {
    const s = attachmentsSummary([img('a'), { ...img('b'), type: 'file' as const }]);
    expect(s?.label).toBe('2 pièces jointes');
  });
});

describe('isForwardedFrom', () => {
  it('reconnait une origine valide', () => expect(isForwardedFrom({ kind: 'channel', messageId: 'm' })).toBe(true));
  it('refuse le reste', () => { expect(isForwardedFrom(null)).toBe(false); expect(isForwardedFrom({})).toBe(false); });
});

describe('rankQuickReactions', () => {
  it('sans usage : valeurs par defaut dans l\'ordre de la reference', () => expect(rankQuickReactions({})).toEqual(DEFAULT_QUICK_REACTIONS));
  it('le plus utilise passe en dernier (le plus proche du curseur)', () => {
    const r = rankQuickReactions({ '🔥': 9, '👍': 3 });
    expect(r).toHaveLength(4);
    expect(r[3]).toBe('🔥');
    expect(r[2]).toBe('👍');
  });
});
