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

  // Track blob position + width for CSS-only animation
  const [blobStyle, setBlobStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeIndex = options.findIndex((opt) => isActive(opt.path));
    const activeEl = document.getElementById(`nav-${activeIndex}`);
    if (activeEl) {
      setBlobStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [location.pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4">
      <div className="relative flex gap-2 px-2 py-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg">
        {/* Gooey glass blob */}
        <div
          className="absolute top-2 bottom-2 rounded-xl bg-white/30 backdrop-blur-md shadow-md transition-all duration-500 ease-[cubic-bezier(0.25,1,0.3,1)]"
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
                relative px-6 py-2 rounded-xl transition-all duration-300
                ${active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"}
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
