import { useEffect, useState } from 'react';

/**
 * Unified responsive detection hook.
 *
 * Modern smartphone palier (CSS pixels):
 *   xxs   <360    (legacy small Androids, iPhone SE1 portrait scaled)
 *   xs    360-389 (Pixel 5, Galaxy S8/S9, **Nubia Redmagic 6 = 387**)
 *   sm    390-427 (iPhone 13/14/15)
 *   md    428-479 (iPhone Pro Max, Pixel Pro)
 *   phablet 480-639
 *   tablet 640-1023
 *   desktop ≥1024
 *
 * Also exposes:
 *   - isShortViewport (<700 dvh)  → compact layouts (split-screen, landscape phones)
 *   - isTallViewport  (≥820 dvh)  → roomy stacks (Redmagic-class, Pro Max)
 *   - isLandscape, dpr, hasHover, pointerFine, keyboardOffset
 */

const BP = {
  xxs: 360,
  xs: 390,
  sm: 428,
  md: 480,
  phablet: 640,
  tablet: 1024,
  desktop: 1440,
} as const;

function readWidth() {
  return typeof window !== 'undefined' ? window.innerWidth : 1280;
}
function readHeight() {
  if (typeof window === 'undefined') return 800;
  // dvh equivalent: visualViewport excludes dynamic toolbars
  return window.visualViewport?.height ?? window.innerHeight;
}

export function useBreakpoint() {
  const [width, setWidth] = useState(readWidth);
  const [height, setHeight] = useState(readHeight);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
        const vv = window.visualViewport;
        const h = vv?.height ?? window.innerHeight;
        setHeight(h);
        setKeyboardOffset(Math.max(0, window.innerHeight - h));
      });
    };

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const isXxs = width < BP.xxs;
  const isXs = width < BP.xs;
  const isSm = width < BP.sm;
  const isMd = width < BP.md;
  const isPhablet = width >= BP.md && width < BP.phablet;

  const isMobile = width < BP.phablet; // < 640
  const isTablet = width >= BP.phablet && width < BP.tablet; // 640–1023
  const isDesktop = width >= BP.tablet;
  const isLargeDesktop = width >= BP.desktop;

  const isShortViewport = height < 700;
  const isTallViewport = height >= 820;
  const isLandscape = width > height;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const hasHover =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  const pointerFine =
    typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  return {
    // Width tiers
    isXxs,
    isXs,
    isSm,
    isMd,
    isPhablet,
    // High-level
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    // Height & orientation
    isShortViewport,
    isTallViewport,
    isLandscape,
    // Capabilities
    dpr,
    hasHover,
    pointerFine,
    // Viewport / keyboard
    width,
    height,
    keyboardOffset,
    // Backwards-compat
    isSmallMobile: isXs,
  };
}
