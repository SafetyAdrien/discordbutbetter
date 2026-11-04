import { useSyncExternalStore } from 'react';
import { onScopeUserChange } from '@/lib/userScope';

/*
 * Etat local de l'appel de MP : l'appel auquel je participe (le serveur ne garde qu'un statut par appel), les sonneries
 * mises de cote ("decline" local : l'appel continue pour l'autre personne, qui peut le rejoindre ensuite) et l'etat de
 * mes peripheriques, lu par le panneau "Vocal connecte" de la barre laterale.
 */

export interface DMCallSessionState {
  joined: { callId: string; conversationId: string; startedAt: number } | null;
  dismissed: string[];
  muted: boolean;
  deafened: boolean;
  camera: boolean;
  screen: boolean;
  /** Nom (ou pseudo d'ami) de l'interlocuteur : affiche dans le panneau "Vocal connecte". */
  peerName: string;
}

let state: DMCallSessionState = { joined: null, dismissed: [], muted: false, deafened: false, camera: false, screen: false, peerName: '' };
const listeners = new Set<() => void>();
const set = (patch: Partial<DMCallSessionState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

onScopeUserChange(() => set({ joined: null, dismissed: [], muted: false, deafened: false, camera: false, screen: false, peerName: '' }));

export const useDMCallSession = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );

export const getDMCallSession = () => state;

export const joinCallSession = (callId: string, conversationId: string, peerName = '') =>
  set({ joined: { callId, conversationId, startedAt: Date.now() }, dismissed: state.dismissed.filter((d) => d !== callId), muted: false, deafened: false, camera: false, screen: false, peerName });
export const leaveCallSession = (callId?: string) => {
  if (!callId || state.joined?.callId === callId) set({ joined: null, muted: false, deafened: false, camera: false, screen: false });
};
export const dismissRing = (callId: string) => !state.dismissed.includes(callId) && set({ dismissed: [...state.dismissed, callId] });
export const setCallMedia = (patch: Partial<Pick<DMCallSessionState, 'muted' | 'deafened' | 'camera' | 'screen' | 'peerName'>>) => set(patch);

/** Actions demandees depuis le panneau de la barre laterale a la scene d'appel ouverte. */
export const DM_CALL_ACTION_EVENT = 'app:dm-call-action';
export type DMCallAction = 'camera' | 'screen' | 'hangup' | 'mute' | 'deafen';
export const emitCallAction = (action: DMCallAction) => window.dispatchEvent(new CustomEvent(DM_CALL_ACTION_EVENT, { detail: action }));
