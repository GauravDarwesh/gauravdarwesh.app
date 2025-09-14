import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ANIM_MS = 3000; // same duration as Index

const Landing = () => {
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).__landingAnimationPlayed) {
      setAnimate(true);
      (window as any).__landingAnimationPlayed = true;
      const t = setTimeout(() => setAnimate(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden ${
        animate ? "animate-slowFadeIn" : ""
      }`}
    >
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png"
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-8 md:p-12">
          <div className="space-y-8 text-center">
            {/* GDx Section */}
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate("/gdx")}
                className="story-link text-3xl md:text-4xl font-bold text-white hover:text-primary transition-colors duration-300"
              >
                GDx
              </button>
              <p className="text-white/80 text-lg md:text-xl">
                Gaurav Darwesh's intelligent personal assistant, built to simplify and enhance your experience.
              </p>
            </div>

            {/* Classic Section */}
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate("/hobbies")}
                className="story-link text-3xl md:text-4xl font-bold text-white hover:text-primary transition-colors duration-300"
              >
                Classic
              </button>
              <p className="text-white/80 text-lg md:text-xl">
                The official website hub for Gaurav Darwesh's work, journey, and updates.
              </p>
            </div>

            {/* Notions Section */}
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate("/blog")}
                className="story-link text-3xl md:text-4xl font-bold text-white hover:text-primary transition-colors duration-300"
              >
                Notions
              </button>
              <p className="text-white/80 text-lg md:text-xl">
                A curated blog space sharing ideas, reflections, and explorations.
              </p>
            </div>

            {/* Visuals Section */}
            <div className="space-y-2">
              <button
                onClick={() => handleNavigate("/visuals")}
                className="story-link text-3xl md:text-4xl font-bold text-white hover:text-primary transition-colors duration-300"
              >
                Visuals
              </button>
              <p className="text-white/80 text-lg md:text-xl">
                A showcase of Gaurav's photography, capturing stories through the lens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;