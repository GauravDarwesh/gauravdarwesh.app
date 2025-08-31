import React, { useState, useEffect } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PhotoCollections = () => {
  const collections = [
    {
      title: "Japan 2024",
      images: [
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
      title: "Switzerland 2016",
      images: [
        "https://via.placeholder.com/800x600?text=Switzerland+1",
        "https://via.placeholder.com/800x600?text=Switzerland+2",
      ],
    },
  ];

  const [currentCollection, setCurrentCollection] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const speed = 2000; // <-- Change this to control speed in ms

  // Preload images for smooth transitions
  useEffect(() => {
    const imgs = collections[currentCollection].images;
    const cache = {};
    imgs.forEach((src) => {
      const img = new Image();
      img.src = src;
      cache[src] = true;
    });
    setLoadedImages(cache);
  }, [currentCollection]);

  // Auto-slide images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % collections[currentCollection].images.length);
    }, speed);
    return () => clearInterval(timer);
  }, [currentCollection]);

  const handlePrevCollection = () => {
    setCurrentCollection((prev) => (prev - 1 + collections.length) % collections.length);
    setCurrentImage(0);
  };

  const handleNextCollection = () => {
    setCurrentCollection((prev) => (prev + 1) % collections.length);
    setCurrentImage(0);
  };

  const images = collections[currentCollection].images;
  const currentSrc = images[currentImage];
  const title = collections[currentCollection].title;

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Title outside tile */}
        <div className="mb-4 text-left w-full max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{title}</h2>
        </div>

        {/* Tile with Image */}
        <div className="relative w-full max-w-3xl">
          {/* Left Arrow */}
          <button
            onClick={handlePrevCollection}
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition"
          >
            <ChevronLeft className="text-white w-6 h-6" />
          </button>

          {/* Main Tile */}
          <div className="w-full aspect-[4/3] bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 flex items-center justify-center relative overflow-hidden">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Slide ${idx}`}
                className={`absolute w-[90%] h-[90%] object-contain transition-opacity duration-700 ${
                  idx === currentImage ? "opacity-100" : "opacity-0"
                }`}
                style={{ pointerEvents: "none" }}
              />
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNextCollection}
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition"
          >
            <ChevronRight className="text-white w-6 h-6" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-white/90 text-center">
          Photo collections and cinematography
        </p>
      </div>
    </div>
  );
};

export default PhotoCollections;
