import React from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { Carousel } from "@/components/ui/carousel";

const Visuals = () => {
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

          {/* Glassmorphism Tile */}
          <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-xl w-full h-[600px] p-4 flex items-center justify-center">
            <Carousel className="w-full h-full rounded-xl overflow-hidden">
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://picsum.photos/1000/600?random=1"
                  alt="Visual 1"
                  className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                />
              </div>
              <div className="w-full h-full flex items-center justify-center p-2">
                <video
                  src="https://www.w3schools.com/html/mov_bbb.mp4"
                  autoPlay
                  loop
                  muted
                  className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                />
              </div>
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src="https://picsum.photos/1000/600?random=2"
                  alt="Visual 2"
                  className="w-[95%] h-[95%] object-cover rounded-xl shadow-md"
                />
              </div>
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visuals;
