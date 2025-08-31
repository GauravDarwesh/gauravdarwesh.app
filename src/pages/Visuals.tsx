import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDE_INTERVAL = 2000; // ms for switching speed
const FADE_MS = 120;         // ms for fast fade

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

  const [currentImage, setCurrentImage] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef(null);

  // Preload all images for smooth switching
  useEffect(() => {
    items.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [items]);

  // Automatic switching with fade effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % items.length);
        setFade(true);
      }, FADE_MS); // switch image after fade out
    }, SLIDE_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [items]);

  const nextCollection = () => {
    clearInterval(timerRef.current);
    setCurrentCollection((prev) => (prev + 1) % collections.length);
    setCurrentImage(0);
  };

  const prevCollection = () => {
    clearInterval(timerRef.current);
    setCurrentCollection((prev) =>
      prev === 0 ? collections.length - 1 : prev - 1
    );
    setCurrentImage(0);
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

      {/* Main Content (centered) */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl relative flex flex-col items-center">
          {/* Small translucent title */}
          <div className="mb-4 self-start">
            <h2 className="text-lg font-medium text-white/70">{title}</h2>
          </div>

          {/* Tile + Arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Arrow */}
            <button
              onClick={prevCollection}
              className="absolute left-[-70px] flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
            >
              <ChevronLeft size={28} />
            </button>

            {/* Tile */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[550px] p-4 flex items-center justify-center overflow-hidden">
              <img
                key={currentImage}
                src={items[currentImage]}
                alt="slide"
                className={`w-[96%] h-[96%] object-cover rounded-xl shadow-md transition-opacity duration-${FADE_MS} ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>

            {/* Right Arrow */}
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
