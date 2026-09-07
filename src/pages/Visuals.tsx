import React, { useEffect, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";
import wallpaperAsset from "@/assets/orange-charcoal-wallpaper.jpg.asset.json";

/* Change this to adjust speed for images */
const SLIDE_INTERVAL = 2000; // 2000 ms = 2 seconds

const VIDEO_EXTENSIONS = [".mov", ".mp4", ".webm", ".ogg"];

const isVideo = (url: string) =>
  VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));

// Collections
const collections = [
  {
    title: "Japan 2025 Collection",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/A6AE9E26-5645-4F8A-BC54-E8A5B6311D7C.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/D3FD6C99-BF7F-4001-9E8A-3F1F3B25666D.JPG",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6477.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6513.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6529.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6530.jpg",
    ],
  },
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
    title: "Europe 2016 Collection",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160614_135031.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160616_115817.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160616_124214.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160617_171820.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160617_172510.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_143958.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_145139.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_152220.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160619_121351.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160623_102110.jpg",
    ],
  },
];

export default function Visuals() {
  const [currentCollection, setCurrentCollection] = useState(0);
  const items = collections[currentCollection].items;
  const title = collections[currentCollection].title;

  // Current visible index (state-driven for video/image rendering)
  const [currentIndex, setCurrentIndex] = useState(0);

  // layer refs (for image crossfade)
  const layerARef = useRef<HTMLDivElement | null>(null);
  const layerBRef = useRef<HTMLDivElement | null>(null);

  // refs to hold state without re-rendering
  const activeLayerRef = useRef<"A" | "B">("A");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cacheRef = useRef(new Set<string>());
  const indexRef = useRef(0);
  const isVideoPlayingRef = useRef(false);

  // video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // small piece of state used only for title update render
  const [collectionTitle, setCollectionTitle] = useState(title);

  // dynamic fade: 20% of interval but clamped
  const FADE_MS = Math.max(80, Math.min(500, Math.round(SLIDE_INTERVAL * 0.2)));

  // Preload helper
  const preload = useCallback(
    (src: string, timeout = 3000): Promise<void> =>
      new Promise<void>((resolve) => {
        if (!src || isVideo(src)) return resolve();
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
      }),
    []
  );

  // Preload all images in background
  const preloadAll = useCallback(
    (list: string[]) => {
      list.forEach((s) => {
        if (!isVideo(s)) preload(s, 5000);
      });
    },
    [preload]
  );

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start the image slideshow interval
  const startImageInterval = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      slideToNext();
    }, SLIDE_INTERVAL);
  }, [clearTimer]);

  // Advance to the next item
  const slideToNext = useCallback(() => {
    if (!items || items.length === 0) return;
    const nextIndex = (indexRef.current + 1) % items.length;
    const nextSrc = items[nextIndex];

    if (isVideo(nextSrc)) {
      // Pause interval, show video via state
      clearTimer();
      isVideoPlayingRef.current = true;
      indexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      return;
    }

    // Image transition using layers
    const active = activeLayerRef.current;
    const inactive = active === "A" ? "B" : "A";
    const activeNode = active === "A" ? layerARef.current : layerBRef.current;
    const inactiveNode =
      inactive === "A" ? layerARef.current : layerBRef.current;

    if (!inactiveNode || !activeNode) return;

    // Set background on inactive layer
    inactiveNode.style.backgroundImage = `url("${nextSrc}")`;

    // Crossfade
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inactiveNode.style.opacity = "1";
        activeNode.style.opacity = "0";
        setTimeout(() => {
          activeLayerRef.current = inactive;
          indexRef.current = nextIndex;
          setCurrentIndex(nextIndex);
        }, FADE_MS + 8);
      });
    });
  }, [items, clearTimer, FADE_MS]);

  // Handle video ended — advance to next
  const handleVideoEnded = useCallback(() => {
    isVideoPlayingRef.current = false;
    const nextIndex = (indexRef.current + 1) % items.length;
    const nextSrc = items[nextIndex];

    if (isVideo(nextSrc)) {
      // Next is also a video
      indexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      return;
    }

    // Next is an image — set it on the active layer and start interval
    indexRef.current = nextIndex;
    activeLayerRef.current = "A";
    setCurrentIndex(nextIndex);

    if (layerARef.current) {
      layerARef.current.style.backgroundImage = `url("${nextSrc}")`;
      layerARef.current.style.opacity = "1";
    }
    if (layerBRef.current) {
      layerBRef.current.style.opacity = "0";
      const afterNext = items[(nextIndex + 1) % items.length];
      if (!isVideo(afterNext)) {
        layerBRef.current.style.backgroundImage = `url("${afterNext}")`;
      }
    }

    startImageInterval();
  }, [items, startImageInterval]);

  // Initialize when collection changes
  useEffect(() => {
    indexRef.current = 0;
    activeLayerRef.current = "A";
    isVideoPlayingRef.current = false;
    setCollectionTitle(title);
    setCurrentIndex(0);

    const first = items[0] || "";

    if (isVideo(first)) {
      // First item is a video — show it via state, no interval
      clearTimer();
      isVideoPlayingRef.current = true;
      // Hide image layers
      if (layerARef.current) layerARef.current.style.opacity = "0";
      if (layerBRef.current) layerBRef.current.style.opacity = "0";
      return () => clearTimer();
    }

    // First item is an image
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
      layerBRef.current.style.backgroundImage = isVideo(second)
        ? ""
        : `url("${second}")`;
      layerBRef.current.style.opacity = "0";
      layerBRef.current.style.transition = `opacity ${FADE_MS}ms linear`;
      layerBRef.current.style.willChange = "opacity";
      layerBRef.current.style.backgroundSize = "cover";
      layerBRef.current.style.backgroundPosition = "center";
    }

    Promise.all<void>([
      preload(first, 3000),
      isVideo(second) ? Promise.resolve() : preload(second, 3000),
    ]).finally(() => {
      clearTimer();
      timerRef.current = setInterval(() => {
        slideToNext();
      }, SLIDE_INTERVAL);
      preloadAll(items);
    });

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCollection]);

  // Collection navigation
  const nextCollection = () => {
    clearTimer();
    setCurrentCollection((c) => (c + 1) % collections.length);
  };

  const prevCollection = () => {
    clearTimer();
    setCurrentCollection((c) =>
      c === 0 ? collections.length - 1 : c - 1
    );
  };

  const currentSrc = items[currentIndex] || "";
  const showVideo = isVideo(currentSrc);

  return (
    <div className="site-page h-screen w-full relative overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <Helmet>
        <title>Visuals — Photography by Gaurav Darwesh</title>
        <meta name="description" content="Photo and video collections from Gaurav Darwesh's travels, including Japan 2025 and Europe 2016." />
        <link rel="canonical" href="https://gauravdarwesh.app/visuals" />
        <meta property="og:title" content="Visuals — Photography by Gaurav Darwesh" />
        <meta property="og:description" content="Photo and video collections from Gaurav Darwesh's travels." />
        <meta property="og:url" content="https://gauravdarwesh.app/visuals" />
      </Helmet>

      <h1 className="sr-only">Visuals — photography collections by Gaurav Darwesh</h1>

      {/* Background */}
      <div
        className="site-background fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none select-none"
        style={{
          backgroundImage: `url(${wallpaperAsset.url})`,
          WebkitTouchCallout: "none",
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
              <div className="h-9 px-4 text-[12px] rounded-full bg-white/20 hover:bg-white/30 text-white/80 hover:text-white/90 border border-white/20 hover:border-white/30 backdrop-blur-sm transition-all duration-300 ease-out flex items-center cursor-default">
                {collectionTitle}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={prevCollection}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 flex-shrink-0"
                  aria-label="Previous collection"
                >
                  <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={nextCollection}
                  className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 flex-shrink-0"
                  aria-label="Next collection"
                >
                  <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Tile container */}
            <div className="flex-1 min-h-0 max-h-[60vh] sm:max-h-none">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 hover:bg-white/20 transition w-full h-full flex items-center justify-center overflow-hidden relative">
                <div className="relative w-full h-full">
                  {/* Layer A (images) */}
                  <div
                    ref={layerARef}
                    className="absolute inset-0 rounded-xl shadow-lg bg-center bg-cover pointer-events-none select-none"
                    style={{
                      opacity: showVideo ? 0 : 1,
                      transition: `opacity ${FADE_MS}ms linear`,
                      willChange: "opacity",
                      WebkitTouchCallout: "none",
                    }}
                    aria-hidden="true"
                  />

                  {/* Layer B (images) */}
                  <div
                    ref={layerBRef}
                    className="absolute inset-0 rounded-xl shadow-lg bg-center bg-cover pointer-events-none select-none"
                    style={{
                      opacity: 0,
                      transition: `opacity ${FADE_MS}ms linear`,
                      willChange: "opacity",
                      WebkitTouchCallout: "none",
                    }}
                    aria-hidden="true"
                  />

                  {/* Video layer */}
                  {showVideo && (
                    <video
                      aria-label="Photo collection video clip"
                      ref={videoRef}
                      key={currentSrc}
                      className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-lg"
                      src={currentSrc}
                      autoPlay
                      muted
                      playsInline
                      onEnded={handleVideoEnded}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
