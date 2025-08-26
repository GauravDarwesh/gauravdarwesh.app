import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50); // trigger after 50px scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2">
      {options.map((option) => {
        const active = isActive(option.path);
        const isClassicActiveAndScrolled =
          option.name === "Classic" && active && isScrolled;

        return (
          <Button
            key={option.name}
            onClick={() => navigate(option.path)}
            variant="ghost"
            size="sm"
            className={`
              relative overflow-hidden
              text-center tracking-normal rounded-full 
              bg-transparent hover:bg-transparent
              transition-all duration-700 ease-in-out
              border border-transparent
              ${active
                ? "bg-white/10 border-white/20 text-white backdrop-blur-sm" 
                : "text-gray-300 hover:text-white"}
              ${option.name === "Classic" ? "z-10" : ""}
              ${
                isClassicActiveAndScrolled
                  ? "w-[17rem] h-12 -translate-x-28"
                  : "w-28 h-9"
              }
            `}
          >
            {option.name}
          </Button>
        );
      })}
    </div>
  );
};

export default NavigationToggle;
