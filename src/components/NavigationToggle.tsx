import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Navigation buttons (smooth fade out) */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 
          transition-all duration-1000 ease-in-out
          ${showScrollTop ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0"}
        `}
      >
        {options.map((option) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                w-28 h-9 text-center tracking-normal rounded-full 
                bg-transparent hover:bg-transparent
                transition-all duration-200 ease-in-out
                border border-transparent
                ${active
                  ? "bg-white/10 border-white/20 text-white backdrop-blur-sm"
                  : "text-gray-300 hover:text-white"}
              `}
            >
              {option.name}
            </Button>
          );
        })}
      </div>

      {/* Floating round translucent ball with up arrow */}
      <button
        onClick={scrollToTop}
        className={`
          fixed bottom-6 right-6 z-50 
          flex items-center justify-center
          w-12 h-12 rounded-full backdrop-blur-md
          bg-white/10 border border-white/20
          text-white shadow-lg
          transition-all duration-1000 ease-in-out
          hover:bg-white/20
          ${showScrollTop ? "opacity-100 scale-100" : "opacity-0 scale-0"}
        `}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default NavigationToggle;
