import { useEffect, useState } from "react";

export interface BrowserInfo {
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isOpera: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsWebP: boolean;
  supportsAvif: boolean;
  supports100vh: boolean;
  supportsTouchEvents: boolean;
}

export function useBrowserCompatibility(): BrowserInfo {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false,
    isOpera: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    supportsWebP: false,
    supportsAvif: false,
    supports100vh: false,
    supportsTouchEvents: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor;

    // Browser detection
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(vendor);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(vendor) && !/Chrome/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isOpera = /OPR|Opera/.test(userAgent);

    // Mobile detection
    const isMobile = /Mobi|Android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    // Feature detection
    const supportsWebP = (() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      } catch {
        return false;
      }
    })();

    const supportsAvif = (() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      } catch {
        return false;
      }
    })();

    // Check for proper 100vh support (iOS Safari issue)
    const supports100vh = (() => {
      if (isIOS && isSafari) {
        // iOS Safari has issues with 100vh
        return false;
      }
      return true;
    })();

    // Touch events support
    const supportsTouchEvents = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setBrowserInfo({
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isOpera,
      isMobile,
      isIOS,
      isAndroid,
      supportsWebP,
      supportsAvif,
      supports100vh,
      supportsTouchEvents,
    });

    // Add browser-specific classes to body
    const body = document.body;
    body.classList.remove('chrome', 'firefox', 'safari', 'edge', 'opera', 'mobile', 'ios', 'android');
    
    if (isChrome) body.classList.add('chrome');
    if (isFirefox) body.classList.add('firefox');
    if (isSafari) body.classList.add('safari');
    if (isEdge) body.classList.add('edge');
    if (isOpera) body.classList.add('opera');
    if (isMobile) body.classList.add('mobile');
    if (isIOS) body.classList.add('ios');
    if (isAndroid) body.classList.add('android');

    // Fix iOS Safari viewport height issue
    if (isIOS) {
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);
      
      return () => {
        window.removeEventListener('resize', setViewportHeight);
        window.removeEventListener('orientationchange', setViewportHeight);
      };
    }
  }, []);

  return browserInfo;
}

// Utility function to get optimal image format
export function getOptimalImageFormat(browserInfo: BrowserInfo): 'avif' | 'webp' | 'jpg' | 'png' {
  if (browserInfo.supportsAvif) return 'avif';
  if (browserInfo.supportsWebP) return 'webp';
  return 'jpg';
}

// Utility function to get safe viewport height class
export function getSafeViewportClass(browserInfo: BrowserInfo): string {
  if (browserInfo.isIOS) {
    return 'h-[calc(var(--vh,1vh)*100)]';
  }
  return 'h-screen min-h-[100dvh]';
}