import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSiteTheme } from "@/components/SiteThemeProvider";

interface NavigationToggleProps {
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  isBlurred?: boolean;
}

const NavigationToggle = ({ isModalOpen = false, onCloseModal, isBlurred = false }: NavigationToggleProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toggleTheme } = useSiteTheme();

  // ------------------------------------------------------------
  // Scroll / route behaviour
  // ------------------------------------------------------------

  const SHOW_ON_PATHS = ["/hobbies", "/blog", "/visuals"];

  const enabledOnThisPath = useMemo(() => SHOW_ON_PATHS.includes(location.pathname), [location.pathname]);

  const [showScrollTop, setShowScrollTop] = useState(false);

  // ------------------------------------------------------------
  // GDx easter-egg state
  // ------------------------------------------------------------

  const [showThemeHint, setShowThemeHint] = useState(true);

  const gdClickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Once the user has discovered the interaction,
    // stop showing the hint permanently for this session.
    const discovered = window.sessionStorage.getItem("gdx-theme-easter-egg-discovered");

    if (discovered === "true") {
      setShowThemeHint(false);
    }
  }, []);

  const handleGdxClick = () => {
    if (gdClickTimerRef.current !== null) {
      window.clearTimeout(gdClickTimerRef.current);
      gdClickTimerRef.current = null;

      // Second click within the double-click window:
      // toggle theme instead of navigating twice.
      toggleTheme();

      window.sessionStorage.setItem("gdx-theme-easter-egg-discovered", "true");

      setShowThemeHint(false);
      return;
    }

    // Wait briefly before treating the first click
    // as a normal navigation click.
    gdClickTimerRef.current = window.setTimeout(() => {
      gdClickTimerRef.current = null;
      navigate("/");
    }, 260);
  };

  useEffect(() => {
    return () => {
      if (gdClickTimerRef.current !== null) {
        window.clearTimeout(gdClickTimerRef.current);
      }
    };
  }, []);

  // ------------------------------------------------------------
  // Scroll-to-top behaviour
  // ------------------------------------------------------------

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

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabledOnThisPath]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------

  const options = [
    { name: "GDx", path: "/" },
    { name: "Classic", path: "/hobbies" },
    { name: "Notions", path: "/blog" },
    { name: "Visuals", path: "/visuals" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Navigation */}
      <div
        data-site-navigation
        className={`
          fixed top-6 left-1/2 -translate-x-1/2 z-50
          flex gap-2
          transition-all duration-700 ease-out

          ${
            enabledOnThisPath && showScrollTop
              ? "opacity-0 scale-98 pointer-events-none"
              : "opacity-100 scale-100 pointer-events-auto"
          }

          ${isBlurred ? "blur-sm pointer-events-none" : "blur-0"}
        `}
      >
        {options.map((option) => {
          const active = isActive(option.path);
          const isGdx = option.name === "GDx";

          return (
            <Button
              key={option.name}
              onClick={isGdx ? handleGdxClick : () => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                relative
                w-20 h-9
                text-[12px]
                text-center
                tracking-normal
                rounded-full

                bg-transparent
                hover:bg-transparent

                border border-transparent

                ${active ? "bg-white/10 border-white/20 text-white backdrop-blur-sm" : "text-gray-300 hover:text-white"}

                ${isGdx && showThemeHint ? "gdx-theme-hint" : ""}
              `}
            >
              {option.name}

              {/* Subtle hidden interaction indicator */}
              {isGdx && showThemeHint && (
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    inset-0
                    rounded-full
                    pointer-events-none
                    gdx-theme-glow
                  "
                />
              )}
            </Button>
          );
        })}
      </div>

      {/* Floating round translucent ball */}
      <button
        data-site-floating-control
        onClick={isModalOpen ? onCloseModal : scrollToTop}
        aria-label={isModalOpen ? "Close modal" : "Scroll to top"}
        className={`
          fixed bottom-6 right-6
          ${isModalOpen ? "z-[70]" : "z-50"}

          flex items-center justify-center
          w-12 h-12
          rounded-full
          backdrop-blur-md

          bg-white/10
          border border-white/20

          text-white
          shadow-lg

          transition-opacity
          duration-700
          ease-in-out

          hover:bg-white/20

          ${(enabledOnThisPath && showScrollTop) || isModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="relative w-5 h-5">
          <ChevronUp
            className={`
              absolute top-0 left-0
              w-5 h-5

              transition-all
              duration-500
              ease-out

              ${isModalOpen ? "opacity-0 scale-75 rotate-45" : "opacity-100 scale-100 rotate-0"}
            `}
          />

          <X
            className={`
              absolute top-0 left-0
              w-5 h-5

              transition-all
              duration-500
              ease-out

              ${isModalOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-45"}
            `}
          />
        </div>
      </button>
    </>
  );
};

export default NavigationToggle;
