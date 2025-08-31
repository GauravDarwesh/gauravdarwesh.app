import React from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { Carousel } from "@/components/ui/carousel"; // Lovable supports ShadCN components

const Visuals = () => {
  return (
    <div
      className="min-h-screen w-full text-foreground relative"
      style={{
        backgroundImage: "url('https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay for dim effect */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl w-full max-w-4xl h-[600px] flex items-center justify-center">
          {/* Rolling Media (Images/Videos) */}
          <Carousel className="w-full h-full rounded-2xl overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="https://picsum.photos/800/400?random=1"
                alt="Visual 1"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full h-full flex items-center justify-center">
              <video
                src="https://www.w3schools.com/html/mov_bbb.mp4"
                autoPlay
                loop
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="https://picsum.photos/800/400?random=2"
                alt="Visual 2"
                className="w-full h-full object-cover"
              />
            </div>
          </Carousel>
        </div>
      </div>
    </div>
  );
};

export default Visuals;
