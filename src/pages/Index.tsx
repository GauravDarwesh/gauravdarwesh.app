import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000; // same duration for fade

const Index = () => {
  const [animate, setAnimate] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className="fixed top-6 inset-x-0 flex justify-center z-10">
        {/* Pass a callback to know when it's expanded */}
        <SearchBar onExpandChange={setExpanded} />
      </div>

      {/* Side Names */}
      <div
        className={`fixed inset-y-0 left-4 flex items-center z-20 transition-all duration-500 ${
          expanded ? "-translate-x-4" : ""
        }`}
      >
        <span className="text-white text-[10px] sm:text-xs font-semibold tracking-wide select-none">
          Gaurav
        </span>
      </div>
      <div
        className={`fixed inset-y-0 right-4 flex items-center z-20 transition-all duration-500 ${
          expanded ? "translate-x-4" : ""
        }`}
      >
        <span className="text-white text-[10px] sm:text-xs font-semibold tracking-wide select-none">
          Darwesh
        </span>
      </div>
    </div>
  );
};

export default Index;
