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

  const sections = [
    {
      name: "GDx",
      desc: "Gaurav Darwesh’s intelligent personal assistant, built to simplify and enhance your experience.",
      path: "/gdx",
    },
    {
      name: "Classic",
      desc: "The official website hub for Gaurav Darwesh’s work, journey, and updates.",
      path: "/hobbies",
    },
    {
      name: "Notions",
      desc: "A curated blog space sharing ideas, reflections, and explorations.",
      path: "/blog",
    },
    {
      name: "Visuals",
      desc: "A showcase of Gaurav’s photography, capturing stories through the lens.",
      path: "/visuals",
    },
  ];

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
      <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-8 text-center">
        {sections.map((sec) => (
          <div key={sec.name} className="space-y-1">
            <button
              onClick={() => handleNavigate(sec.path)}
              className="text-3xl md:text-4xl font-bold text-white underline hover:text-primary transition-colors duration-300 flex items-center justify-center gap-2"
            >
              {sec.name} <span className="text-xl">→</span>
            </button>
            <p className="text-white/80 text-lg md:text-xl">{sec.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Landing;
