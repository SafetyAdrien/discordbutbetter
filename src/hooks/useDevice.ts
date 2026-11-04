import { useSyncExternalStore } from 'react';

/**
 * Universal device detection — covers all modern smartphones (2018→2026)
 * including Nubia Redmagic 6 (388×863 CSS px, DPR 2.78, 165 Hz, ratio 21:9),
 * notch / dynamic island devices, foldables, PWA standalone, high-refresh
 * displays, and on-screen keyboard via VisualViewport.
 *
 * Tiers (CSS px width):
 *   mobile-xxs  ≤ 320  — iPhone SE 1, vieux Android
 *   mobile-xs   ≤ 360  — Galaxy S8/S9, Pixel 4a, iPhone 12 mini
 *   mobile-sm   ≤ 380  — iPhone 13/14/15, Pixel 6
 *   mobile-md   ≤ 400  — iPhone 14 Pro, Pixel 7/8, Nubia Redmagic 6
 *   mobile-lg   ≤ 430  — iPhone 15 Pro Max, S24 Ultra, OnePlus 12
 *   mobile-xl   ≤ 480  — phablets
 *   tablet      ≤ 1023
 *   desktop     > 1023
 */
export type DeviceTier =
  | 'mobile-xxs'
  | 'mobile-xs'
  | 'mobile-sm'
  | 'mobile-md'
  | 'mobile-lg'
  | 'mobile-xl'
  | 'tablet'
  | 'desktop';

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DeviceState {
  width: number;
  height: number;
  dpr: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  tier: DeviceTier;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Tall phones (height ≥ 900 & mobile width) — Redmagic 6/8/9, Xperia 1, etc. */
  isTall: boolean;
  pointer: 'coarse' | 'fine' | 'none';
  hover: boolean;
  /** Estimated > 90 Hz (Redmagic 165, ProMotion 120, ROG 165). */
  refreshRate: 'standard' | 'high';
  isStandalone: boolean;
  /** Single-fold device detected via CSS env / matchMedia. */
  isFoldable: boolean;
  hasNotch: boolean;
  /** Likely Dynamic Island (iPhone 14/15/16 Pro family). */
  hasDynamicIsland: boolean;
  safeArea: SafeArea;
  prefersReducedMotion: boolean;
}

function readSafeArea(): SafeArea {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;visibility:hidden;pointer-events:none;
    top:env(safe-area-inset-top);
    right:env(safe-area-inset-right);
    bottom:env(safe-area-inset-bottom);
    left:env(safe-area-inset-left);
  `;
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const safe = {
    top: parseFloat(cs.top) || 0,
    right: parseFloat(cs.right) || 0,
    bottom: parseFloat(cs.bottom) || 0,
    left: parseFloat(cs.left) || 0,
  };
  el.remove();
  return safe;
}

function computeTier(w: number): DeviceTier {
  if (w <= 320) return 'mobile-xxs';
  if (w <= 360) return 'mobile-xs';
  if (w <= 380) return 'mobile-sm';
  if (w <= 400) return 'mobile-md';
  if (w <= 430) return 'mobile-lg';
  if (w <= 480) return 'mobile-xl';
  if (w <= 1023) return 'tablet';
  return 'desktop';
}

async function estimateRefreshRate(): Promise<'standard' | 'high'> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('requestAnimationFrame' in window)) {
      resolve('standard');
      return;
    }
    let frames = 0;
    let start = performance.now();
    const tick = (t: number) => {
      frames++;
      if (t - start >= 250) {
        const fps = (frames * 1000) / (t - start);
        resolve(fps > 90 ? 'high' : 'standard');
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame((t) => {
      start = t;
      requestAnimationFrame(tick);
    });
  });
}

function snapshot(): DeviceState {
  if (typeof window === 'undefined') {
    return {
      width: 1280, height: 800, dpr: 1, aspectRatio: 1.6, orientation: 'landscape',
      tier: 'desktop', isMobile: false, isTablet: false, isDesktop: true,
      isTall: false, pointer: 'fine', hover: true, refreshRate: 'standard',
      isStandalone: false, isFoldable: false, hasNotch: false, hasDynamicIsland: false,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, prefersReducedMotion: false,
    };
  }
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  const safeArea = (safeAreaCache ??= readSafeArea());
  const tier = computeTier(width);
  const isMobile = width <= 480;
  const isTablet = width > 480 && width <= 1023;
  const aspectRatio = height === 0 ? 1 : width / height;

  const mq = (q: string) => window.matchMedia(q).matches;
  const pointer: 'coarse' | 'fine' | 'none' = mq('(pointer: coarse)') ? 'coarse' : mq('(pointer: fine)') ? 'fine' : 'none';

  return {
    width,
    height,
    dpr: window.devicePixelRatio || 1,
    aspectRatio,
    orientation: width >= height ? 'landscape' : 'portrait',
    tier,
    isMobile,
    isTablet,
    isDesktop: width > 1023,
    isTall: isMobile && height >= 900,
    pointer,
    hover: mq('(hover: hover)'),
    refreshRate: 'standard',
    isStandalone: mq('(display-mode: standalone)') || (navigator as any).standalone === true,
    isFoldable: mq('(spanning: single-fold-vertical)') || mq('(spanning: single-fold-horizontal)') || mq('(horizontal-viewport-segments: 2)') || mq('(vertical-viewport-segments: 2)'),
    hasNotch: safeArea.top >= 20,
    hasDynamicIsland: safeArea.top >= 50,
    safeArea,
    prefersReducedMotion: mq('(prefers-reduced-motion: reduce)'),
  };
}

/*
 * Etat partage : UN seul jeu d'ecouteurs et UN seul calcul par image, quel que soit le nombre de
 * composants qui lisent l'appareil (une vingtaine). Avant, chacun recalculait tout (dont la zone
 * de securite, qui force une mise en page) a chaque redimensionnement : un changement de zoom
 * figeait l'ecran plusieurs secondes. L'objet n'est republie que si une valeur change vraiment.
 */
let current: DeviceState | null = null;
let refreshRate: 'standard' | 'high' = 'standard';
let safeAreaCache: SafeArea | null = null;
let installed = false;
let raf = 0;
const subs = new Set<() => void>();

function sameDevice(a: DeviceState, b: DeviceState): boolean {
  for (const k of Object.keys(a) as Array<keyof DeviceState>) {
    if (k === 'safeArea') continue;
    if (a[k] !== b[k]) return false;
  }
  const x = a.safeArea, y = b.safeArea;
  return x.top === y.top && x.right === y.right && x.bottom === y.bottom && x.left === y.left;
}

function recompute(resetSafeArea = false) {
  if (resetSafeArea) safeAreaCache = null;
  const next = { ...snapshot(), refreshRate };
  if (!current || !sameDevice(current, next)) {
    current = next;
    subs.forEach((fn) => fn());
  }
}

function schedule(resetSafeArea = false) {
  if (resetSafeArea) safeAreaCache = null;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => recompute());
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const vv = window.visualViewport;
  const onResize = () => schedule();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => schedule(true));
  vv?.addEventListener('resize', onResize);
  [
    '(display-mode: standalone)',
    '(hover: hover)',
    '(pointer: coarse)',
    '(prefers-reduced-motion: reduce)',
    '(spanning: single-fold-vertical)',
    '(horizontal-viewport-segments: 2)',
  ].forEach((q) => window.matchMedia(q).addEventListener?.('change', () => schedule()));
  void estimateRefreshRate().then((rr) => {
    refreshRate = rr;
    recompute();
  });
}

function getDevice(): DeviceState {
  if (!current) current = { ...snapshot(), refreshRate };
  return current;
}

function subscribe(fn: () => void) {
  install();
  subs.add(fn);
  return () => { subs.delete(fn); };
}

export function useDevice(): DeviceState {
  return useSyncExternalStore(subscribe, getDevice, getDevice);
}
