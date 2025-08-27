import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000; // match CSS animation duration

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className={`fixed inset-0 bg-cover bg-center bg-no-repeat ${
          animate ? "animate-slowFadeIn" : ""
        }`}
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <div
        className={`relative z-20 transition-opacity duration-1000 ${
          animate ? "opacity-0" : "opacity-100"
        }`}
        style={{ transitionDelay: animate ? `${ANIM_MS - 800}ms` : "0ms" }}
      >
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div
        className={`fixed z-10 transition-opacity duration-1000 ${
          animate ? "opacity-0" : "opacity-100"
        }`}
        style={{ transitionDelay: animate ? `${ANIM_MS - 600}ms` : "0ms" }}
      >
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
