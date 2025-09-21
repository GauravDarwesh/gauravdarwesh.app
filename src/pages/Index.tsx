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
    <div className="h-[100dvh] w-full relative overflow-hidden">
      {/* Elegant Background with Gradient Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="Elegant background"
          className={`w-full h-full object-cover transition-all duration-1000 ${
            animate ? "scale-105 opacity-80" : "scale-100 opacity-90"
          }`}
        />
        
        {/* Sophisticated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-elegant opacity-60" />
        
        {/* Floating Elements for Depth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float-elegant" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float-elegant" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-primary-glow/10 rounded-full blur-2xl animate-glow-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>

      {/* Hero Content */}
      <div className="relative z-15 h-full flex flex-col items-center justify-center px-6">
        <div className={`text-center max-w-4xl mx-auto ${animate ? "animate-fade-in-elegant" : ""}`}>
          {/* Main Title */}
          <h1 className="font-playfair text-6xl md:text-8xl lg:text-9xl font-bold text-foreground mb-6 tracking-tight">
            <span className="inline-block bg-gradient-primary bg-clip-text text-transparent">
              Gaurav
            </span>
            <br />
            <span className="text-foreground/90">Darwesh</span>
          </h1>
          
          {/* Elegant Subtitle */}
          <p className="text-xl md:text-2xl text-foreground/80 font-inter font-light max-w-2xl mx-auto leading-relaxed mb-8">
            Strategic Business • Data Science • Product Innovation
          </p>
          
          {/* Refined Badge */}
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-glass-medium backdrop-blur-glass border border-card-border shadow-elegant-md">
            <div className="w-2 h-2 rounded-full bg-accent animate-glow-pulse mr-3" />
            <span className="text-sm font-medium text-foreground/90">Currently at Nasdaq</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="fixed top-6 inset-x-0 flex justify-center z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
