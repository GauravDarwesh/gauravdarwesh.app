import React from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { motion } from "framer-motion";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

const Visuals = () => {
  const mediaItems = [
    { type: "image", src: "https://via.placeholder.com/800x400" },
    { type: "video", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { type: "image", src: "https://via.placeholder.com/800x400?text=Second+Image" },
  ];

  return (
    <div
      className="min-h-screen w-full text-foreground relative bg-cover bg-center"
      style={{
        backgroundImage: `url('https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg')`,
      }}
    >
      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-4xl p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl"
        >
          <h1 className="text-3xl font-bold text-center mb-6">Visuals</h1>

          {/* Carousel for photos & videos */}
          <Carousel
            showThumbs={false}
            showStatus={false}
            infiniteLoop
            autoPlay
            interval={3000}
            stopOnHover
            className="rounded-2xl overflow-hidden"
          >
            {mediaItems.map((item, index) => (
              <div key={index} className="w-full h-[400px] bg-black">
                {item.type === "image" ? (
                  <img
                    src={item.src}
                    alt={`Slide ${index}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={item.src}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                  />
                )}
              </div>
            ))}
          </Carousel>
        </motion.div>
      </div>
    </div>
  );
};

export default Visuals;
