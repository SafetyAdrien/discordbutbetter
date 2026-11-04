import { useSyncExternalStore } from 'react';

/*
 * Options du menu "Plus d'options" du salon vocal (video de reference) : affichage en grille,
 * ma camera, participants sans video, apercus des nouveaux messages. Memorisees sur l'appareil.
 */
export interface VoiceViewPrefs {
  grid: boolean;
  showSelf: boolean;
  showNoVideo: boolean;
  previews: boolean;
}

const KEY = 'voice:view-prefs';
const DEFAULTS: VoiceViewPrefs = { grid: true, showSelf: true, showNoVideo: true, previews: true };
const listeners = new Set<() => void>();

function read(): VoiceViewPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<VoiceViewPrefs>) };
  } catch {
    return DEFAULTS;
  }
}
let current = read();

export function setVoiceViewPref<K extends keyof VoiceViewPrefs>(key: K, value: VoiceViewPrefs[K]) {
  current = { ...current, [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l());
}

export function useVoiceViewPrefs(): VoiceViewPrefs {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => current, () => DEFAULTS);
}
