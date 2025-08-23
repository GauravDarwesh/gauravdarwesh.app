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

  const [blobStyle, setBlobStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeIndex = options.findIndex((opt) => isActive(opt.path));
    const activeEl = document.getElementById(`nav-${activeIndex}`);
    if (activeEl) {
      setBlobStyle({
        left: activeEl.offsetLeft - 6, // little margin on sides
        width: activeEl.offsetWidth + 12, // hug text + padding
      });
    }
  }, [location.pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-4 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
        {/* Translucent glass highlight */}
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white/20 backdrop-blur-md shadow-sm transition-all duration-700 ease-[cubic-bezier(0.25,1,0.3,1)]"
          style={{
            left: blobStyle.left,
            width: blobStyle.width,
          }}
        />

        {options.map((option, index) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              id={`nav-${index}`}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative z-10 px-4 py-2 rounded-lg transition-colors duration-300
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
