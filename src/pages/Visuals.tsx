import React from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { Carousel } from "@/components/ui/carousel";

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
      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Page Heading */}
      <header className="text-center pt-10">
        <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
          Photo Collections and Cinematography
        </h1>
        <p className="text-lg text-muted-foreground drop-shadow-lg">
          Explore creative visuals and stories
        </p>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[80vh] px-4">
        <div className="relative backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-xl w-full max-w-5xl h-[600px] flex flex-col overflow-hidden">
          
          {/* Top-left Title */}
          <div className="absolute top-4 left-4 bg-black/30 text-white px-4 py-2 rounded-xl text-lg font-semibold">
            Japan 2024 Collection
          </div>

          {/* Rolling Media (Images/Videos) */}
          <Carousel className="w-full h-full rounded-2xl overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="https://picsum.photos/1000/600?random=1"
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
                src="https://picsum.photos/1000/600?random=2"
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
