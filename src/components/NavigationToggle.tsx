import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const gdxRef = useRef<HTMLButtonElement>(null);
  const classicRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // find active button ref
  const activeRef =
    location.pathname === "/hobbies" ? classicRef : location.pathname === "/" ? gdxRef : null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-2 px-2">
        {/* Bubble */}
        <AnimatePresence>
          {activeRef?.current && (
            <motion.div
              key={location.pathname + (scrolled ? "-scroll" : "-normal")}
              className="absolute top-0 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
              initial={false}
              animate={{
                x:
                  location.pathname === "/hobbies" && scrolled
                    ? gdxRef.current?.offsetLeft ?? 0
                    : activeRef.current.offsetLeft,
                width:
                  location.pathname === "/hobbies" && scrolled
                    ? (classicRef.current?.offsetLeft ?? 0) +
                      (classicRef.current?.offsetWidth ?? 0) -
                      (gdxRef.current?.offsetLeft ?? 0)
                    : activeRef.current.offsetWidth,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 18,
                duration: 0.6,
              }}
              style={{ y: 0 }}
            />
          )}
        </AnimatePresence>

        {/* Buttons */}
        <Button
          ref={gdxRef}
          onClick={() => navigate("/")}
          variant="ghost"
          size="sm"
          className={`relative z-10 w-28 h-9 rounded-full 
            ${isActive("/") ? "text-white font-medium" : "text-gray-300 hover:text-white"}`}
        >
          GDx
        </Button>

        <Button
          ref={classicRef}
          onClick={() => navigate("/hobbies")}
          variant="ghost"
          size="sm"
          className={`relative z-10 w-28 h-9 rounded-full 
            ${isActive("/hobbies") ? "text-white font-medium" : "text-gray-300 hover:text-white"}`}
        >
          Classic
        </Button>
      </div>
    </div>
  );
};

export default NavigationToggle;
