import { useMemo, useSyncExternalStore } from 'react';

/*
 * Messages ephemeres de Clyde ("Toi seul(e) peux voir celui-ci") : reponses
 * aux commandes slash, visibles uniquement pour toi, jamais envoyees ni
 * conservees (elles disparaissent au rechargement ou via "Rejeter le message").
 */

export interface EphemeralMessage {
  id: string;
  channelId: string;
  content: string;
  createdAt: Date;
}

let items: EphemeralMessage[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addEphemeralMessage(channelId: string, content: string) {
  items = [...items, { id: crypto.randomUUID(), channelId, content, createdAt: new Date() }];
  emit();
}

export function dismissEphemeralMessage(id: string) {
  items = items.filter((m) => m.id !== id);
  emit();
}

const EMPTY: EphemeralMessage[] = [];

export function useEphemeralMessages(channelId: string | null | undefined): EphemeralMessage[] {
  const all = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => items,
  );
  return useMemo(() => (channelId ? all.filter((m) => m.channelId === channelId) : EMPTY), [all, channelId]);
}
