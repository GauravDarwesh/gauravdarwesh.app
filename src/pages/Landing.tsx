import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ANIM_MS = 3000;

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
      className={`h-[100dvh] w-full flex flex-col items-start justify-center px-12 space-y-6 ${
        animate ? "animate-slowFadeIn" : ""
      }`}
    >
      {/* GDx Section */}
      <div>
        <button
          onClick={() => handleNavigate("/gdx")}
          className="text-xl md:text-2xl font-semibold underline text-white"
        >
          GDx
        </button>
        <p className="text-white/80 mt-1">
          Gaurav Darwesh’s intelligent personal assistant, built to simplify and enhance your experience.
        </p>
      </div>

      {/* Classic Section */}
      <div>
        <button
          onClick={() => handleNavigate("/hobbies")}
          className="text-xl md:text-2xl font-semibold underline text-white"
        >
          Classic
        </button>
        <p className="text-white/80 mt-1">
          The official website hub for Gaurav Darwesh’s work, journey, and updates.
        </p>
      </div>

      {/* Notions Section */}
      <div>
        <button
          onClick={() => handleNavigate("/blog")}
          className="text-xl md:text-2xl font-semibold underline text-white"
        >
          Notions
        </button>
        <p className="text-white/80 mt-1">
          A curated blog space sharing ideas, reflections, and explorations.
        </p>
      </div>

      {/* Visuals Section */}
      <div>
        <button
          onClick={() => handleNavigate("/visuals")}
          className="text-xl md:text-2xl font-semibold underline text-white"
        >
          Visuals
        </button>
        <p className="text-white/80 mt-1">
          A showcase of Gaurav’s photography, capturing stories through the lens.
        </p>
      </div>
    </div>
  );
};

export default Landing;
