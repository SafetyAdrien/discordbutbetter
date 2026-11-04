import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { FavoriteCategory, FavoriteItem } from '@/lib/userSettings';

/*
 * Favoris (video de reference) : salons, fils et MP regroupes dans la vue "Favoris", avec des categories et un pseudo
 * propre aux favoris. Stockes dans les parametres de l'utilisateur (user_settings.settings.favorites).
 */

export type NewFavorite = Omit<FavoriteItem, 'id' | 'nickname' | 'category_id'> & { category_id?: string | null };

const uid = () => crypto.randomUUID();

export function useFavorites() {
  const { settings, update } = useUserSettings();
  const fav = settings.favorites;
  const items = fav.items;
  const categories = fav.categories;

  const find = useCallback((kind: FavoriteItem['kind'], refId: string) => items.find((i) => i.kind === kind && i.ref_id === refId), [items]);

  const add = useCallback(
    (list: NewFavorite[], opts?: { silent?: boolean }) => {
      const fresh = list
        .filter((n) => !items.some((i) => i.kind === n.kind && i.ref_id === n.ref_id))
        .map((n): FavoriteItem => ({ ...n, id: uid(), nickname: null, category_id: n.category_id ?? null }));
      if (fresh.length === 0) return;
      update({ favorites: { items: [...items, ...fresh] } });
      if (!opts?.silent) toast('Ajouté aux favoris !', { icon: '★', duration: 2500 });
    },
    [items, update],
  );

  const remove = useCallback((id: string) => update({ favorites: { items: items.filter((i) => i.id !== id) } }), [items, update]);
  const patch = useCallback((id: string, p: Partial<FavoriteItem>) => update({ favorites: { items: items.map((i) => (i.id === id ? { ...i, ...p } : i)) } }), [items, update]);
  const addCategory = useCallback(
    (name: string) => {
      const cat: FavoriteCategory = { id: uid(), name: name.trim() };
      update({ favorites: { categories: [...categories, cat] } });
      return cat;
    },
    [categories, update],
  );
  const setEnabled = useCallback((enabled: boolean) => update({ favorites: { enabled } }), [update]);
  const hideSuggestions = useCallback(() => update({ favorites: { hide_suggestions: true } }), [update]);

  return useMemo(
    () => ({ enabled: fav.enabled, hideSuggestionsFlag: fav.hide_suggestions, items, categories, find, add, remove, patch, addCategory, setEnabled, hideSuggestions }),
    [fav.enabled, fav.hide_suggestions, items, categories, find, add, remove, patch, addCategory, setEnabled, hideSuggestions],
  );
}
