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

  // Track active index for blob movement
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const index = options.findIndex((opt) => isActive(opt.path));
    setActiveIndex(index === -1 ? 0 : index);
  }, [location.pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4">
      <div className="relative flex justify-between items-center px-2 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg w-[360px]">
        {/* Blue glass highlight */}
        <div
          className="absolute top-2 bottom-2 w-1/3 rounded-xl bg-blue-500/30 backdrop-blur-md shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
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
                relative flex-1 text-center px-6 py-2 rounded-xl transition-colors duration-300
                ${active
                  ? "text-white font-medium"
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
