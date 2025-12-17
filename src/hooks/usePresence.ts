import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type UserStatus = Database['public']['Enums']['user_status'];

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes d'inactivité avant de passer en "idle"
const HIDDEN_TAB_IDLE_TIMEOUT = 60 * 1000; // 1 minute quand l'onglet est caché
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function usePresence() {
  const { user, profile, session } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStatusRef = useRef<UserStatus | null>(null);
  const isManualStatusRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Stocker l'ID utilisateur et le token pour le cleanup
  useEffect(() => {
    userIdRef.current = user?.id || null;
    accessTokenRef.current = session?.access_token || null;
  }, [user?.id, session?.access_token]);

  // Met à jour le statut dans Supabase (la subscription postgres_changes propagera le changement)
  const updateStatus = useCallback(async (status: UserStatus, forceUpdate = false) => {
    if (!user) return;
    
    // Ne pas changer si le statut manuel est "dnd" (sauf si force)
    if (!forceUpdate && isManualStatusRef.current && currentStatusRef.current === 'dnd') {
      return;
    }

    // Ne pas mettre à jour si c'est le même statut
    if (currentStatusRef.current === status && !forceUpdate) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', user.id);
      
      if (!error) {
        currentStatusRef.current = status;
      }
    } catch (error) {
      console.error('Error updating presence status:', error);
    }
  }, [user]);

  // Gère l'activité détectée
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Si l'utilisateur était inactif et n'est pas en "dnd", le repasser en ligne
    if (currentStatusRef.current === 'idle' && !isManualStatusRef.current) {
      updateStatus('online');
    }

    // Réinitialiser le timer d'inactivité
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      // Passer en idle si pas en statut manuel "dnd"
      if (currentStatusRef.current !== 'dnd' && currentStatusRef.current !== 'offline') {
        updateStatus('idle');
      }
    }, IDLE_TIMEOUT);
  }, [updateStatus]);

  // Gère la fermeture de l'application avec fetch keepalive (synchrone)
  const handleBeforeUnload = useCallback(() => {
    const userId = userIdRef.current;
    const accessToken = accessTokenRef.current;
    
    if (!userId || !accessToken) return;
    
    // Utiliser fetch avec keepalive pour garantir l'envoi avant fermeture
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'offline' }),
      keepalive: true
    }).catch(() => {
      // Ignorer les erreurs lors de la fermeture
    });
  }, []);

  // Effet pour initialiser la détection de présence
  useEffect(() => {
    if (!user || !profile) return;

    // Initialiser le statut courant
    currentStatusRef.current = profile.status;
    isManualStatusRef.current = profile.status === 'dnd';

    // Mettre en ligne au démarrage (sauf si dnd)
    if (profile.status !== 'dnd') {
      updateStatus('online', true);
    }

    // Ajouter les listeners d'activité
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Démarrer le timer d'inactivité initial
    handleActivity();

    // Gérer la fermeture de l'onglet/navigateur
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Gérer la visibilité de la page (onglet en arrière-plan)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // L'onglet est caché, commencer le timer d'inactivité plus rapidement
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
          if (currentStatusRef.current !== 'dnd' && currentStatusRef.current !== 'offline') {
            updateStatus('idle');
          }
        }, HIDDEN_TAB_IDLE_TIMEOUT);
      } else {
        // L'onglet est visible à nouveau
        handleActivity();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [user?.id, profile?.id, handleActivity, handleBeforeUnload, updateStatus]);

  // Met à jour le statut manuel (appelé depuis le sélecteur de statut)
  const setManualStatus = useCallback((status: UserStatus) => {
    isManualStatusRef.current = status === 'dnd';
    currentStatusRef.current = status;
  }, []);

  return { setManualStatus };
}
