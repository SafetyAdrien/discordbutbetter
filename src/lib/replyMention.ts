import { useSyncExternalStore } from 'react';
import { uuidToSnowflake } from '@/lib/snowflake';

/*
 * Bouton "@ ACTIVE / DESACTIVE" du bandeau de reponse : quand on repond a quelqu'un d'autre, la reponse le mentionne
 * (il est notifie) tant que c'est active ; desactive, la reponse est envoyee sans mention. Active par defaut a chaque
 * nouvelle reponse. La mention est ecrite en tete du message (`<@id> `), comme les autres mentions de l'application.
 */
let on = true;
const listeners = new Set<() => void>();
export const setReplyMention = (v: boolean) => {
  on = v;
  listeners.forEach((l) => l());
};
export const useReplyMention = () =>
  useSyncExternalStore((fn) => (listeners.add(fn), () => listeners.delete(fn)), () => on);

/** Ajoute la mention de l'auteur auquel on repond (sauf si desactivee, si c'est soi-meme ou s'il est deja mentionne). */
export function withReplyMention(content: string, authorId: string | undefined | null, meId: string | undefined | null): string {
  if (!on || !authorId || authorId === meId || !content.trim()) return content;
  const tag = `<@${uuidToSnowflake(authorId)}>`;
  return content.includes(tag) ? content : `${tag} ${content}`;
}
