import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // ✅ Only enable scroll-hide + up-arrow on these paths (exclude "/" so GDx won't show it)
  const SHOW_ON_PATHS = ["/hobbies", "/blog", "/visuals"];
  const enabledOnThisPath = useMemo(
    () => SHOW_ON_PATHS.includes(location.pathname),
    [location.pathname]
  );

  const [showScrollTop, setShowScrollTop] = useState(false);

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
    { name: "Notions", path: "/blog" },
    { name: "Visuals", path: "/visuals" },
  ];

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const update = () => {
      if (!enabledOnThisPath) {
        setShowScrollTop(false);
        return;
      }

      const doc = document.documentElement;
      const hasScrollableContent = doc.scrollHeight - window.innerHeight > 4;
      const scrolledPastThreshold = window.scrollY > 30;

      setShowScrollTop(hasScrollableContent && scrolledPastThreshold);
    };

    // Run once on mount/route change, then on scroll/resize
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabledOnThisPath]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Navigation buttons (fade only on allowed paths) */}
      <div
  className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 
    transition-all duration-700 ease-out
    ${enabledOnThisPath && showScrollTop
      ? "opacity-0 scale-98 pointer-events-none"
      : "opacity-100 scale-100 pointer-events-auto"
    }
  `}
>
  {options.map((option) => {
    const active = isActive(option.path);
    return (
      <Button
        key={option.name}
        onClick={() => navigate(option.path)}
        variant="glass"
        size="sm"
        className={`
          w-20 h-9 text-xs font-medium tracking-wide rounded-full 
          transition-all duration-500 ease-elegant font-inter
          ${active
            ? "bg-glass-strong border-primary/30 text-foreground shadow-elegant-sm scale-105"
            : "text-foreground/70 hover:text-foreground hover:shadow-elegant-sm"
          }
        `}
      >
        {option.name}
      </Button>
    );
  })}
</div>


      {/* Floating round translucent ball (only on allowed paths) */}
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`
          fixed bottom-6 right-6 z-50 
          flex items-center justify-center
          w-14 h-14 rounded-full 
          bg-glass-medium backdrop-blur-elegant border border-card-border
          text-foreground shadow-elegant-lg
          transition-all duration-700 ease-spring
          hover:bg-glass-strong hover:scale-110 hover:shadow-glow
          ${enabledOnThisPath && showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-0 translate-y-2 pointer-events-none"}
        `}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default NavigationToggle;
