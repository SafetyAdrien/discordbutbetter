/**
 * Lightweight haptic feedback helper.
 *
 * - No-op outside browsers / when the API isn't available.
 * - Respects `prefers-reduced-motion: reduce` (we treat reduced motion as a
 *   proxy for users who also want fewer tactile distractions).
 * - Safe to call on every interaction; failures are swallowed.
 */

type HapticPattern = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 5,
  light: 10,
  medium: 18,
  heavy: 28,
  success: [10, 30, 10],
  warning: [15, 40, 15],
  error: [25, 40, 25, 40, 25],
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function canVibrate(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function haptic(pattern: HapticPattern = 'light'): void {
  if (!canVibrate() || prefersReducedMotion()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* swallow — vibration is a best-effort enhancement */
  }
}

export const haptics = {
  selection: () => haptic('selection'),
  light: () => haptic('light'),
  medium: () => haptic('medium'),
  heavy: () => haptic('heavy'),
  success: () => haptic('success'),
  warning: () => haptic('warning'),
  error: () => haptic('error'),
};
