import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-2 px-2">
        {/* Always-elongated bubble */}
        <div
          className="absolute top-0 left-0 h-9 w-[15.5rem] rounded-full 
                     bg-white/10 backdrop-blur-sm border border-white/20
                     transition-all duration-500 ease-in-out"
        />

        {options.map((option, idx) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative z-10 w-28 h-9 text-center tracking-normal rounded-full
                bg-transparent hover:bg-transparent transition-all duration-200 ease-in-out
                ${active ? "text-white font-medium" : "text-gray-300 hover:text-white"}
                ${idx === 0 ? "-translate-x-2" : ""}   // 👈 nudges GDx left
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
