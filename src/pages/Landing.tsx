import React from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className="h-[100dvh] w-full flex items-center justify-center px-6"
      style={{
        backgroundImage:
          "url('https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <p className="text-white text-center text-lg md:text-xl space-x-4">
        <span
          className="underline cursor-pointer"
          onClick={() => handleNavigate("/gdx")}
        >
          GDx
        </span>{" "}
        – Gaurav Darwesh’s intelligent personal assistant, built to simplify and enhance your experience.{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => handleNavigate("/hobbies")}
        >
          Classic
        </span>{" "}
        – The official website hub for Gaurav Darwesh’s work, journey, and updates.{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => handleNavigate("/blog")}
        >
          Notions
        </span>{" "}
        – A curated blog space sharing ideas, reflections, and explorations.{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => handleNavigate("/visuals")}
        >
          Visuals
        </span>{" "}
        – A showcase of Gaurav’s photography, capturing stories through the lens.
      </p>
    </div>
  );
};

export default Landing;
