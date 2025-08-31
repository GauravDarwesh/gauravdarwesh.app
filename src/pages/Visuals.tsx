import React, { useEffect, useRef, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

/*
  Tweak these:
  - SLIDE_INTERVAL: ms between slides
  - FADE_MS: crossfade duration in ms
*/
const SLIDE_INTERVAL = 2000;
const FADE_MS = 150;

// Collections
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

  // refs for layer DOM nodes
  const layerARef = useRef(null);
  const layerBRef = useRef(null);

  // refs to manage state without forcing re-render
  const indexRef = useRef(0); // current index being displayed
  const activeLayerRef = useRef("A"); // "A" or "B"
  const timerRef = useRef(null);

  // small state only for UI text updates (collection title)
  const [collectionTitle, setCollectionTitle] = useState(title);

  // simple cache (not required but helpful)
  const cacheRef = useRef(new Set());

  // Preload images with per-image timeout (resolves even if error)
  const preloadAll = async (list) => {
    const promises = list.map(
      (src) =>
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
          // fallback in case load hangs
          setTimeout(finish, 3000);
        })
    );
    await Promise.all(promises);
  };

  // initialize layers and start timer (called whenever collection changes)
  useEffect(() => {
    let cancelled = false;

    // reset refs
    indexRef.current = 0;
    activeLayerRef.current = "A";
    setCollectionTitle(collections[currentCollection].title);

    // set immediate backgrounds so UI isn't blank
    const first = items[0] || "";
    const second = items.length > 1 ? items[1] : first;

    // ensure DOM exists
    if (layerARef.current) {
      layerARef.current.style.backgroundImage = `url("${first}")`;
      layerARef.current.style.opacity = "1";
      // ensure transition duration set
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

    // preload all images for this collection (so crossfade is smooth)
    preloadAll(items).then(() => {
      if (cancelled) return;
      // start timer after preload (ensures smooth transitions)
      startTimer();
    });

    function startTimer() {
      // clear old if any
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        performSlide();
      }, SLIDE_INTERVAL);
    }

    function performSlide() {
      const nextIndex = (indexRef.current + 1) % items.length;
      const active = activeLayerRef.current;
      const inactive = active === "A" ? "B" : "A";
      const activeNode = active === "A" ? layerARef.current : layerBRef.current;
      const inactiveNode = inactive === "A" ? layerARef.current : layerBRef.current;

      if (!inactiveNode || !activeNode) return;

      // set next background on inactive layer (already preloaded ideally)
      inactiveNode.style.backgroundImage = `url("${items[nextIndex]}")`;

      // Force a paint/frame then toggle opacity for a smooth crossfade
      // Use requestAnimationFrame twice to ensure the browser applies the new background before opacity change
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inactiveNode.style.opacity = "1";
          activeNode.style.opacity = "0";

          // after fade duration, flip active layer and update indexRef
          setTimeout(() => {
            activeLayerRef.current = inactive;
            indexRef.current = nextIndex;
          }, FADE_MS + 8); // small buffer
        });
      });
    }

    // cleanup on unmount or collection change
    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCollection, items.join("|")]); // re-init when collection changes

  // collection navigation (arrows) — only changes collection, not inner slide
  const nextCollection = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentCollection((prev) => (prev + 1) % collections.length);
  };
  const prevCollection = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCurrentCollection((prev) =>
      prev === 0 ? collections.length - 1 : prev - 1
    );
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

      {/* Main — centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl relative flex flex-col items-center">
          {/* Collection title small + translucent, left aligned to tile */}
          <div className="mb-4 self-start">
            <h2 className="text-sm font-medium text-white/70 drop-shadow-md">
              {collectionTitle}
            </h2>
          </div>

          {/* Tile container + arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left arrow — vertically centered */}
            <button
              onClick={prevCollection}
              className="absolute left-[-66px] top-1/2 transform -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
              aria-label="Previous collection"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Glass tile — responsive height; overflow hidden ensures rounded corners apply */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[420px] sm:h-[520px] md:h-[600px] lg:h-[650px] p-4 flex items-center justify-center overflow-hidden relative">
              {/* Layer A */}
              <div
                ref={layerARef}
                className="absolute inset-0 m-auto w-[96%] h-[96%] rounded-xl shadow-md bg-center bg-cover"
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
                className="absolute inset-0 m-auto w-[96%] h-[96%] rounded-xl shadow-md bg-center bg-cover"
                style={{
                  opacity: 0,
                  transition: `opacity ${FADE_MS}ms linear`,
                  willChange: "opacity",
                }}
                aria-hidden="true"
              />
            </div>

            {/* Right arrow — vertically centered */}
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
