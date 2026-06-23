import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type UserStatus = Database['public']['Enums']['user_status'];

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 min inactivité avant idle (auto)
const HIDDEN_TAB_IDLE_TIMEOUT = 60 * 1000; // 1 min quand onglet caché
const IDLE_TO_OFFLINE_TIMEOUT = 2 * 60 * 1000; // 2 min en idle auto -> offline
const DND_TO_OFFLINE_TIMEOUT = 5 * 60 * 1000; // 5 min sans activité en dnd -> offline

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown', 'scroll', 'click',
  'touchstart', 'touchmove', 'touchend',
  'pointerdown', 'pointermove',
] as const;

export function usePresence() {
  const { user, profile, session, updateProfile } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dndOfflineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStatusRef = useRef<UserStatus | null>(null);
  const isManualDndRef = useRef<boolean>(false);
  const isManualIdleRef = useRef<boolean>(false);
  const isManualOfflineRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    userIdRef.current = user?.id || null;
    accessTokenRef.current = session?.access_token || null;
  }, [user?.id, session?.access_token]);

  const clearOfflineTimer = () => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
  };
  const clearDndOfflineTimer = () => {
    if (dndOfflineTimerRef.current) {
      clearTimeout(dndOfflineTimerRef.current);
      dndOfflineTimerRef.current = null;
    }
  };

  const updateStatus = useCallback(async (status: UserStatus, forceUpdate = false) => {
    if (!user) return;
    // Ne pas écraser un statut manuel (dnd/idle/offline) sauf forceUpdate
    if (!forceUpdate && (isManualDndRef.current || isManualIdleRef.current || isManualOfflineRef.current)) {
      return;
    }
    if (currentStatusRef.current === status && !forceUpdate) return;

    try {
      await updateProfile({ status });
      currentStatusRef.current = status;
    } catch (error) {
      console.error('Error updating presence status:', error);
    }
  }, [user, updateProfile]);

  const scheduleDndOffline = useCallback(() => {
    clearDndOfflineTimer();
    if (currentStatusRef.current !== 'dnd') return;
    dndOfflineTimerRef.current = setTimeout(() => {
      // Force offline (override manual dnd)
      if (currentStatusRef.current === 'dnd') {
        updateStatus('offline', true);
      }
    }, DND_TO_OFFLINE_TIMEOUT);
  }, [updateStatus]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Réveil depuis offline/idle automatique -> online
    if (
      !isManualDndRef.current &&
      !isManualIdleRef.current &&
      !isManualOfflineRef.current &&
      (currentStatusRef.current === 'idle' || currentStatusRef.current === 'offline')
    ) {
      clearOfflineTimer();
      updateStatus('online');
    }

    // Reset timer idle (auto)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (
        !isManualDndRef.current &&
        !isManualIdleRef.current &&
        !isManualOfflineRef.current &&
        currentStatusRef.current !== 'idle' &&
        currentStatusRef.current !== 'offline'
      ) {
        updateStatus('idle');
        // Programmer la bascule idle -> offline (2 min)
        clearOfflineTimer();
        offlineTimerRef.current = setTimeout(() => {
          if (
            !isManualDndRef.current &&
            !isManualIdleRef.current &&
            !isManualOfflineRef.current &&
            currentStatusRef.current === 'idle'
          ) {
            updateStatus('offline');
          }
        }, IDLE_TO_OFFLINE_TIMEOUT);
      }
    }, IDLE_TIMEOUT);

    // Reset timer dnd -> offline si en dnd manuel
    if (isManualDndRef.current) {
      scheduleDndOffline();
    }
  }, [updateStatus, scheduleDndOffline]);

  const handleBeforeUnload = useCallback(() => {
    const userId = userIdRef.current;
    const accessToken = accessTokenRef.current;
    if (!userId || !accessToken) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'offline' }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Sync statut depuis profil
  useEffect(() => {
    if (profile) {
      currentStatusRef.current = profile.status;
      isManualDndRef.current = profile.status === 'dnd';
      // idle/offline manuels : on ne peut pas distinguer ici, on les considère non-manuels par défaut
      // (setManualStatus les marque comme manuels quand l'utilisateur les choisit)
      if (profile.status === 'dnd') {
        scheduleDndOffline();
      } else {
        clearDndOfflineTimer();
      }
    }
  }, [profile?.status, scheduleDndOffline]);

  useEffect(() => {
    if (!user || !profile) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (profile.status !== 'dnd' && profile.status !== 'idle' && profile.status !== 'offline') {
        updateStatus('online', true);
      }
    }

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    window.addEventListener('focus', handleActivity);
    window.addEventListener('pageshow', handleActivity);

    handleActivity();

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          if (
            !isManualDndRef.current &&
            !isManualIdleRef.current &&
            !isManualOfflineRef.current &&
            currentStatusRef.current !== 'idle' &&
            currentStatusRef.current !== 'offline'
          ) {
            updateStatus('idle');
            clearOfflineTimer();
            offlineTimerRef.current = setTimeout(() => {
              if (
                !isManualDndRef.current &&
                !isManualIdleRef.current &&
                !isManualOfflineRef.current &&
                currentStatusRef.current === 'idle'
              ) {
                updateStatus('offline');
              }
            }, IDLE_TO_OFFLINE_TIMEOUT);
          }
        }, HIDDEN_TAB_IDLE_TIMEOUT);
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pageshow', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearOfflineTimer();
      clearDndOfflineTimer();
    };
  }, [user?.id]);

  const setManualStatus = useCallback((status: UserStatus) => {
    isManualDndRef.current = status === 'dnd';
    isManualIdleRef.current = status === 'idle';
    isManualOfflineRef.current = status === 'offline';
    currentStatusRef.current = status;
    clearOfflineTimer();
    clearDndOfflineTimer();
    if (status === 'dnd') {
      scheduleDndOffline();
    }
  }, [scheduleDndOffline]);

  return { setManualStatus };
}
