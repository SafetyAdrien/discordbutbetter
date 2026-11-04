import { useEffect, useState } from 'react';

let reverse: Map<string, string> | null = null;
let loading: Promise<Map<string, string>> | null = null;

const strip = (c: string) => c.replace(/️/g, '');

function load(): Promise<Map<string, string>> {
  if (reverse) return Promise.resolve(reverse);
  loading ??= import('@/data/emojiShortcodes.json').then((m) => {
    const map = new Map<string, string>();
    // Plusieurs noms par emoji : on prefere un nom "pur" (lettres/chiffres/_), comme Discord (:thumbsup: plutot que :+1:).
    const pure = (n: string) => /^[a-z0-9_]+$/.test(n) && !/^\d/.test(n);
    for (const [name, char] of Object.entries(m.default as Record<string, string>)) {
      const k = strip(char);
      const cur = map.get(k);
      if (!cur || (!pure(cur) && pure(name))) map.set(k, name);
    }
    reverse = map;
    return map;
  });
  return loading;
}

/** `:nom:` d'un emoji unicode (sous-menu "Ajouter une reaction"). */
export function useEmojiShortcodes() {
  const [map, setMap] = useState<Map<string, string> | null>(reverse);
  useEffect(() => {
    if (!map) void load().then(setMap);
  }, [map]);
  return (char: string): string => {
    const name = map?.get(strip(char));
    return name ? `:${name}:` : '';
  };
}
