import React, { useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { Carousel } from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

const collections = [
  {
    title: "Japan 2024 Collection",
    items: [
      "https://picsum.photos/1000/600?random=1",
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://picsum.photos/1000/600?random=2",
    ],
  },
  {
    title: "Japan 2025 Collection",
    items: [
      "https://picsum.photos/1000/600?random=3",
      "https://picsum.photos/1000/600?random=4",
      "https://www.w3schools.com/html/movie.mp4",
    ],
  },
];

const Visuals = () => {
  const [currentCollection, setCurrentCollection] = useState(0);

  const nextCollection = () => {
    setCurrentCollection((prev) => (prev + 1) % collections.length);
  };

  const prevCollection = () => {
    setCurrentCollection((prev) =>
      prev === 0 ? collections.length - 1 : prev - 1
    );
  };

  const { title, items } = collections[currentCollection];

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
          {/* Collection Title above tile */}
          <div className="mb-4 self-start">
            <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
              {title}
            </h2>
          </div>

          {/* Tile + Arrows */}
          <div className="relative w-full flex items-center justify-center">
            {/* Left Button */}
            <button
              onClick={prevCollection}
              className="absolute left-[-70px] flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition shadow-md"
            >
              <ChevronLeft size={28} />
            </button>

            {/* Glass Tile */}
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[600px] p-4 flex items-center justify-center">
              <Carousel className="w-full h-full rounded-xl overflow-hidden">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="w-full h-full flex items-center justify-center p-2"
                  >
                    {item.endsWith(".mp4") ? (
                      <video
                        src={item}
                        autoPlay
                        loop
                        muted
                        className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                      />
                    ) : (
                      <img
                        src={item}
                        alt={`Visual ${idx}`}
                        className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                      />
                    )}
                  </div>
                ))}
              </Carousel>
            </div>

            {/* Right Button */}
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
