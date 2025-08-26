import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);

  const gdxRef = useRef<HTMLButtonElement>(null);
  const classicRef = useRef<HTMLButtonElement>(null);

  // detect scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // compute bubble position + size
  const [bubble, setBubble] = useState({ width: 0, x: 0 });

  useEffect(() => {
  const container = gdxRef.current?.parentElement;
  if (!container) return;

  const containerRect = container.getBoundingClientRect();

  if (location.pathname === "/hobbies" && scrolled) {
    if (gdxRef.current && classicRef.current) {
      const gdxRect = gdxRef.current.getBoundingClientRect();
      const classicRect = classicRef.current.getBoundingClientRect();

      const left = gdxRect.left - containerRect.left;
      const right = classicRect.right - containerRect.left;

      setBubble({ width: right - left, x: left });
    }
  } else {
    const activeRef = isActive("/") ? gdxRef : classicRef;
    if (activeRef.current) {
      const rect = activeRef.current.getBoundingClientRect();
      setBubble({
        width: rect.width,
        x: rect.left - containerRect.left,
      });
    }
  }
}, [scrolled, location.pathname]);


  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="relative flex gap-2 px-2">
        {/* Bubble */}
        <motion.div
          layout
          animate={{ width: bubble.width, x: bubble.x }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="absolute top-0 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
        />

        {/* Buttons */}
        <Button
          ref={gdxRef}
          onClick={() => navigate("/")}
          variant="ghost"
          size="sm"
          className={`relative z-10 w-28 h-9 rounded-full ${
            isActive("/") ? "text-white font-medium" : "text-gray-300 hover:text-white"
          }`}
        >
          GDx
        </Button>

        <Button
          ref={classicRef}
          onClick={() => navigate("/hobbies")}
          variant="ghost"
          size="sm"
          className={`relative z-10 w-28 h-9 rounded-full ${
            isActive("/hobbies") ? "text-white font-medium" : "text-gray-300 hover:text-white"
          }`}
        >
          Classic
        </Button>
      </div>
    </div>
  );
};

export default NavigationToggle;
