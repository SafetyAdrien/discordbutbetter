import { useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';

/** Supprime le statut personnalise (bouton corbeille de la bulle, expiration). */
export function useClearCustomStatus() {
  const { mutate } = useUpdateProfile();
  return useCallback(() => mutate({ custom_status: null, custom_status_expires_at: null }), [mutate]);
}

/** Efface son propre statut a l'echeance choisie dans "Effacer apres" (le serveur nettoie aussi si pg_cron est actif). */
export function useCustomStatusExpiry() {
  const { profile } = useAuth();
  const clear = useClearCustomStatus();
  const expiresAt = profile?.custom_status ? profile.custom_status_expires_at : null;
  useEffect(() => {
    if (!expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const left = new Date(expiresAt).getTime() - Date.now();
      if (left <= 0) return clear();
      // setTimeout plafonne a ~24,8 jours : on rearme par paliers.
      timer = setTimeout(arm, Math.min(left, 2_000_000_000));
    };
    arm();
    return () => clearTimeout(timer);
  }, [expiresAt, clear]);
}
