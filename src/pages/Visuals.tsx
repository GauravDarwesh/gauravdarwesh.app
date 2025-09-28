import React, { useEffect, useRef, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* Change this to adjust speed */
const SLIDE_INTERVAL = 2000; // 2000 ms = 2 seconds

// Collections (kept from your input)
const collections = [
  {
    title: "Japan 2024 Collection",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1497.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1554.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1833.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1899.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2068.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2138.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2301.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2622.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2779.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_2267.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_2370.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4885.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4892.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4894.jpg",
    ],
  },
  {
    title: "Switzerland 2016 Collection",
    items: [
      "https://picsum.photos/1000/600?random=10",
      "https://picsum.photos/1000/600?random=11",
      "https://picsum.photos/1000/600?random=12",
    ],
  },
];

export default function Visuals() {
  const [currentCollection, setCurrentCollection] = useState(0);
  const items = collections[currentCollection].items;
  const title = collections[currentCollection].title;

  // layer refs
  const layerARef = useRef(null);
  const layerBRef = useRef(null);

  // refs to hold state without re-rendering
  const indexRef = useRef(0); // which index is currently shown
  const activeLayerRef = useRef("A"); // "A" or "B"
  const timerRef = useRef(null);
  const cacheRef = useRef(new Set());

  // small piece of state used only for title update render
  const [collectionTitle, setCollectionTitle] = useState(title);

  // dynamic fade: 20% of interval but clamped
  const FADE_MS = Math.max(80, Math.min(500, Math.round(SLIDE_INTERVAL * 0.2)));

  // Preload helper (returns promise that resolves when loaded or on timeout)
  const preload = (src: string, timeout = 3000): Promise<void> =>
  new Promise<void>((resolve) => {
    if (!src) return resolve();
    if (cacheRef.current.has(src)) return resolve();
    
    const img = new Image();
    let done = false;
    let timeoutId: number | null = null;
    
    const finish = () => {
      if (done) return;
      done = true;
      cacheRef.current.add(src);
      if (timeoutId && window.clearTimeout) {
        window.clearTimeout(timeoutId);
      }
      resolve();
    };
    
    img.onload = finish;
    img.onerror = finish;
    
    // Add crossorigin for better CORS support
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      img.crossOrigin = 'anonymous';
    }
    
    img.src = src;
    
    // Use setTimeout with fallback for older browsers
    if (window.setTimeout) {
      timeoutId = window.setTimeout(finish, timeout) as any;
    }
  });


  // Preload all images in background (non-blocking)
  const preloadAll = (list) => {
    list.forEach((s) => preload(s, 5000));
  };

  // Initialize tile when collection changes
  useEffect(() => {
    // reset index + active layer
    indexRef.current = 0;
    activeLayerRef.current = "A";
    setCollectionTitle(title);

    // set both layers' styles and immediate backgrounds (first & second if present)
    const first = items[0] || "";
    const second = items.length > 1 ? items[1] : first;

    if (layerARef.current) {
      layerARef.current.style.backgroundImage = `url("${first}")`;
      layerARef.current.style.opacity = "1";
      layerARef.current.style.transition = `opacity ${FADE_MS}ms linear`;
      layerARef.current.style.willChange = "opacity";
      layerARef.current.style.backgroundSize = "cover";
      layerARef.current.style.backgroundPosition = "center";
    }
    if (layerBRef.current) {
      layerBRef.current.style.backgroundImage = `url("${second}")`;
      layerBRef.current.style.opacity = "0";
      layerBRef.current.style.transition = `opacity ${FADE_MS}ms linear`;
      layerBRef.current.style.willChange = "opacity";
      layerBRef.current.style.backgroundSize = "cover";
      layerBRef.current.style.backgroundPosition = "center";
    }

    // preload first two (so swap is immediate) then start the timer;
    // also continue preloading the rest in the background
    Promise.all<void>([preload(first, 3000), preload(second, 3000)]).finally(() => {
      // ensure any previous timer cleared
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // start interval
      timerRef.current = setInterval(() => {
        slideToNext();
      }, SLIDE_INTERVAL);

      // keep preloading everything in background (non-blocking)
      preloadAll(items);
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCollection]); // re-run when collection changes

  // slide function: sets the inactive layer's background then crossfades
  const slideToNext = async () => {
    if (!items || items.length === 0) return;
    const nextIndex = (indexRef.current + 1) % items.length;
    const nextSrc = items[nextIndex];

    const active = activeLayerRef.current;
    const inactive = active === "A" ? "B" : "A";
    const activeNode = active === "A" ? layerARef.current : layerBRef.current;
    const inactiveNode = inactive === "A" ? layerARef.current : layerBRef.current;

    if (!inactiveNode || !activeNode) return;

    // ensure next image is preloaded (but fallback after short wait so we never stall)
    const preloadPromise = preload(nextSrc, 2000);
    await Promise.race<void>([preload(nextSrc, 2000), new Promise<void>((res) => setTimeout(res, 350))]);


    // set background on inactive
    inactiveNode.style.backgroundImage = `url("${nextSrc}")`;

    // double rAF to ensure paint, then swap opacities
    const safeRequestAnimationFrame = (callback: () => void) => {
      if (window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
      }
      return window.setTimeout(callback, 16) as any;
    };

    safeRequestAnimationFrame(() => {
      safeRequestAnimationFrame(() => {
        inactiveNode.style.opacity = "1";
        activeNode.style.opacity = "0";
        // after fade completes, flip active layer and update indexRef
        const timeoutId = window.setTimeout ? window.setTimeout(() => {
          activeLayerRef.current = inactive;
          indexRef.current = nextIndex;
        }, FADE_MS + 8) : null;
      });
    });
  };

  // arrow handlers — change collections only (reset timer handled in useEffect)
  const nextCollection = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentCollection((c) => (c + 1) % collections.length);
  };

  const prevCollection = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentCollection((c) => (c === 0 ? collections.length - 1 : c - 1));
  };

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)",
        }}
      />

      {/* Navigation */}
      <NavigationToggle />

      {/* Center area - no scroll layout */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Reduced top spacer to move content up */}
        <div className="h-16 sm:h-18 flex-shrink-0"></div>
        
        {/* Main content container - fixed height, no scroll */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
          {/* Container for tile with text and navigation */}
          <div className="w-full max-w-[90vw] sm:max-w-[85vw] md:max-w-[80vw] lg:max-w-[75vw] xl:max-w-[65vw] flex flex-col h-full max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-10rem)]">
            
            {/* Top row: Title (left) and Navigation Buttons (right) */}
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              {/* Collection title - styled like filter button, with hover effect */}
              <div className="h-9 px-4 text-[12px] rounded-full bg-white/20 hover:bg-white/30 text-white/80 hover:text-white/90 border border-white/20 hover:border-white/30 backdrop-blur-sm transition-all duration-300 ease-out flex items-center cursor-default">
                {collectionTitle}
              </div>
              
              {/* Left and right buttons - top right, smaller size */}
              <div className="flex gap-2">
                <button
                  onClick={prevCollection}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    (e.target as HTMLButtonElement).click();
                  }}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 flex-shrink-0 touch-manipulation"
                  aria-label="Previous collection"
                >
                  <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                </button>
                
                <button
                  onClick={nextCollection}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    (e.target as HTMLButtonElement).click();
                  }}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 flex-shrink-0 touch-manipulation"
                  aria-label="Next collection"
                >
                  <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Tile container - takes remaining space with aspect ratio constraint */}
            <div className="flex-1 min-h-0 max-h-[60vh] sm:max-h-none">
              {/* Glassmorphic tile */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 hover:bg-white/20 transition w-full h-full flex items-center justify-center overflow-hidden relative">
                {/* Image container */}
                <div className="relative w-full h-full">
                  {/* Layer A */}
                  <div
                    ref={layerARef}
                    className="absolute inset-0 rounded-xl shadow-lg bg-center bg-cover"
                    style={{
                      opacity: 1,
                      transition: `opacity ${FADE_MS}ms linear`,
                      willChange: "opacity",
                    }}
                    aria-hidden="true"
                  />

                  {/* Layer B */}
                  <div
                    ref={layerBRef}
                    className="absolute inset-0 rounded-xl shadow-lg bg-center bg-cover"
                    style={{
                      opacity: 0,
                      transition: `opacity ${FADE_MS}ms linear`,
                      willChange: "opacity",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
