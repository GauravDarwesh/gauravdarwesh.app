import React, { useState, useEffect } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images2024 = [
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1497.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1554.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1833.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1899.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2068.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2138.jpg",
  "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2301.jpg",
];

const Visuals = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images2024.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images2024.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? images2024.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation */}
      <NavigationToggle />

      {/* Main Content - Fully Centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl relative flex flex-col items-center">
          {/* Collection Title */}
          <div className="mb-4 self-start">
            <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
              Japan 2024 Collection
            </h2>
          </div>

          {/* Tile + Arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Button */}
            <button
              onClick={prevImage}
              className="absolute left-[-70px] flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
            >
              <ChevronLeft size={28} />
            </button>

            {/* Glass Tile with Auto-playing Image */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[600px] p-4 flex items-center justify-center">
              <img
                src={images2024[currentIndex]}
                alt={`Japan 2024 ${currentIndex}`}
                className="w-[95%] h-[95%] object-cover rounded-xl shadow-md transition-all duration-500"
              />
            </div>

            {/* Right Button */}
            <button
              onClick={nextImage}
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
