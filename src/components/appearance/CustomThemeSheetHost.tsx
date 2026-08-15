/**
 * Global mount point + tiny store for the custom-theme side sheet, so it
 * can be opened from anywhere (in particular from the settings modal,
 * which closes right before the sheet opens — see CustomThemeBanner).
 */
import { useSyncExternalStore } from 'react';
import { CustomThemeSheet } from './CustomThemeSheet';

let isOpen = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openCustomThemeSheet() {
  if (isOpen) return;
  isOpen = true;
  emit();
}

export function closeCustomThemeSheet() {
  if (!isOpen) return;
  isOpen = false;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() { return isOpen; }

export function useCustomThemeSheetOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function CustomThemeSheetHost() {
  const open = useCustomThemeSheetOpen();
  return <CustomThemeSheet open={open} onOpenChange={(v) => (v ? openCustomThemeSheet() : closeCustomThemeSheet())} />;
}
