import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic Website", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 z-50">
      <div className="flex justify-center items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
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
                  ? "bg-white/20 text-white font-semibold backdrop-blur-sm"
                  : "text-gray-300"}
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
