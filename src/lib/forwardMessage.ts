import type { StoredAttachment } from '@/hooks/useMessages';

/*
 * Transfert de message ("Transferer"). Le contenu et les pieces jointes sont copies dans le nouveau message ;
 * `forwarded_from` garde l'origine pour le pied "#salon • 11:34 >" et le saut vers le message d'origine.
 */

export type ForwardKind = 'channel' | 'thread' | 'dm';

export interface ForwardedFrom {
  kind: ForwardKind;
  messageId: string;
  createdAt: string | null;
  channelId?: string | null;
  channelName?: string | null;
  serverId?: string | null;
  threadId?: string | null;
  threadName?: string | null;
  conversationId?: string | null;
}

/** Message a transferer : instantane du contenu + origine. */
export interface ForwardPayload {
  content: string;
  attachments: StoredAttachment[];
  edited?: boolean;
  from: ForwardedFrom;
}

export const OPEN_FORWARD_EVENT = 'app:open-forward-message';

export function openForwardMessage(payload: ForwardPayload) {
  window.dispatchEvent(new CustomEvent(OPEN_FORWARD_EVENT, { detail: payload }));
}

/** Resume des pieces jointes pour l'apercu : "6 images", "1 fichier"... */
export function attachmentsSummary(attachments: StoredAttachment[]): { label: string; count: number; thumb: string | null } | null {
  if (attachments.length === 0) return null;
  const images = attachments.filter((a) => a.type === 'image' || a.type === 'gif' || a.type === 'sticker');
  const videos = attachments.filter((a) => a.type === 'video');
  const files = attachments.filter((a) => a.type === 'file');
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  let label: string;
  if (images.length === attachments.length) label = plural(images.length, 'image', 'images');
  else if (videos.length === attachments.length) label = plural(videos.length, 'vidéo', 'vidéos');
  else if (files.length === attachments.length) label = plural(files.length, 'fichier', 'fichiers');
  else label = plural(attachments.length, 'pièce jointe', 'pièces jointes');
  const thumb = (images[0] ?? videos[0])?.url ?? null;
  return { label, count: attachments.length, thumb };
}

export const isForwardedFrom = (v: unknown): v is ForwardedFrom =>
  !!v && typeof v === 'object' && 'kind' in (v as object) && 'messageId' in (v as object);
