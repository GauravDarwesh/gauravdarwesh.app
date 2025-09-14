import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ANIM_MS = 1000; // fade-in duration

const Landing = () => {
  const [animate, setAnimate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col items-start justify-center px-12 space-y-6 transition-opacity duration-1000 ${
        animate ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundImage:
          "url('https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <p className="text-white/80 underline cursor-pointer" onClick={() => handleNavigate("/gdx")}>
        GDx – Gaurav Darwesh’s intelligent personal assistant, built to simplify and enhance your experience.
      </p>
      <p className="text-white/80 underline cursor-pointer" onClick={() => handleNavigate("/hobbies")}>
        Classic – The official website hub for Gaurav Darwesh’s work, journey, and updates.
      </p>
      <p className="text-white/80 underline cursor-pointer" onClick={() => handleNavigate("/blog")}>
        Notions – A curated blog space sharing ideas, reflections, and explorations.
      </p>
      <p className="text-white/80 underline cursor-pointer" onClick={() => handleNavigate("/visuals")}>
        Visuals – A showcase of Gaurav’s photography, capturing stories through the lens.
      </p>
    </div>
  );
};

export default Landing;
