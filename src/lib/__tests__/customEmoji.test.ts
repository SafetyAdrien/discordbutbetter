import { describe, expect, it } from 'vitest';
import { customEmojiRegex, emojiPathFromUrl, emojiToken, isJumboEmojiOnly, lookupEmoji, registerEmojis, resolveShortcodes } from '../customEmoji';

const SID = '11111111-1111-4111-8111-111111111111';
const URL = `https://x.supabase.co/storage/v1/object/public/server-emojis/${SID}/1-aaa-ALogo.png`;

describe('customEmoji', () => {
  it('extrait le chemin du bucket depuis une URL publique', () => {
    expect(emojiPathFromUrl(URL)).toBe(`${SID}/1-aaa-ALogo.png`);
    expect(emojiPathFromUrl('https://autre.site/image.png')).toBeNull();
  });

  it('ecrit un jeton, anime pour un gif, et reste en :nom: hors bucket', () => {
    expect(emojiToken({ name: 'ALogo', url: URL })).toBe(`<:ALogo:${SID}/1-aaa-ALogo.png>`);
    expect(emojiToken({ name: 'Dance', url: URL.replace('.png', '.gif') })).toBe(`<a:Dance:${SID}/1-aaa-ALogo.gif>`);
    expect(emojiToken({ name: 'X', url: 'https://autre.site/x.png' })).toBe(':X:');
  });

  it('reconnait les jetons dans un texte', () => {
    const m = customEmojiRegex().exec(`salut <:ALogo:${SID}/1-aaa-ALogo.png> !`);
    expect(m?.[2]).toBe('ALogo');
    expect(m?.[3]).toBe(`${SID}/1-aaa-ALogo.png`);
  });

  it('convertit :nom: ecrit a la main, sauf dans le code et les liens', () => {
    registerEmojis([{ name: 'ALogo', url: URL }]);
    expect(lookupEmoji('alogo')?.name).toBe('ALogo');
    const token = `<:ALogo:${SID}/1-aaa-ALogo.png>`;
    expect(resolveShortcodes('hello :ALogo: !')).toBe(`hello ${token} !`);
    expect(resolveShortcodes('`:ALogo:`')).toBe('`:ALogo:`');
    expect(resolveShortcodes('https://a.b/:ALogo:')).toBe('https://a.b/:ALogo:');
    expect(resolveShortcodes('10:30:45')).toBe('10:30:45');
    expect(resolveShortcodes(':inconnu:')).toBe(':inconnu:');
  });

  it('detecte un message ne contenant que des emojis', () => {
    const token = `<:ALogo:${SID}/1-aaa-ALogo.png>`;
    expect(isJumboEmojiOnly(token)).toBe(true);
    expect(isJumboEmojiOnly(`${token} ${token} 😀`)).toBe(true);
    expect(isJumboEmojiOnly(`${token} salut`)).toBe(false);
    expect(isJumboEmojiOnly('')).toBe(false);
  });
});
