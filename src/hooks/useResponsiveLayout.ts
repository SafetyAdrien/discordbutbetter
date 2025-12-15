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
  mobile: 600,
  tablet: 900,
  medium: 1200,
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
      // Channel sidebar visible on medium+ screens
      showChannelSidebar: isMedium || isLarge,
      // Member list only visible on large screens
      showMemberList: isLarge,
      // Bottom nav only on mobile
      showBottomNav: isMobile,
      isMobile,
      isTablet,
      isMedium,
      isLarge,
    };
  }, [windowWidth]);

  return layout;
}
