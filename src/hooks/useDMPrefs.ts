import { useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

/* Preferences de la liste des MP : epingles, MP fermes et bandeau des comptes bloques (parametres de l'utilisateur). */
export function useDMPrefs() {
  const { settings, update } = useUserSettings();
  const { pinned, hidden, hide_blocked_banner, muted } = settings.dms;

  const togglePin = useCallback((id: string) => update({ dms: { pinned: pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id] } }), [pinned, update]);
  const close = useCallback((id: string) => update({ dms: { hidden: hidden.includes(id) ? hidden : [...hidden, id], pinned: pinned.filter((x) => x !== id) } }), [hidden, pinned, update]);
  const reopen = useCallback((id: string) => hidden.includes(id) && update({ dms: { hidden: hidden.filter((x) => x !== id) } }), [hidden, update]);
  const hideBlockedBanner = useCallback(() => update({ dms: { hide_blocked_banner: true } }), [update]);

  const isMuted = useCallback((id: string) => muted.some((m) => m.id === id && (m.until === null || m.until > Date.now())), [muted]);
  /** `ms` : duree en millisecondes, null = jusqu'a reactivation. */
  const mute = useCallback((id: string, ms: number | null) => update({ dms: { muted: [...muted.filter((m) => m.id !== id), { id, until: ms === null ? null : Date.now() + ms }] } }), [muted, update]);
  const unmute = useCallback((id: string) => update({ dms: { muted: muted.filter((m) => m.id !== id) } }), [muted, update]);

  return { pinned, hidden, isMuted, mute, unmute, showBlockedBanner: !hide_blocked_banner, togglePin, close, reopen, hideBlockedBanner };
}
