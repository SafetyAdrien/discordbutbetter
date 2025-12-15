import { useState, useEffect, useMemo } from 'react';

export type LayoutBreakpoint = 'mobile' | 'tablet' | 'medium' | 'large';

interface ResponsiveLayout {
  breakpoint: LayoutBreakpoint;
  showServerList: boolean;
  showChannelSidebar: boolean;
  showMemberList: boolean;
  showBottomNav: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isMedium: boolean;
  isLarge: boolean;
}

const BREAKPOINTS = {
  mobile: 640,   // sm breakpoint (Tailwind)
  tablet: 768,   // md breakpoint (Tailwind)
  medium: 1024,  // lg breakpoint (Tailwind)
};

export function useResponsiveLayout(): ResponsiveLayout {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1400
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layout = useMemo<ResponsiveLayout>(() => {
    const isMobile = windowWidth < BREAKPOINTS.mobile;
    const isTablet = windowWidth >= BREAKPOINTS.mobile && windowWidth < BREAKPOINTS.tablet;
    const isMedium = windowWidth >= BREAKPOINTS.tablet && windowWidth < BREAKPOINTS.medium;
    const isLarge = windowWidth >= BREAKPOINTS.medium;

    let breakpoint: LayoutBreakpoint = 'large';
    if (isMobile) breakpoint = 'mobile';
    else if (isTablet) breakpoint = 'tablet';
    else if (isMedium) breakpoint = 'medium';

    return {
      breakpoint,
      // Server list always visible (except on mobile where it's in drawer)
      showServerList: !isMobile,
      // Channel sidebar visible on tablet+ screens (>= 768px)
      showChannelSidebar: isTablet || isMedium || isLarge,
      // Member list visible on medium+ screens (>= 1024px / lg breakpoint)
      showMemberList: isMedium || isLarge,
      // Bottom nav only on mobile (< 640px)
      showBottomNav: isMobile,
      isMobile,
      isTablet,
      isMedium,
      isLarge,
    };
  }, [windowWidth]);

  return layout;
}
