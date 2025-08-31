import React, { useState, useEffect, useRef } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDE_INTERVAL = 2000; // change speed here (ms)
const FADE_MS = 120;         // ultra-fast fade (ms)

// Collections data
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

const Visuals = () => {
  const [currentCollection, setCurrentCollection] = useState(0);
  const { title, items } = collections[currentCollection];

  // active layer (true = A on top, false = B on top)
  const [activeA, setActiveA] = useState(true);
  const [srcA, setSrcA] = useState(items[0]);
  const [srcB, setSrcB] = useState(items[1] || items[0]);

  // track current index without causing re-renders
  const indexRef = useRef(0);
  const waitingRef = useRef(false);       // waiting to switch layers after load
  const pendingLayerRef = useRef(null);   // "A" | "B"
  const timerRef = useRef(null);

  // simple in-memory cache to know if an image is already loaded
  const cacheRef = useRef(new Map());

  const preload = (src) => {
    if (!src || cacheRef.current.get(src)) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => cacheRef.current.set(src, true);
    img.src = src;
  };

  // Initialize on collection change
  useEffect(() => {
    // reset indices & layers
    indexRef.current = 0;
    setActiveA(true);
    setSrcA(items[0]);
    setSrcB(items[1] || items[0]);

    // preload all images in this collection
    items.forEach(preload);

    // clear any previous timer
    if (timerRef.current) clearInterval(timerRef.current);

    // start slide timer
    timerRef.current = setInterval(() => {
      const nextIndex = (indexRef.current + 1) % items.length;
      const nextSrc = items[nextIndex];

      // decide which layer is inactive (to load next image into)
      const targetLayer = activeA ? "B" : "A";
      pendingLayerRef.current = targetLayer;
      waitingRef.current = true;

      // if already cached, the onLoad will fire immediately; otherwise it waits
      if (targetLayer === "B") setSrcB(nextSrc);
      else setSrcA(nextSrc);
    }, SLIDE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]); // re-init only when collection items change

  // When the *inactive* layer finishes loading, flip to it
  const handleLoadA = () => {
    if (waitingRef.current && pendingLayerRef.current === "A") {
      waitingRef.current = false;
      indexRef.current = (indexRef.current + 1) % items.length;
      // flip on the next frame for smoother paint
      requestAnimationFrame(() => setActiveA(true));
    }
  };

  const handleLoadB = () => {
    if (waitingRef.current && pendingLayerRef.current === "B") {
      waitingRef.current = false;
      indexRef.current = (indexRef.current + 1) % items.length;
      requestAnimationFrame(() => setActiveA(false));
    }
  };

  // Next/Prev collections (arrows affect collection only)
  const nextCollection = () => {
    setCurrentCollection((prev) => (prev + 1) % collections.length);
  };

  const prevCollection = () => {
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

      {/* Main Content (centered) */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl relative flex flex-col items-center">
          {/* Small translucent title above tile */}
          <div className="mb-4 self-start">
            <h2 className="text-lg font-medium text-white/70 drop-shadow-md">
              {title}
            </h2>
          </div>

          {/* Tile + Arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Arrow (collection prev) */}
            <button
              onClick={prevCollection}
              className="absolute left-[-70px] flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
            >
              <ChevronLeft size={28} />
            </button>

            {/* Glass Tile */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[650px] p-4 flex items-center justify-center overflow-hidden">
              {/* Layered images for zero-blink swap */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* IMG A */}
                <img
                  src={srcA}
                  alt="slide-a"
                  onLoad={handleLoadA}
                  decoding="async"
                  crossOrigin="anonymous"
                  className={`absolute inset-0 m-auto w-[96%] h-[96%] object-cover rounded-xl shadow-md transition-opacity ease-linear ${
                    activeA ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transitionDuration: `${FADE_MS}ms`, willChange: "opacity" }}
                />
                {/* IMG B */}
                <img
                  src={srcB}
                  alt="slide-b"
                  onLoad={handleLoadB}
                  decoding="async"
                  crossOrigin="anonymous"
                  className={`absolute inset-0 m-auto w-[96%] h-[96%] object-cover rounded-xl shadow-md transition-opacity ease-linear ${
                    activeA ? "opacity-0" : "opacity-100"
                  }`}
                  style={{ transitionDuration: `${FADE_MS}ms`, willChange: "opacity" }}
                />
              </div>
            </div>

            {/* Right Arrow (collection next) */}
            <button
              onClick={nextCollection}
              className="absolute right-[-70px] flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visuals;
