import { useSyncExternalStore } from 'react';
/** Anciennete courte d'un post : "il y a 3 min", "il y a 2 h", "il y a 4 j". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString();
}

/** Idees de titres proposees par "Voir des exemples". */
export const EXAMPLE_POST_TITLES = [
  'Présente-toi ici !',
  'Partage ta dernière création',
  'Questions et entraide',
  'Idées et suggestions pour le serveur',
];

/*
 * Ouverture d'un post depuis la liste des salons : le salon Forum /
 * Multimedia n'est pas encore monte quand on clique, la demande est donc
 * gardee ici et lue par ForumView au montage (ou recue par evenement s'il
 * est deja affiche).
 */
const pendingPosts = new Map<string, { threadId: string; fullscreen: boolean }>();
export const OPEN_FORUM_POST_EVENT = 'forum:open-post';

/** `fullscreen` : ouvre le post en pleine fenetre (clic sur le post dans la liste des salons). */
export function requestOpenForumPost(channelId: string, threadId: string, fullscreen = false) {
  pendingPosts.set(channelId, { threadId, fullscreen });
  window.dispatchEvent(new CustomEvent(OPEN_FORUM_POST_EVENT, { detail: { channelId, threadId, fullscreen } }));
}

export const CLOSE_FORUM_POST_EVENT = 'forum:close-post';
/** Referme le post ouvert du salon (clic sur le salon alors que son post est en pleine fenetre). */
export function closeForumPost(channelId: string) {
  window.dispatchEvent(new CustomEvent(CLOSE_FORUM_POST_EVENT, { detail: { channelId } }));
}

export function takePendingForumPost(channelId: string): { threadId: string; fullscreen: boolean } | null {
  const req = pendingPosts.get(channelId) ?? null;
  pendingPosts.delete(channelId);
  return req;
}

/*
 * Post actuellement ouvert dans un salon Forum / Multimedia, publie par ForumView pour la liste des salons : en
 * pleine fenetre, c'est le post (et non le salon) qui est surligne dans la liste ; en panneau, le salon reste surligne.
 */
export interface OpenForumPost { channelId: string | null; threadId: string | null; fullscreen: boolean }
let openPost: OpenForumPost = { channelId: null, threadId: null, fullscreen: false };
const openPostListeners = new Set<() => void>();
export function publishOpenForumPost(next: OpenForumPost) {
  if (next.channelId === openPost.channelId && next.threadId === openPost.threadId && next.fullscreen === openPost.fullscreen) return;
  openPost = next;
  openPostListeners.forEach((l) => l());
}
export function useOpenForumPost(): OpenForumPost {
  return useSyncExternalStore(
    (fn) => { openPostListeners.add(fn); return () => openPostListeners.delete(fn); },
    () => openPost,
  );
}
