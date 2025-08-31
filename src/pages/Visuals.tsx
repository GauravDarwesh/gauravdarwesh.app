import { useEffect, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const collections = {
  "Japan 2024": [
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1497.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1554.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1833.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1899.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2068.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2138.jpg",
    "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2301.jpg",
  ],
  // add more collections here if needed
};

export default function Visuals() {
  const [currentCollection, setCurrentCollection] = useState("Japan 2024");
  const [currentImage, setCurrentImage] = useState(0);
  const items = collections[currentCollection];

  // Preload images
  useEffect(() => {
    items.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [items]);

  // Auto-slide images smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % items.length);
    }, 3000); // <-- change speed here
    return () => clearInterval(timer);
  }, [items]);

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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        {/* Title outside the tile */}
        <div className="text-white text-3xl font-bold mb-4">
          {currentCollection}
        </div>

        {/* Big Glassmorphism Tile */}
        <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-[80%] md:w-[60%] h-[60vh] flex items-center justify-center overflow-hidden">
          {items.map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              className={`absolute max-h-[90%] max-w-[90%] rounded-xl object-contain transition-opacity duration-700 ${
                index === currentImage ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {/* Arrows for Collection Navigation */}
        <button
          className="absolute left-[10%] bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md top-1/2 -translate-y-1/2"
          onClick={() => console.log("Prev Collection")}
        >
          ⬅
        </button>
        <button
          className="absolute right-[10%] bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md top-1/2 -translate-y-1/2"
          onClick={() => console.log("Next Collection")}
        >
          ➡
        </button>
      </div>
    </div>
  );
}
