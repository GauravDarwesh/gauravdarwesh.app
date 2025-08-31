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
  const preload = (src, timeout = 3000) =>
    new Promise((resolve) => {
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
    Promise.all([preload(first, 3000), preload(second, 3000)]).finally(() => {
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
    await Promise.race([preloadPromise, new Promise((res) => setTimeout(res, 350))]);

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
    <div className="min-h-screen w-full relative overflow-hidden">
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

      {/* Center area */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl relative flex flex-col items-center">
          {/* small translucent title above tile (left aligned to tile) */}
          <div className="mb-4 self-start">
            <h2 className="text-sm font-medium text-white drop-shadow-md">
              {collectionTitle}
            </h2>
          </div>

          {/* Tile + Arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Arrow (collection prev) */}
            <button
              onClick={prevCollection}
              className="absolute left-[-66px] top-1/2 transform -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
              aria-label="Previous collection"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Glass tile — responsive height */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[420px] sm:h-[520px] md:h-[600px] lg:h-[650px] p-4 flex items-center justify-center overflow-hidden relative">
              {/* Layer A */}
              <div
                ref={layerARef}
                className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-xl shadow-md bg-center bg-cover"
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
                className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-xl shadow-md bg-center bg-cover"
                style={{
                  opacity: 0,
                  transition: `opacity ${FADE_MS}ms linear`,
                  willChange: "opacity",
                }}
                aria-hidden="true"
              />
            </div>

            {/* Right Arrow (collection next) */}
            <button
              onClick={nextCollection}
              className="absolute right-[-66px] top-1/2 transform -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
              aria-label="Next collection"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
