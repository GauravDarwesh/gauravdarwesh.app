import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000; // match the CSS animation duration (ms)

const Index = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Run animation only if not played in this tab (in-memory)
    // window.__indexAnimationPlayed will be cleared when the tab reloads (desired)
    if (!(window as any).__indexAnimationPlayed) {
      setAnimate(true);
      (window as any).__indexAnimationPlayed = true;

      const t = setTimeout(() => setAnimate(false), ANIM_MS);
      return () => clearTimeout(t);
    }
    // otherwise do nothing — UI stays visible immediately
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className={`fixed inset-0 bg-cover bg-center bg-no-repeat ${animate ? "animate-slowFadeIn" : ""}`}
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle (fade in after bg) */}
      <div
        className={`relative z-20 transition-opacity duration-700 ${
          animate ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ transitionDelay: animate ? `${ANIM_MS}ms` : "0ms" }}
      >
        <NavigationToggle />
      </div>

      {/* Search Bar (fade in after bg) */}
      <div
        className={`fixed z-10 transition-opacity duration-700 ${
          animate ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ transitionDelay: animate ? `${ANIM_MS + 120}ms` : "0ms" }}
      >
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
