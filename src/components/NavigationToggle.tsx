import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavigationToggleProps {
  isModalOpen?: boolean;
  onCloseModal?: () => void;
}

const NavigationToggle = ({ isModalOpen = false, onCloseModal }: NavigationToggleProps) => {
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
    
    // Use passive listeners for better performance
    const scrollOptions = { passive: true };
    const resizeOptions = { passive: true };
    
    window.addEventListener("scroll", update, scrollOptions);
    window.addEventListener("resize", update, resizeOptions);
    
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabledOnThisPath]);

  const scrollToTop = () => {
    // Use smooth scrolling with fallback
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Fallback for older browsers
      window.scrollTo(0, 0);
    }
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


      {/* Floating round translucent ball (scroll to top or close modal) */}
      <button
        onClick={isModalOpen ? onCloseModal : scrollToTop}
        onTouchStart={(e) => {
          // Prevent 300ms delay on mobile
          e.preventDefault();
          (e.target as HTMLButtonElement).click();
        }}
        aria-label={isModalOpen ? "Close modal" : "Scroll to top"}
        className={`
          fixed bottom-6 right-6 z-50 
          flex items-center justify-center
          w-12 h-12 rounded-full backdrop-blur-md
          bg-white/10 border border-white/20
          text-white shadow-lg
          transition-all duration-1000 ease-in-out
          hover:bg-white/20
          touch-manipulation
          ${(enabledOnThisPath && showScrollTop) || isModalOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-0 translate-y-2 pointer-events-none"}
        `}
      >
        <div className="relative w-5 h-5">
          {/* Scroll to top icon */}
          <ChevronUp 
            className={`
              absolute top-0 left-0 w-5 h-5 
              transition-all duration-500 ease-out
              ${isModalOpen 
                ? "opacity-0 scale-75 rotate-45" 
                : "opacity-100 scale-100 rotate-0"
              }
            `} 
          />
          {/* Close modal icon */}
          <X 
            className={`
              absolute top-0 left-0 w-5 h-5 
              transition-all duration-500 ease-out
              ${isModalOpen 
                ? "opacity-100 scale-100 rotate-0" 
                : "opacity-0 scale-75 -rotate-45"
              }
            `} 
          />
        </div>
      </button>
    </>
  );
};

export default NavigationToggle;
