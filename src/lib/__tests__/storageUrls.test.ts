import { describe, expect, it } from 'vitest';
import { needsRefresh, parseSignedUrl } from '@/lib/storageUrls';

const token = (exp: number) => `x.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.y`;
const url = (exp: number) =>
  `https://abc.supabase.co/storage/v1/object/sign/message-attachments/u1/photo%20a.png?token=${token(exp)}`;

describe('storageUrls', () => {
  it('lit le bucket, le chemin et l\'expiration d\'un lien signé', () => {
    const ref = parseSignedUrl(url(2_000_000_000));
    expect(ref).toEqual({ bucket: 'message-attachments', path: 'u1/photo a.png', expiresAt: 2_000_000_000_000 });
  });

  it('re-signe les liens expirés ou proches de l\'être, jamais les liens publics', () => {
    const now = Date.now();
    expect(needsRefresh(url(Math.floor(now / 1000) - 60), now)).toBe(true);
    expect(needsRefresh(url(Math.floor(now / 1000) + 3600), now)).toBe(true);
    expect(needsRefresh(url(Math.floor(now / 1000) + 3 * 86400), now)).toBe(false);
    expect(needsRefresh('https://abc.supabase.co/storage/v1/object/public/server-icons/s1/icon.png', now)).toBe(false);
  });
});
