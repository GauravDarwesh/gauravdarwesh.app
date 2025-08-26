import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState({ width: "7rem", x: 0 });

  const gdxRef = useRef<HTMLButtonElement>(null);
  const classicRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const options = [
    { name: "GDx", path: "/", ref: gdxRef },
    { name: "Classic", path: "/hobbies", ref: classicRef },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (scrolled) {
      // expand to cover everything
      const first = gdxRef.current;
      const last = classicRef.current;
      if (first && last) {
        const left = first.offsetLeft;
        const right = last.offsetLeft + last.offsetWidth;
        setBubbleStyle({
          width: `${right - left}px`,
          x: left,
        });
      }
    } else {
      // shrink to just active button
      const active = options.find((o) => isActive(o.path));
      if (active?.ref.current) {
        setBubbleStyle({
          width: `${active.ref.current.offsetWidth}px`,
          x: active.ref.current.offsetLeft,
        });
      }
    }
  }, [scrolled, location.pathname]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-2 px-2">
        {/* Bubble */}
        <div
          className="absolute top-0 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-500 ease-in-out"
          style={{
            width: bubbleStyle.width,
            transform: `translateX(${bubbleStyle.x}px)`,
          }}
        />

        {options.map((option) => {
          const active = isActive(option.path);
          return (
            <Button
              key={option.name}
              ref={option.ref}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative z-10 w-28 h-9 text-center tracking-normal rounded-full 
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
