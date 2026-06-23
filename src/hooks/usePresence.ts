import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

  const lastActivityHeartbeatRef = useRef<number>(0);
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // Heartbeat "actif" throttlé à 30 s pour bumper last_activity_at côté serveur
    if (Date.now() - lastActivityHeartbeatRef.current > 30_000) {
      lastActivityHeartbeatRef.current = Date.now();
      supabase.rpc('heartbeat_presence', { _active: true }).then(() => {}, () => {});
    }

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

    // Reset timer idle (auto) — Discord-like : on ne passe JAMAIS offline automatiquement.
    // Seule la fermeture de l'onglet/navigateur (90 s sans heartbeat côté serveur) déclenche offline.
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
      }
    }, IDLE_TIMEOUT);

    // Reset timer dnd -> offline si en dnd manuel
    if (isManualDndRef.current) {
      scheduleDndOffline();
    }
  }, [updateStatus, scheduleDndOffline]);

  // ===== Multi-tab coordination =====
  // Chaque onglet s'enregistre via BroadcastChannel pour éviter qu'une fermeture
  // marque l'utilisateur offline alors qu'un autre onglet/fenêtre est encore ouvert.
  const tabIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const otherTabsRef = useRef<Map<string, number>>(new Map()); // tabId -> lastSeen ms
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const hasOtherAliveTab = useCallback(() => {
    const now = Date.now();
    for (const [id, ts] of otherTabsRef.current) {
      if (now - ts < 8_000) return true;
      otherTabsRef.current.delete(id);
    }
    return false;
  }, []);

  const markOfflineBeacon = useCallback(() => {
    // Ne pas marquer offline si un autre onglet est encore vivant
    if (hasOtherAliveTab()) return;
    const userId = userIdRef.current;
    const accessToken = accessTokenRef.current;
    if (!userId || !accessToken) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=minimal',
    };
    const body = JSON.stringify({ status: 'offline' });
    try {
      fetch(url, { method: 'PATCH', headers, body, keepalive: true }).catch(() => {});
    } catch { /* ignore */ }
  }, [hasOtherAliveTab]);

  const handleBeforeUnload = useCallback(() => {
    // Annoncer la fermeture de cet onglet aux autres
    try {
      broadcastRef.current?.postMessage({ type: 'bye', tabId: tabIdRef.current });
    } catch { /* ignore */ }
    markOfflineBeacon();
  }, [markOfflineBeacon]);

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
        // Onglet caché : on programme un passage en idle (jamais en offline).
        // Offline n'est déclenché QUE par la fermeture réelle de la page (pagehide/beforeunload)
        // ou par le watchdog serveur de 90 s sans heartbeat.
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
          }
        }, HIDDEN_TAB_IDLE_TIMEOUT);
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ===== BroadcastChannel inter-onglets =====
    let bc: BroadcastChannel | null = null;
    let tabPingInterval: ReturnType<typeof setInterval> | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`presence:${user.id}`);
        broadcastRef.current = bc;
        bc.onmessage = (ev) => {
          const data = ev.data as { type: string; tabId: string } | null;
          if (!data || !data.tabId || data.tabId === tabIdRef.current) return;
          if (data.type === 'ping' || data.type === 'hello') {
            otherTabsRef.current.set(data.tabId, Date.now());
            if (data.type === 'hello') {
              try { bc?.postMessage({ type: 'ping', tabId: tabIdRef.current }); } catch { /* ignore */ }
            }
          } else if (data.type === 'bye') {
            otherTabsRef.current.delete(data.tabId);
          }
        };
        try { bc.postMessage({ type: 'hello', tabId: tabIdRef.current }); } catch { /* ignore */ }
        tabPingInterval = setInterval(() => {
          try { bc?.postMessage({ type: 'ping', tabId: tabIdRef.current }); } catch { /* ignore */ }
        }, 3_000);
      }
    } catch { /* ignore */ }

    // Heartbeat : on continue TOUJOURS d'envoyer le heartbeat, même onglet caché,
    // pour rafraîchir last_seen_at (sinon le watchdog 90 s nous passerait offline à tort).
    // Le flag _active=false quand inactif > 60 s permet au serveur de basculer en idle après 5 min.
    const sendHeartbeat = () => {
      const active = Date.now() - lastActivityRef.current < 60_000
        && (typeof document === 'undefined' || document.visibilityState === 'visible');
      supabase.rpc('heartbeat_presence', { _active: active }).then(() => {}, () => {});
    };
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000);


    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('pageshow', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      if (tabPingInterval) clearInterval(tabPingInterval);
      try {
        bc?.postMessage({ type: 'bye', tabId: tabIdRef.current });
        bc?.close();
      } catch { /* ignore */ }
      broadcastRef.current = null;
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
