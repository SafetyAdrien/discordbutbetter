import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1440,
} as const;

export function useBreakpoint() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isXs = width < BREAKPOINTS.xs;
  const isMobile = width < BREAKPOINTS.md; // < 768
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg; // 768–1023
  const isDesktop = width >= BREAKPOINTS.lg; // >= 1024
  const isLargeDesktop = width >= BREAKPOINTS.xl; // >= 1440

  return {
    // New unified flags
    isXs,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    // Backwards-compat
    isSmallMobile: isXs,
    width,
  };
}
