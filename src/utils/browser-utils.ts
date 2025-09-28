/**
 * Cross-browser utility functions for better compatibility
 */

// Polyfill for smoothScrolling in older browsers
export const smoothScrollTo = (element: HTMLElement, options: ScrollToOptions = {}) => {
  if ('scrollBehavior' in document.documentElement.style) {
    element.scrollTo({
      behavior: 'smooth',
      ...options
    });
  } else {
    // Fallback for browsers that don't support smooth scrolling
    const targetY = options.top || 0;
    const startY = element.scrollTop;
    const difference = targetY - startY;
    const startTime = performance.now();
    const duration = 500; // 500ms animation

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const easeInOut = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
        
      element.scrollTop = startY + difference * easeInOut;
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }
};

// Safe viewport height for iOS Safari
export const getSafeViewportHeight = (): string => {
  if (typeof window !== 'undefined') {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      return `${window.innerHeight}px`;
    }
  }
  return '100vh';
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get optimal image format based on browser support
export const getOptimalImageFormat = (): 'avif' | 'webp' | 'jpg' => {
  if (typeof window === 'undefined') return 'jpg';
  
  // Check AVIF support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
      return 'avif';
    }
  } catch (e) {
    // AVIF not supported
  }
  
  try {
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      return 'webp';
    }
  } catch (e) {
    // WebP not supported
  }
  
  return 'jpg';
};

// Prevent zoom on iOS Safari input focus
export const preventIOSZoom = () => {
  if (typeof window === 'undefined') return;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return;
  
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const element = input as HTMLInputElement;
    if (parseFloat(getComputedStyle(element).fontSize) < 16) {
      element.style.fontSize = '16px';
    }
  });
};

// Add vendor prefixes for CSS properties
export const addVendorPrefixes = (property: string, value: string): Record<string, string> => {
  const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
  const result: Record<string, string> = {};
  
  prefixes.forEach(prefix => {
    result[`${prefix}${property}`] = value;
  });
  
  return result;
};

// Feature detection utilities
export const supportsFeature = {
  flexbox: () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    return div.style.display === 'flex';
  },
  
  grid: () => {
    const div = document.createElement('div');
    div.style.display = 'grid';
    return div.style.display === 'grid';
  },
  
  customProperties: () => {
    return window.CSS && CSS.supports && CSS.supports('color', 'var(--test)');
  },
  
  objectFit: () => {
    return 'objectFit' in document.documentElement.style;
  },
  
  intersectionObserver: () => {
    return 'IntersectionObserver' in window;
  }
};

// Safe localStorage with fallback
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }
};