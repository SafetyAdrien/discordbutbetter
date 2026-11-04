/*
 * Types de medias acceptes pour les pieces jointes : detection par type MIME, puis par extension (les navigateurs
 * ne renseignent pas toujours le MIME de .mkv, .flac, .opus...). Sert a la fenetre "Ajouter des medias", au depot
 * de fichiers, a l'envoi (type stocke) et au remplacement d'une piece jointe.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf';

export const MEDIA_KINDS: Record<MediaKind, { label: string; plural: string; exts: string[]; mime: string }> = {
  image: { label: 'Image', plural: 'Images', exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'heic', 'heif', 'tif', 'tiff'], mime: 'image/*' },
  video: { label: 'Vidéo', plural: 'Vidéos', exts: ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'ogv'], mime: 'video/*' },
  audio: { label: 'Musique', plural: 'Musiques', exts: ['mp3', 'wav', 'flac', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'aiff', 'aif', 'wma', 'mid', 'midi'], mime: 'audio/*' },
  pdf: { label: 'PDF', plural: 'PDF', exts: ['pdf'], mime: 'application/pdf' },
};

export const ALL_MEDIA_KINDS: MediaKind[] = ['image', 'video', 'audio', 'pdf'];

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

export function kindOfFile(file: Pick<File, 'type' | 'name'>): MediaKind | null {
  const t = file.type.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  if (t === 'application/pdf') return 'pdf';
  const ext = extOf(file.name);
  return ALL_MEDIA_KINDS.find((k) => MEDIA_KINDS[k].exts.includes(ext)) ?? null;
}

/** Valeur de l'attribut `accept` d'un champ fichier pour ces types (MIME + extensions). */
export function acceptFor(kinds: MediaKind[]): string {
  return kinds.flatMap((k) => [MEDIA_KINDS[k].mime, ...MEDIA_KINDS[k].exts.map((e) => `.${e}`)]).join(',');
}

/** "PNG, JPG, JPEG, GIF..." pour l'aide de la zone de depot. */
export function formatsLabel(kinds: MediaKind[], max = 6): string {
  const all = kinds.flatMap((k) => MEDIA_KINDS[k].exts).map((e) => e.toUpperCase());
  return all.length > max ? `${all.slice(0, max).join(', ')}…` : all.join(', ');
}

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4',
  aac: 'audio/aac', aiff: 'audio/aiff', aif: 'audio/aiff', wma: 'audio/x-ms-wma', mid: 'audio/midi', midi: 'audio/midi',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo', ogv: 'video/ogg',
  heic: 'image/heic', heif: 'image/heif', avif: 'image/avif', tif: 'image/tiff', tiff: 'image/tiff',
};

/** Type MIME a envoyer au stockage quand le navigateur n'en fournit pas. */
export function contentTypeOf(file: Pick<File, 'type' | 'name'>): string | undefined {
  return file.type || CONTENT_TYPES[extOf(file.name)];
}
