import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_USER_SETTINGS,
  getUserSettings,
  mergeSettings,
  patchUserSettings,
  setUserSettings,
  subscribeUserSettings,
  type DeepPartial,
  type UserSettings,
} from '@/lib/userSettings';
import { toast } from 'sonner';

/** Lecture reactive des parametres utilisateur (magasin global). */
export function useUserSettingsValue(): UserSettings {
  return useSyncExternalStore(subscribeUserSettings, getUserSettings, getUserSettings);
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let loadedFor: string | null = null;

/**
 * Charge les parametres de l'utilisateur connecte (une fois) et fournit
 * `update`, qui applique le changement tout de suite puis l'enregistre en
 * base apres 400 ms sans nouvelle modification.
 */
export function useUserSettings() {
  const { user } = useAuth();
  const settings = useUserSettingsValue();
  const userRef = useRef(user?.id);
  userRef.current = user?.id;

  useEffect(() => {
    if (!user?.id || loadedFor === user.id) return;
    loadedFor = user.id;
    const localeAtLoad = getUserSettings().language.locale;
    supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        const loadedSettings = mergeSettings(DEFAULT_USER_SETTINGS, data.settings);
        const currentLocale = getUserSettings().language.locale;
        if (currentLocale !== localeAtLoad) loadedSettings.language.locale = currentLocale;
        setUserSettings(loadedSettings);
      });
  }, [user?.id]);

  const update = useCallback((patch: DeepPartial<UserSettings>) => {
    const next = patchUserSettings(patch);
    const uid = userRef.current;
    if (!uid) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: uid, settings: next as unknown as Json, updated_at: new Date().toISOString() });
      if (error) toast.error("Impossible d'enregistrer tes paramètres");
    }, 400);
  }, []);

  return { settings, update };
}
