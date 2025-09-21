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
    const finish = () => {
      if (done) return;
      done = true;
      cacheRef.current.add(src);
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
    setTimeout(finish, timeout);
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inactiveNode.style.opacity = "1";
        activeNode.style.opacity = "0";
        // after fade completes, flip active layer and update indexRef
        setTimeout(() => {
          activeLayerRef.current = inactive;
          indexRef.current = nextIndex;
        }, FADE_MS + 8);
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

      {/* Center area - fully responsive layout */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Top spacer to clear NavigationToggle */}
        <div className="h-20 sm:h-24 flex-shrink-0"></div>
        
        {/* Main content container - dynamic sizing */}
        <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
          {/* Fully dynamic cascade container */}
          <div className="w-full h-full max-w-[96vw] max-h-[calc(100vh-8rem)] sm:max-w-[92vw] sm:max-h-[calc(100vh-9rem)] md:max-w-[88vw] lg:max-w-[85vw] xl:max-w-[80vw]">
            {/* Responsive cascade with dynamic height and width */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl sm:rounded-3xl shadow-2xl w-full h-full min-h-[40vh] max-h-[70vh] sm:max-h-[75vh] md:max-h-[78vh] lg:max-h-[80vh] p-2 sm:p-3 md:p-4 lg:p-6 flex flex-col items-center justify-center overflow-hidden relative">
              {/* Image container */}
              <div className="flex-1 relative w-full">
                {/* Layer A */}
                <div
                  ref={layerARef}
                  className="absolute inset-0 rounded-xl sm:rounded-2xl shadow-lg bg-center bg-cover"
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
                  className="absolute inset-0 rounded-xl sm:rounded-2xl shadow-lg bg-center bg-cover"
                  style={{
                    opacity: 0,
                    transition: `opacity ${FADE_MS}ms linear`,
                    willChange: "opacity",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Collection title inside carousel */}
              <div className="mt-3 sm:mt-4 flex justify-center">
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-white/90 drop-shadow-md text-center px-4 transition-opacity duration-300">
                  {collectionTitle}
                </h2>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="flex justify-center mt-2 sm:mt-3 md:mt-4 gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={prevCollection}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              aria-label="Previous collection"
            >
              <ChevronLeft size={16} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={nextCollection}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-md text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
              aria-label="Next collection"
            >
              <ChevronRight size={16} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
