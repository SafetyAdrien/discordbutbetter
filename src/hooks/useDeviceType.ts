import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return 'mobile';
    if (width < BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.mobile) {
        setDeviceType('mobile');
      } else if (width < BREAKPOINTS.tablet) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
}

export function useIsMobileOrTablet(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'mobile' || deviceType === 'tablet';
}
