import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const options = [
    { name: "GDx", path: "/" },
    { name: "Hobbies", path: "/hobbies" },
    { name: "Others", path: "/others" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);

  useEffect(() => {
    const index = options.findIndex((opt) => isActive(opt.path));
    setPrevIndex(activeIndex);
    setActiveIndex(index === -1 ? 0 : index);
  }, [location.pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex justify-between items-center px-2 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg w-[360px] overflow-hidden">
        {/* Droplet highlight */}
        <div
          key={activeIndex} // force reflow to trigger animation
          className={`absolute top-2 bottom-2 w-1/3 rounded-xl bg-white/20 backdrop-blur-md shadow-sm transition-transform duration-800 ease-in-out`}
          style={{
            transform: `translateX(${activeIndex * 100}%) scaleX(${
              activeIndex > prevIndex ? 1.1 : activeIndex < prevIndex ? 0.9 : 1
            })`,
          }}
        />

        {options.map((option, index) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative flex-1 text-center px-4 py-2 rounded-lg transition-colors duration-300
                bg-transparent hover:bg-transparent
                ${active
                  ? "text-white font-semibold"
                  : "text-gray-300 hover:text-white"}
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
