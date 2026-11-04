import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceContext } from '@/contexts/PresenceContext';

/*
 * Duree d'un statut manuel ("Inactif pendant 1 heure"...). L'echeance est gardee dans le
 * navigateur : a l'heure dite (ou a la reouverture de l'app si elle est passee) le statut
 * repasse sur "En ligne". "Indefiniment" supprime l'echeance.
 */

const EVENT = 'status-expiry-change';
const key = (userId: string) => `status-expiry:${userId}`;

export const STATUS_DURATIONS: { label: string; ms: number | null }[] = [
  { label: 'Pendant 15 minutes', ms: 15 * 60_000 },
  { label: 'Pendant 1 heure', ms: 3_600_000 },
  { label: 'Pendant 8 heures', ms: 8 * 3_600_000 },
  { label: 'Pendant 24 heures', ms: 24 * 3_600_000 },
  { label: 'Pendant 3 jours', ms: 3 * 24 * 3_600_000 },
  { label: 'Pour toujours', ms: null },
];

export function rememberStatusExpiry(userId: string, ms: number | null) {
  try {
    if (ms == null) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), String(Date.now() + ms));
  } catch {
    /* stockage indisponible : le statut reste simplement sans echeance */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useStatusExpiry() {
  const { user } = useAuth();
  const { setManualStatus } = usePresenceContext();

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      let until = 0;
      try {
        until = Number(localStorage.getItem(key(user.id)) ?? 0);
      } catch {
        return;
      }
      if (!until) return;
      const left = until - Date.now();
      if (left <= 0) {
        rememberStatusExpiry(user.id, null);
        setManualStatus('online');
        return;
      }
      timer = setTimeout(arm, Math.min(left, 2_000_000_000));
    };
    arm();
    window.addEventListener(EVENT, arm);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT, arm);
    };
  }, [user, setManualStatus]);
}
