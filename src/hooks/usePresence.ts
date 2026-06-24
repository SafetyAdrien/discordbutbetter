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
  const { user, profile, updateProfile } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStatusRef = useRef<UserStatus | null>(null);
  const manualStatusRef = useRef<UserStatus | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastActiveHeartbeatRef = useRef<number>(0);
  const userIdRef = useRef<string | null>(null);

  const sendHeartbeat = useCallback((active: boolean) => {
    if (!userIdRef.current) return;
    supabase.rpc('heartbeat_presence', { _active: active }).then(() => {}, () => {});
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  const updateStatus = useCallback(async (status: UserStatus, force = false) => {
    if (!user) return;
    if (currentStatusRef.current === status && !force) return;
    try {
      await updateProfile({ status });
      currentStatusRef.current = status;
    } catch (error) {
      console.error('Error updating presence status:', error);
    }
  }, [user, updateProfile]);

  // Bascule auto vers idle après IDLE_TIMEOUT
  const goIdleFromInactivity = useCallback(() => {
    const cur = currentStatusRef.current;
    if (cur !== 'online' && cur !== 'dnd') return;
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

    // Réveil depuis idle/offline auto → restauration du statut manuel
    const cur = currentStatusRef.current;
    if (cur === 'idle' || cur === 'offline') {
      const manual = manualStatusRef.current;
      // Ne pas réveiller si l'utilisateur a explicitement choisi idle/offline
      if (manual !== 'idle' && manual !== 'offline') {
        updateStatus(manual ?? 'online');
      }
    }

    // Reset timer idle (auto)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(goIdleFromInactivity, IDLE_TIMEOUT);
  }, [updateStatus, sendHeartbeat, goIdleFromInactivity]);

  // Sync statut depuis profil (en cas de changement temps réel ou initial)
  useEffect(() => {
    if (profile) {
      currentStatusRef.current = profile.status;
      // @ts-expect-error manual_status présent en BDD
      if (profile.manual_status !== undefined) {
        // @ts-expect-error
        manualStatusRef.current = profile.manual_status ?? null;
      }
    }
  }, [profile?.status, (profile as any)?.manual_status]);

  useEffect(() => {
    if (!user || !profile) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const manual = (profile as any).manual_status as UserStatus | null | undefined;
      manualStatusRef.current = manual ?? null;

      // Au démarrage : si statut auto (idle/offline) → restaurer le statut manuel
      if (profile.status === 'idle' || profile.status === 'offline') {
        if (manual && manual !== 'idle' && manual !== 'offline') {
          updateStatus(manual, true);
        } else if (!manual) {
          updateStatus('online', true);
        }
        // sinon : l'utilisateur a choisi idle/offline → on respecte
      }
    }

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    window.addEventListener('focus', handleActivity);
    window.addEventListener('pageshow', handleActivity);

    handleActivity();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(goIdleFromInactivity, HIDDEN_TAB_IDLE_TIMEOUT);
      } else {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keepalive : ping passif toutes les 30s pour signaler que la page est ouverte.
    // Tant que ce ping arrive, le serveur ne bascule pas l'utilisateur en offline.
    sendHeartbeat(false);
    const keepaliveInterval = setInterval(() => sendHeartbeat(false), HEARTBEAT_INTERVAL);

    // Reconnexion réseau : restaurer le statut + re-pinger dès le retour en ligne
    const handleOnline = () => {
      lastActiveHeartbeatRef.current = 0;
      sendHeartbeat(true);
      handleActivity();
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(keepaliveInterval);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user?.id]);

  const setManualStatus = useCallback((status: UserStatus) => {
    manualStatusRef.current = status;
    currentStatusRef.current = status;
    // Persister à la fois le statut courant et le statut manuel (mémoire de restauration)
    updateProfile({ status, manual_status: status } as any).catch(() => {});
  }, [updateProfile]);

  return { setManualStatus };
}
