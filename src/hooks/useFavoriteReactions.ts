import { useCallback, useEffect, useState } from 'react';
import { onScopeUserChange, userKey } from '@/lib/userScope';

/*
 * Reactions rapides du menu d'un message : les 4 emojis les plus utilises pour reagir (memorises localement),
 * completes par les valeurs par defaut de la reference (pomme verte, etoile, coche verte, coeur).
 * La barre de survol affiche les 3 derniers.
 */

const STORAGE_KEY = 'reaction-usage';
export const DEFAULT_QUICK_REACTIONS = ['🍏', '⭐', '✅', '❤️'];

type Usage = Record<string, number>;

function read(): Usage {
  try {
    const raw = window.localStorage.getItem(userKey(STORAGE_KEY));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function rankQuickReactions(usage: Usage): string[] {
  const used = Object.entries(usage).sort((a, b) => b[1] - a[1]).map(([e]) => e);
  const out = used.slice(0, 4);
  for (const d of [...DEFAULT_QUICK_REACTIONS].reverse()) if (out.length < 4 && !out.includes(d)) out.push(d);
  // Ordre d'affichage : le plus utilise en dernier (le plus proche du curseur dans la barre).
  return out.reverse();
}

const listeners = new Set<() => void>();
onScopeUserChange(() => listeners.forEach((l) => l()));

export function recordReactionUsage(emoji: string) {
  const usage = read();
  usage[emoji] = (usage[emoji] ?? 0) + 1;
  try {
    window.localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(usage));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l());
}

export function useQuickReactions() {
  const [list, setList] = useState<string[]>(() => rankQuickReactions(read()));
  const refresh = useCallback(() => setList(rankQuickReactions(read())), []);
  useEffect(() => {
    listeners.add(refresh);
    return () => { listeners.delete(refresh); };
  }, [refresh]);
  return list;
}
