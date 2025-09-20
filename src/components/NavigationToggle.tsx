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
  className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex gap-2 
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
        variant="ghost"
        size="sm"
        className={`
          w-20 h-9 text-[12px] text-center tracking-normal rounded-full 
          bg-transparent hover:bg-transparent
          border border-transparent
          ${active
            ? "bg-white/10 border-white/20 text-white backdrop-blur-sm"
            : "text-gray-300 hover:text-white"
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
          fixed bottom-6 right-6 z-[60] 
          flex items-center justify-center
          w-12 h-12 rounded-full backdrop-blur-md
          bg-white/10 border border-white/20
          text-white shadow-lg
          transition-all duration-1000 ease-in-out
          hover:bg-white/20
          ${enabledOnThisPath && showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-0 translate-y-2 pointer-events-none"}
        `}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default NavigationToggle;
