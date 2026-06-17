import { useDevice, type DeviceTier } from './useDevice';

const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

/**
 * Backwards-compatible breakpoint hook, now powered by useDevice for full
 * smartphone tier coverage (xxs → xl-mobile → tablet → desktop) plus
 * orientation, safe-area, foldable and refresh-rate awareness.
 */
export function useBreakpoint() {
  const d = useDevice();

  const isXs = d.width < BREAKPOINTS.xs;
  const isMobile = d.width < BREAKPOINTS.md; // < 768
  const isTablet = d.width >= BREAKPOINTS.md && d.width < BREAKPOINTS.lg;
  const isDesktop = d.width >= BREAKPOINTS.lg;
  const isLargeDesktop = d.width >= BREAKPOINTS.xl;

  return {
    // Legacy API
    isXs,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallMobile: isXs,
    width: d.width,
    // Extended device info
    height: d.height,
    tier: d.tier as DeviceTier,
    orientation: d.orientation,
    isTall: d.isTall,
    isFoldable: d.isFoldable,
    isStandalone: d.isStandalone,
    hasNotch: d.hasNotch,
    hasDynamicIsland: d.hasDynamicIsland,
    safeArea: d.safeArea,
    pointer: d.pointer,
    hover: d.hover,
    refreshRate: d.refreshRate,
    dpr: d.dpr,
    aspectRatio: d.aspectRatio,
  };
}
