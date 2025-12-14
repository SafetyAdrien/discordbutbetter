import { useState, useCallback, useEffect, useRef } from 'react';
import { useIsMobile } from './use-mobile';

type MobileDrawer = 'left' | 'right' | null;

export function useMobileNavigation() {
  const isMobile = useIsMobile();
  const [openDrawer, setOpenDrawer] = useState<MobileDrawer>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const openLeft = useCallback(() => setOpenDrawer('left'), []);
  const openRight = useCallback(() => setOpenDrawer('right'), []);
  const closeDrawer = useCallback(() => setOpenDrawer(null), []);

  // Handle touch gestures for swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isMobile) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = Math.abs(touchEndY - touchStartY.current);
    
    // Only trigger if horizontal swipe is greater than vertical (not scrolling)
    if (Math.abs(diffX) < 50 || diffY > Math.abs(diffX)) return;

    // Swipe from left edge to open left drawer
    if (diffX > 50 && touchStartX.current < 30 && openDrawer === null) {
      setOpenDrawer('left');
    }
    // Swipe from right edge to open right drawer
    else if (diffX < -50 && touchStartX.current > window.innerWidth - 30 && openDrawer === null) {
      setOpenDrawer('right');
    }
    // Swipe right to close right drawer
    else if (diffX > 50 && openDrawer === 'right') {
      setOpenDrawer(null);
    }
    // Swipe left to close left drawer
    else if (diffX < -50 && openDrawer === 'left') {
      setOpenDrawer(null);
    }
  }, [isMobile, openDrawer]);

  useEffect(() => {
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchEnd]);

  // Close drawer on orientation change
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && openDrawer) {
        setOpenDrawer(null);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, openDrawer]);

  return {
    isMobile,
    openDrawer,
    isLeftOpen: openDrawer === 'left',
    isRightOpen: openDrawer === 'right',
    openLeft,
    openRight,
    closeDrawer,
  };
}
