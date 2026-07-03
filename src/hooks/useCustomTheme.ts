/**
 * useCustomTheme
 *
 * A lightweight custom-theme layer that renders as a full-screen tinted
 * overlay behind the app UI. All updates go directly to CSS variables on
 * the <html> element and are rAF-throttled — React never re-renders when
 * the user drags the color picker, so the editor stays cheap even on
 * mid-range hardware.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';

const LOCAL_KEY = 'nexuschat:ui:customTheme';
const HTML_CLASS = 'custom-theme';

export type CustomThemeState = {
  enabled: boolean;
  chips: string[]; // 1–3 hex colors
  intensity: number; // 0–100
  angle: number; // 0–360
};

export const DEFAULT_CUSTOM_THEME: CustomThemeState = {
  enabled: false,
  chips: ['#5865F2'],
  intensity: 60,
  angle: 135,
};

function readLocal(): CustomThemeState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_CUSTOM_THEME;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CUSTOM_THEME, ...parsed };
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
}

let cache: CustomThemeState = readLocal();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cache));
  } catch {
    /* noop */
  }
}

/** rAF-throttled writer for the CSS custom properties. */
let rafId = 0;
function scheduleApply() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    applyToDom();
  });
}

function applyToDom() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!cache.enabled) {
    root.classList.remove(HTML_CLASS);
    root.style.removeProperty('--ct-gradient');
    root.style.removeProperty('--ct-intensity');
    return;
  }
  root.classList.add(HTML_CLASS);
  const stops =
    cache.chips.length === 1
      ? `${cache.chips[0]}, ${cache.chips[0]}`
      : cache.chips.join(', ');
  root.style.setProperty('--ct-gradient', `linear-gradient(${cache.angle}deg, ${stops})`);
  root.style.setProperty('--ct-intensity', String(cache.intensity / 100));
}

/** Public API */
export function setCustomTheme(patch: Partial<CustomThemeState>, options?: { persist?: boolean }) {
  cache = { ...cache, ...patch };
  scheduleApply();
  if (options?.persist !== false) persist();
  listeners.forEach((l) => l());
}

export function getCustomTheme() {
  return cache;
}

/** Randomize helper for the "Surprise Me!" button. */
export function randomizeCustomTheme() {
  const rand = () => `hsl(${Math.floor(Math.random() * 360)} 80% 55%)`;
  // Convert hsl(...) to hex so downstream inputs work; keep simple by using two hues
  const h1 = Math.floor(Math.random() * 360);
  const h2 = (h1 + 40 + Math.floor(Math.random() * 120)) % 360;
  const toHex = (h: number) => {
    const s = 70;
    const l = 55;
    // HSL to RGB
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  setCustomTheme({
    enabled: true,
    chips: [toHex(h1), toHex(h2)],
    angle: Math.floor(Math.random() * 360),
    intensity: 40 + Math.floor(Math.random() * 45),
  });
  void rand;
}

export function resetCustomTheme() {
  setCustomTheme({ ...DEFAULT_CUSTOM_THEME });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCustomTheme() {
  const state = useSyncExternalStore(subscribe, () => cache, () => cache);
  return state;
}

/** Ensures the DOM reflects the stored theme on first mount. */
export function useMountCustomTheme() {
  useEffect(() => {
    applyToDom();
    // Disable temporarily when tab is backgrounded (avoids paints on hidden pages)
    const onVis = () => {
      if (document.hidden && cache.enabled) {
        document.documentElement.classList.remove(HTML_CLASS);
      } else if (!document.hidden && cache.enabled) {
        document.documentElement.classList.add(HTML_CLASS);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
}

// Public setters kept individual for the editor components
export function setChip(i: number, hex: string) {
  const chips = [...cache.chips];
  chips[i] = hex;
  setCustomTheme({ chips });
}

export function addChip() {
  if (cache.chips.length >= 3) return;
  const last = cache.chips[cache.chips.length - 1] || '#5865F2';
  setCustomTheme({ chips: [...cache.chips, last] });
}

export function removeChip(i: number) {
  if (cache.chips.length <= 1) return;
  setCustomTheme({ chips: cache.chips.filter((_, k) => k !== i) });
}
