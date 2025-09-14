import React, { useEffect, useState, useRef } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Index = () => {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Wait for video to buffer enough to play smoothly
      const handleCanPlay = () => setLoaded(true);
      video.addEventListener("canplaythrough", handleCanPlay, { once: true });
      return () => {
        video.removeEventListener("canplaythrough", handleCanPlay);
      };
    }
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Loader (before video is ready) */}
      {!loaded && (
        <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
          <p className="text-white text-lg animate-pulse">Loading...</p>
        </div>
      )}

      {/* Background Video */}
      <video
        ref={videoRef}
        className={`fixed inset-0 z-0 w-full h-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        {/* Multiple Resolutions */}
        <source src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/videos/Water-1080p.mp4" type="video/mp4" media="(max-width: 1920px)" />
        <source src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/videos/Water-4k.mp4" type="video/mp4" media="(min-width: 1921px)" />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/40 z-0" />

      {/* Navigation Toggle */}
      <div className={`relative z-20 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className={`fixed top-6 inset-x-0 flex justify-center z-20 transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}>
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
