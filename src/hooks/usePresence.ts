import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const HEARTBEAT_INTERVAL = 30 * 1000; // 30s keepalive ping
const ACTIVE_HEARTBEAT_THROTTLE = 30 * 1000; // throttle activity-based heartbeats

type UserStatus = Database['public']['Enums']['user_status'];

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 min inactivité avant idle (auto)
const HIDDEN_TAB_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 min quand onglet caché

const ACTIVITY_EVENTS = [
  'mousedown', 'mousemove', 'keydown', 'scroll', 'click',
  'touchstart', 'touchmove', 'touchend',
  'pointerdown', 'pointermove',
] as const;

export function usePresence() {
  const { user, profile, session, updateProfile } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStatusRef = useRef<UserStatus | null>(null);
  const isManualDndRef = useRef<boolean>(false);
  const isManualIdleRef = useRef<boolean>(false);
  const isManualOfflineRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastActiveHeartbeatRef = useRef<number>(0);

  const sendHeartbeat = useCallback((active: boolean) => {
    if (!userIdRef.current) return;
    supabase.rpc('heartbeat_presence', { _active: active }).then(() => {}, () => {});
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id || null;
    accessTokenRef.current = session?.access_token || null;
  }, [user?.id, session?.access_token]);

  const updateStatus = useCallback(async (status: UserStatus, forceUpdate = false) => {
    if (!user) return;
    // Respecter le statut manuel offline/idle — sauf forceUpdate
    if (!forceUpdate && (isManualIdleRef.current || isManualOfflineRef.current)) {
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

  // Bascule auto vers idle après IDLE_TIMEOUT — fonctionne aussi depuis `dnd`.
  // Page ouverte = jamais d'offline auto.
  const goIdleFromInactivity = useCallback(() => {
    if (isManualIdleRef.current || isManualOfflineRef.current) return;
    const cur = currentStatusRef.current;
    if (cur !== 'online' && cur !== 'dnd') return;
    // L'inactivité prime sur le dnd manuel : on désactive le flag pour qu'une
    // activité ultérieure ramène vers `online`.
    isManualDndRef.current = false;
    updateStatus('idle', true);
  }, [updateStatus]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Heartbeat actif throttlé (met à jour last_activity_at côté serveur)
    if (now - lastActiveHeartbeatRef.current >= ACTIVE_HEARTBEAT_THROTTLE) {
      lastActiveHeartbeatRef.current = now;
      sendHeartbeat(true);
    }

    // Réveil depuis idle automatique -> online
    if (
      !isManualDndRef.current &&
      !isManualIdleRef.current &&
      !isManualOfflineRef.current &&
      (currentStatusRef.current === 'idle' || currentStatusRef.current === 'offline')
    ) {
      updateStatus('online');
    }

    // Reset timer idle (auto) — depuis n'importe quel statut éligible (online/dnd)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(goIdleFromInactivity, IDLE_TIMEOUT);
  }, [updateStatus, sendHeartbeat, goIdleFromInactivity]);

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
    }
  }, [profile?.status]);

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
        idleTimerRef.current = setTimeout(goIdleFromInactivity, HIDDEN_TAB_IDLE_TIMEOUT);
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keepalive : ping passif toutes les 30s pour signaler que la page est ouverte
    sendHeartbeat(false);
    const keepaliveInterval = setInterval(() => sendHeartbeat(false), HEARTBEAT_INTERVAL);

    // Reconnexion réseau : restaurer le statut + re-pinger dès le retour en ligne
    const handleOnline = () => {
      lastActiveHeartbeatRef.current = 0;
      sendHeartbeat(true);
      if (isManualDndRef.current) {
        updateStatus('dnd', true);
      } else if (!isManualIdleRef.current && !isManualOfflineRef.current) {
        handleActivity();
        updateStatus('online', true);
      }
    };
    const handleOffline = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pageshow', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(keepaliveInterval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user?.id]);

  const setManualStatus = useCallback((status: UserStatus) => {
    isManualDndRef.current = status === 'dnd';
    isManualIdleRef.current = status === 'idle';
    isManualOfflineRef.current = status === 'offline';
    currentStatusRef.current = status;
  }, []);

  return { setManualStatus };
}
