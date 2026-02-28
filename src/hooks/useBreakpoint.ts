import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 1024,
} as const;

export function useBreakpoint() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    isSmallMobile: width < BREAKPOINTS.xs,
    isMobile: width < BREAKPOINTS.sm,
    isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isDesktop: width >= BREAKPOINTS.md,
    width,
  };
}
