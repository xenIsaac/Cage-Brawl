import { useState, useEffect } from 'react';
import { isMobileDevice } from './deviceDetection';

export interface ResponsiveLayoutState {
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
  isCompactLandscape: boolean;
  width: number;
  height: number;
  scale: number;
  orientation: 'portrait' | 'landscape';
}

export function getResponsiveLayoutState(): ResponsiveLayoutState {
  if (typeof window === 'undefined') {
    return {
      isPortrait: false,
      isLandscape: true,
      isMobile: false,
      isCompactLandscape: false,
      width: 1920,
      height: 1080,
      scale: 1.0,
      orientation: 'landscape',
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;
  const isLandscape = !isPortrait;
  const isMobile = isMobileDevice() || Math.min(width, height) < 768;
  const isCompactLandscape = isLandscape && (height < 540 || (isMobile && height < 600));

  // Dynamic UI scale multiplier calibrated for zero-scrolling fit
  let scale = 1.0;
  if (isPortrait) {
    // Dynamic scale for portrait screens: baseline 390x844
    scale = Math.min(1.0, Math.max(0.72, Math.min(width / 390, height / 800)));
  } else {
    // Dynamic scale for landscape screens: baseline 844x390
    scale = Math.min(1.0, Math.max(0.70, height / 440));
  }

  return {
    isPortrait,
    isLandscape,
    isMobile,
    isCompactLandscape,
    width,
    height,
    scale,
    orientation: isPortrait ? 'portrait' : 'landscape',
  };
}

export function useResponsiveLayout(): ResponsiveLayoutState {
  const [layout, setLayout] = useState<ResponsiveLayoutState>(getResponsiveLayoutState);

  useEffect(() => {
    const update = () => {
      const next = getResponsiveLayoutState();
      setLayout(next);
      if (typeof document !== 'undefined') {
        document.body.dataset.orientation = next.orientation;
        document.body.dataset.device = next.isMobile ? 'mobile' : 'desktop';
        document.documentElement.style.setProperty('--dynamic-scale', next.scale.toFixed(3));
      }
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return layout;
}
