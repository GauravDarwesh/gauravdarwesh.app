import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

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
      <div className="fixed inset-0 z-0" style={{ minHeight: '100vh', minWidth: '100vw' }}>
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="background"
          className="w-full h-full object-cover"
          style={{ 
            minHeight: '100vh', 
            minWidth: '100vw',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};

export default Index;
