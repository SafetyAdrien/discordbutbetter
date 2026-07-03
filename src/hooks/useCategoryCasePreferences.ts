import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CategoryCasePrefs,
  CategoryCaseZone,
  DEFAULT_CATEGORY_CASE_PREFS,
  ZonePref,
  normalizePrefs,
} from '@/lib/ui/categoryCase';

const LOCAL_KEY = 'nexuschat:ui:categoryCase';

function readLocal(): CategoryCasePrefs {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_CATEGORY_CASE_PREFS;
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_CATEGORY_CASE_PREFS;
  }
}

function writeLocal(prefs: CategoryCasePrefs) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
}

// Module-level singleton so every component instance shares one state (avoids Realtime channel churn)
let cache: CategoryCasePrefs = readLocal();
const listeners = new Set<(p: CategoryCasePrefs) => void>();
function setCache(next: CategoryCasePrefs) {
  cache = next;
  writeLocal(next);
  listeners.forEach((l) => l(next));
}

let realtimeInit = false;
let realtimeUserId: string | null = null;

export function useCategoryCasePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<CategoryCasePrefs>(cache);

  useEffect(() => {
    const l = (p: CategoryCasePrefs) => setPrefs(p);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  // Initial fetch + realtime subscription (once per user)
  useEffect(() => {
    if (!user?.id) return;
    if (realtimeInit && realtimeUserId === user.id) return;
    realtimeInit = true;
    realtimeUserId = user.id;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_ui_preferences')
        .select('category_case')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.category_case) {
        setCache(normalizePrefs(data.category_case));
      }
    })();

    const channel = supabase
      .channel(`user_ui_prefs:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_ui_preferences', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { category_case?: unknown } | null;
          if (row?.category_case) setCache(normalizePrefs(row.category_case));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      realtimeInit = false;
      realtimeUserId = null;
    };
  }, [user?.id]);

  const setZone = useCallback(async (zone: CategoryCaseZone, next: Partial<ZonePref>) => {
    const merged: CategoryCasePrefs = {
      ...cache,
      [zone]: { ...cache[zone], ...next },
    };
    setCache(merged);
    if (!user?.id) return;
    await supabase
      .from('user_ui_preferences')
      .upsert(
        { user_id: user.id, category_case: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
  }, [user?.id]);

  return { prefs, setZone };
}
