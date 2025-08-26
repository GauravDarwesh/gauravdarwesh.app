import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30); // trigger after 30px scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 relative">
      {/* Expanding bubble background */}
      {isActive("/hobbies") && (
        <span
          className={`absolute left-0 h-9 rounded-full backdrop-blur-sm transition-all duration-700 ease-in-out 
            ${scrolled ? "w-[15rem] bg-white/10 border border-white/20" : "w-28 bg-white/10 border border-white/20"}
          `}
          style={{ zIndex: -1 }} // keep behind buttons
        />
      )}

      {options.map((option) => {
        const active = isActive(option.path);
        return (
          <Button
            key={option.name}
            onClick={() => navigate(option.path)}
            variant="ghost"
            size="sm"
            className={`
              relative w-28 h-9 text-center tracking-normal rounded-full
              bg-transparent hover:bg-transparent
              transition-all duration-200 ease-in-out
              border border-transparent
              ${active
                ? "text-white"
                : "text-gray-300 hover:text-white"}
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
