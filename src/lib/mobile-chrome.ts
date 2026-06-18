import { useEffect, useState } from 'react';

/**
 * Lightweight pub/sub to coordinate mobile chrome (bottom nav, headers)
 * with full-screen overlays such as the mobile user profile sheet.
 *
 * Components rendering full-screen mobile overlays should call
 * `setMobileProfileOpen(true)` on mount and `false` on unmount.
 * `MobileLayout` reads this via `useMobileProfileOpen()` to hide the
 * bottom navigation bar while the overlay is visible.
 */

let _open = false;
const listeners = new Set<(v: boolean) => void>();

export function setMobileProfileOpen(value: boolean) {
  if (_open === value) return;
  _open = value;
  listeners.forEach((l) => l(value));
}

export function getMobileProfileOpen() {
  return _open;
}

export function useMobileProfileOpen() {
  const [v, setV] = useState(_open);
  useEffect(() => {
    listeners.add(setV);
    setV(_open);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
