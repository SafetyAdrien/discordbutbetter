/**
 * Haptic feedback helper — intentionally disabled.
 *
 * All mobile vibration feedback has been removed to keep the app feeling
 * lighter and less distracting. The API remains available so callers don't
 * break, but every call returns early without triggering the device vibrator.
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

export function haptic(_pattern: HapticPattern = 'light'): void {
  // Vibration feedback is globally disabled for the mobile app.
  return;
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
