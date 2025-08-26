import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-6 px-2">
        {/* Animated bubble */}
        <div
          className={`absolute top-0 left-0 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-500 ease-in-out`}
          style={{
            width: scrolled ? "16.5rem" : "8rem", // ✅ unscrolled = 1 button, scrolled = cover both
            transform: `translateX(${
              scrolled
                ? "0" // expand from left
                : isActive("/") 
                ? "0" // highlight GDx
                : "8rem" // highlight Classic
            })`,
          }}
        />

        {options.map((option) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative z-10 w-32 h-9 text-center tracking-normal rounded-full 
                bg-transparent hover:bg-transparent transition-all duration-200 ease-in-out
                ${active ? "text-white font-medium" : "text-gray-300 hover:text-white"}
              `}
            >
              {option.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationToggle;
