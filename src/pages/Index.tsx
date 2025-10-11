import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";
import orangeBg from "@/assets/orange-bg.webp";

const ANIM_MS = 3000; // same duration for all

const Index = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!(window as any).__indexAnimationPlayed) {
      setAnimate(true);
      (window as any).__indexAnimationPlayed = true;
      const t = setTimeout(() => setAnimate(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden ${
        animate ? "animate-slowFadeIn" : ""
      }`}
    >
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src={orangeBg}
          alt="background"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className="fixed top-6 inset-x-0 flex justify-center z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
