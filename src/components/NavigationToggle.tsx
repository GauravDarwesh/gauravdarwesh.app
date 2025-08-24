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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2">
      {options.map((option) => {
        const active = isActive(option.path);
        return (
          <Button
            key={option.name}
            onClick={() => navigate(option.path)}
            variant="ghost"
            size="sm"
            className={`
              w-28 text-center tracking-normal rounded-xl 
              bg-transparent hover:bg-transparent
              ${active
                ? "bg-white/10 text-white font-semibold backdrop-blur-sm" // softer highlight
                : "text-gray-300"}
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
