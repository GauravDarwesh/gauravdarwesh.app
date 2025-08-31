import React, { useRef } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const Visuals = () => {
  const carouselRef = useRef(null);
  const slides = [
    { type: "image", src: "https://picsum.photos/1000/600?random=1" },
    { type: "video", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { type: "image", src: "https://picsum.photos/1000/600?random=2" },
  ];

  const handlePrev = () => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      carouselRef.current.scrollTo({
        left: scrollLeft - clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleNext = () => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
      carouselRef.current.scrollTo({
        left: Math.min(scrollLeft + clientWidth, scrollWidth),
        behavior: "smooth",
      });
    }
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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          {/* Collection Title above tile */}
          <div className="mb-3 ml-1">
            <h2 className="text-2xl font-semibold text-white drop-shadow-lg">
              Japan 2024 Collection
            </h2>
          </div>

          {/* Glass Tile with Arrows */}
          <div className="relative backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[600px] p-4 flex items-center justify-center">
            {/* Left Button */}
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition"
            >
              &#10094;
            </button>

            {/* Carousel */}
            <div
              ref={carouselRef}
              className="w-full h-full flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="w-full h-full flex-shrink-0 flex items-center justify-center snap-center"
                >
                  {slide.type === "image" ? (
                    <img
                      src={slide.src}
                      alt={`Slide ${index}`}
                      className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                    />
                  ) : (
                    <video
                      src={slide.src}
                      autoPlay
                      loop
                      muted
                      className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Right Button */}
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition"
            >
              &#10095;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visuals;
