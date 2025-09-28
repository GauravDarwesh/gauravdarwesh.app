import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";
import { useBrowserCompatibility, getSafeViewportClass } from "@/hooks/use-browser-compatibility";

const ANIM_MS = 3000; // same duration for all

const Index = () => {
  const [animate, setAnimate] = useState(false);
  const browserInfo = useBrowserCompatibility();

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
      className={`
        ${getSafeViewportClass(browserInfo)} w-full flex flex-col items-center justify-center 
        relative overflow-hidden safe-area-inset gpu-accelerated
        ${animate ? "animate-slowFadeIn" : ""}
      `}
    >
      {/* Background */}
      <div className="fixed inset-0 z-0 gpu-accelerated">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="Professional background showcasing Gaurav Darwesh's portfolio"
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20 safe-area-top">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className="fixed top-6 inset-x-0 flex justify-center z-10 safe-area-top">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
