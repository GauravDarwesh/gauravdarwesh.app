import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [bubbleStyle, setBubbleStyle] = useState<{ width: number; x: number }>({
    width: 0,
    x: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Handle scroll (expand bubble)
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Position bubble correctly
  useEffect(() => {
    if (!containerRef.current || !buttonRefs.current.length) return;

    if (scrolled) {
      // Cover both buttons
      const first = buttonRefs.current[0]?.getBoundingClientRect();
      const last = buttonRefs.current[buttonRefs.current.length - 1]?.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();

      if (first && last) {
        const x = first.left - container.left;
        const width = last.right - first.left;
        setBubbleStyle({ x, width });
      }
    } else {
      // Only cover active button
      const activeIndex = options.findIndex((o) => isActive(o.path));
      const activeBtn = buttonRefs.current[activeIndex];
      const container = containerRef.current.getBoundingClientRect();

      if (activeBtn && container) {
        const rect = activeBtn.getBoundingClientRect();
        const x = rect.left - container.left;
        const width = rect.width;
        setBubbleStyle({ x, width });
      }
    }
  }, [location.pathname, scrolled]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div ref={containerRef} className="relative flex gap-2 px-2">
        {/* Bubble */}
        <div
          className="absolute top-0 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-500 ease-in-out"
          style={{
            width: `${bubbleStyle.width}px`,
            transform: `translateX(${bubbleStyle.x}px)`,
          }}
        />

        {options.map((option, i) => {
          const active = isActive(option.path);
          return (
            <Button
              ref={(el) => (buttonRefs.current[i] = el)}
              key={option.name}
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
