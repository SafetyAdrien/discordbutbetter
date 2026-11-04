import { useSyncExternalStore } from 'react';

/* Reglages du partage d'ecran en cours ("1080p 30 FPS"), pour l'en-tete et le bloc "Go Live". */
export interface ScreenShareInfo { height: number; fps: number; label: string }
let info: ScreenShareInfo | null = null;
const subs = new Set<() => void>();

export function setScreenShareInfo(next: { height: number; fps: number } | null) {
  info = next ? { ...next, label: `${next.height}p ${next.fps} FPS` } : null;
  subs.forEach((f) => f());
}
export function useScreenShareInfo(): ScreenShareInfo | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => info, () => null);
}
