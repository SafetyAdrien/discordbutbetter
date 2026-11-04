import { describe, it, expect } from 'vitest';
import { acceptFor, contentTypeOf, formatsLabel, kindOfFile } from '@/lib/mediaTypes';

const f = (name: string, type = '') => ({ name, type });

describe('kindOfFile', () => {
  it('detecte par type MIME', () => {
    expect(kindOfFile(f('a.bin', 'image/png'))).toBe('image');
    expect(kindOfFile(f('a.bin', 'video/mp4'))).toBe('video');
    expect(kindOfFile(f('a.bin', 'audio/mpeg'))).toBe('audio');
    expect(kindOfFile(f('a.bin', 'application/pdf'))).toBe('pdf');
  });
  it('retombe sur l\'extension quand le MIME est vide (mkv, flac, opus...)', () => {
    expect(kindOfFile(f('film.MKV'))).toBe('video');
    expect(kindOfFile(f('titre.flac'))).toBe('audio');
    expect(kindOfFile(f('photo.JPEG'))).toBe('image');
    expect(kindOfFile(f('piste.opus'))).toBe('audio');
  });
  it('refuse le reste', () => {
    expect(kindOfFile(f('script.exe', 'application/x-msdownload'))).toBeNull();
    expect(kindOfFile(f('archive.zip'))).toBeNull();
  });
});

describe('acceptFor / formatsLabel / contentTypeOf', () => {
  it('limite le selecteur au type choisi', () => {
    const audio = acceptFor(['audio']);
    expect(audio).toContain('audio/*');
    expect(audio).toContain('.mp3');
    expect(audio).not.toContain('image/*');
  });
  it('liste les formats images demandes', () => expect(formatsLabel(['image'], 3)).toBe('PNG, JPG, JPEG…'));
  it('donne un type MIME a l\'envoi quand le navigateur n\'en fournit pas', () => {
    expect(contentTypeOf(f('x.mp3'))).toBe('audio/mpeg');
    expect(contentTypeOf(f('x.mkv'))).toBe('video/x-matroska');
    expect(contentTypeOf(f('x.png', 'image/png'))).toBe('image/png');
  });
});
