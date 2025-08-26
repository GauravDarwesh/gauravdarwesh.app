import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const gdxRef = useRef<HTMLButtonElement>(null);
  const classicRef = useRef<HTMLButtonElement>(null);

  const [scrolled, setScrolled] = useState(false);
  const [bubble, setBubble] = useState({ width: 0, x: 0 });

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // measure buttons after render
    const gdx = gdxRef.current;
    const classic = classicRef.current;
    if (!gdx || !classic) return;

    if (location.pathname === "/hobbies" && scrolled) {
      // Expand bubble symmetrically from Classic to GDx
      const left = Math.min(gdx.offsetLeft, classic.offsetLeft);
      const right = Math.max(
        gdx.offsetLeft + gdx.offsetWidth,
        classic.offsetLeft + classic.offsetWidth
      );
      setBubble({
        width: right - left,
        x: left,
      });
    } else {
      // Only cover active button
      const active = isActive("/") ? gdx : classic;
      setBubble({
        width: active.offsetWidth,
        x: active.offsetLeft,
      });
    }
  }, [location.pathname, scrolled]);

  const options = [
    { name: "GDx", path: "/", ref: gdxRef },
    { name: "Classic", path: "/hobbies", ref: classicRef },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-2 px-2">
        {/* Animated bubble */}
        <motion.div
          className="absolute top-0 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
          animate={{ width: bubble.width, x: bubble.x }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
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
              className={`relative z-10 w-28 h-9 text-center rounded-full 
                bg-transparent hover:bg-transparent transition-colors duration-300
                ${
                  active
                    ? "text-white font-semibold"
                    : "text-gray-300 hover:text-white"
                }`}
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
