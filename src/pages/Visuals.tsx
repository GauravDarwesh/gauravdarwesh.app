import React, { useEffect, useRef, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDE_INTERVAL = 2000; // time between slides

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex(0);

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, SLIDE_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [items]);

  const nextCollection = () => {
    clearInterval(timerRef.current);
    setCurrentCollection((prev) => (prev + 1) % collections.length);
  };

  const prevCollection = () => {
    clearInterval(timerRef.current);
    setCurrentCollection((prev) =>
      prev === 0 ? collections.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)",
        }}
      />

      <NavigationToggle />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl flex flex-col items-center">
          <div className="mb-4 self-start">
            <h2 className="text-sm font-medium text-white/70 drop-shadow-md">
              {title}
            </h2>
          </div>

          <div className="relative w-full flex items-center justify-center">
            {/* Left arrow */}
            <button
              onClick={prevCollection}
              className="absolute left-[-66px] top-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white shadow-md"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Tile */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[420px] sm:h-[520px] md:h-[600px] lg:h-[650px] p-4 flex items-center justify-center overflow-hidden relative">
              <div
                className="absolute inset-0 m-auto w-[96%] h-[96%] rounded-xl shadow-md bg-center bg-cover"
                style={{
                  backgroundImage: `url("${items[currentIndex]}")`,
                }}
              />
            </div>

            {/* Right arrow */}
            <button
              onClick={nextCollection}
              className="absolute right-[-66px] top-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white shadow-md"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
