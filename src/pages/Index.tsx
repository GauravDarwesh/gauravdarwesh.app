import React, { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000; // same duration for all

const Index = () => {
  const [animate, setAnimate] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!(window as any).__indexAnimationPlayed) {
      setAnimate(true);
      (window as any).__indexAnimationPlayed = true;
      const t = setTimeout(() => {
        setAnimate(false);
        setIsReady(true);
      }, ANIM_MS);
      return () => clearTimeout(t);
    } else {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // Smooth progress animation
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (imageLoaded && isReady) return 100;
        if (prev >= 90) return 90;
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [imageLoaded, isReady]);

  useEffect(() => {
    if (imageLoaded && isReady) {
      setLoadingProgress(100);
    }
  }, [imageLoaded, isReady]);

  const showLoading = loadingProgress < 100;

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden ${
        animate ? "animate-slowFadeIn" : ""
      }`}
    >
      {/* Loading Bar */}
      {showLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
          <div
            className="h-full bg-white/40 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="background"
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
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
