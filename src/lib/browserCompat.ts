// Browser compatibility utilities
export const isBrowserSupported = () => {
  return !!(
    window &&
    document &&
    document.querySelector &&
    window.addEventListener &&
    Array.prototype.forEach &&
    Object.keys
  );
};

// Safe localStorage wrapper
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    return null;
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    return false;
  },
  
  removeItem: (key: string): boolean => {
    try {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.removeItem(key);
        return true;
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    return false;
  }
};

// Safe performance API wrapper
export const safePerformance = {
  now: (): number => {
    if (window.performance && window.performance.now) {
      return window.performance.now();
    }
    return Date.now();
  },
  
  isPageRefresh: (): boolean => {
    try {
      // Modern browsers
      if (window.performance?.navigation?.type === 1) {
        return true;
      }
      // Navigation API
      if (window.performance?.getEntriesByType) {
        const navEntry = window.performance.getEntriesByType('navigation')?.[0] as any;
        return navEntry?.type === 'reload';
      }
    } catch (e) {
      console.warn('Performance API not available:', e);
    }
    return false;
  }
};

// Touch device detection
export const isTouchDevice = (): boolean => {
  return !!(
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

// Safe intersection observer
export const createSafeIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null => {
  try {
    if ('IntersectionObserver' in window) {
      return new IntersectionObserver(callback, options);
    }
  } catch (e) {
    console.warn('IntersectionObserver not available:', e);
  }
  return null;
};

// Safe requestAnimationFrame
export const safeRequestAnimationFrame = (callback: FrameRequestCallback): number => {
  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  // Fallback for older browsers
  return window.setTimeout(callback, 16) as any;
};

// Safe cancelAnimationFrame
export const safeCancelAnimationFrame = (id: number): void => {
  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id);
  } else {
    window.clearTimeout(id);
  }
};

// CSS feature detection
export const cssSupports = (property: string, value: string): boolean => {
  if (typeof CSS !== 'undefined' && CSS.supports) {
    return CSS.supports(property, value);
  }
  
  // Fallback detection
  const testElement = document.createElement('div');
  testElement.style.cssText = `${property}: ${value}`;
  return testElement.style.getPropertyValue(property) !== '';
};