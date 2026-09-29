import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronUp, X } from "lucide-react";
import { useSiteTheme } from "@/components/SiteThemeProvider";

interface NavigationToggleProps {
  isModalOpen?: boolean;
  onCloseModal?: () => void;
  isBlurred?: boolean;
}

const GDx_EASTER_EGG_KEY = "gdx-theme-easter-egg-discovered";
const THEME_HINT_DELAY = 15000;

const NavigationToggle = ({ isModalOpen = false, onCloseModal, isBlurred = false }: NavigationToggleProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme } = useSiteTheme();

  // ------------------------------------------------------------
  // Scroll / route behaviour
  // ------------------------------------------------------------
  const SHOW_ON_PATHS = ["/hobbies", "/blog", "/visuals"];
  const enabledOnThisPath = useMemo(() => SHOW_ON_PATHS.includes(location.pathname), [location.pathname]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ------------------------------------------------------------
  // GDx theme easter egg
  // ------------------------------------------------------------
  const isGdxPage = location.pathname === "/";
  const [themeHintReady, setThemeHintReady] = useState(false);
  const [themeAlreadyDiscovered, setThemeAlreadyDiscovered] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(GDx_EASTER_EGG_KEY) === "true";
  });

  /*
   * Wait 15 seconds after entering the GDx page before showing
   * the two-blink hint.
   *
   * The timeout is reset when leaving / and entering it again.
   */
  useEffect(() => {
    setThemeHintReady(false);

    if (!isGdxPage || themeAlreadyDiscovered) {
      return;
    }

    const timer = window.setTimeout(() => {
      setThemeHintReady(true);
    }, THEME_HINT_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isGdxPage, themeAlreadyDiscovered]);

  /*
   * GDx navigation / interaction
   *
   * On another page:
   * single click -> navigate to GDx
   *
   * On GDx:
   * single click -> nothing
   * double click -> toggle minimalistic theme
   *
   * Using click detail here avoids combining onClick and
   * onDoubleClick, which can make the first press feel strange.
   */
  const handleGdxClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isGdxPage) {
      navigate("/");
      return;
    }

    // Only react to the second click of a double-click.
    if (event.detail !== 2) {
      return;
    }

    toggleTheme();
    window.localStorage.setItem(GDx_EASTER_EGG_KEY, "true");
    setThemeAlreadyDiscovered(true);
    setThemeHintReady(false);
  };

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
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 transition-all duration-700 ease-out ${
          enabledOnThisPath && showScrollTop
            ? "opacity-0 scale-98 pointer-events-none"
            : "opacity-100 scale-100 pointer-events-auto"
        } ${isBlurred ? "blur-sm pointer-events-none" : "blur-0"}`}
      >
        {options.map((option) => {
          const active = isActive(option.path);
          const isGdx = option.name === "GDx";

          /*
           * The visual hint is completely separate from the
           * actual double-click interaction.
           *
           * It only becomes active after 15 seconds.
           */
          const showGdxHint = isGdx && isGdxPage && themeHintReady && !themeAlreadyDiscovered;

          return (
            <Button
              key={option.name}
              type="button"
              onClick={isGdx ? handleGdxClick : () => navigate(option.path)}
              variant="ghost"
              size="sm"
              aria-label={isGdx ? "GDx. Double-click to change theme" : option.name}
              className={`relative w-20 h-9 p-0 inline-flex items-center justify-center text-[12px] leading-none tracking-normal rounded-full bg-transparent hover:bg-transparent border border-transparent ${
                active ? "bg-white/10 border-white/20 text-white backdrop-blur-sm" : "text-gray-300 hover:text-white"
              } ${showGdxHint ? "gdx-theme-hint" : ""}`}
            >
              <span>{option.name}</span>
            </Button>
          );
        })}
      </div>

      {/* Floating round translucent ball */}
      <button
        type="button"
        data-site-floating-control
        onClick={isModalOpen ? onCloseModal : scrollToTop}
        aria-label={isModalOpen ? "Close modal" : "Scroll to top"}
        className={`fixed bottom-6 right-6 ${
          isModalOpen ? "z-[70]" : "z-50"
        } flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white shadow-lg transition-opacity duration-700 ease-in-out hover:bg-white/20 ${
          (enabledOnThisPath && showScrollTop) || isModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative w-5 h-5">
          <ChevronUp
            className={`absolute top-0 left-0 w-5 h-5 transition-all duration-500 ease-out ${
              isModalOpen ? "opacity-0 scale-75 rotate-45" : "opacity-100 scale-100 rotate-0"
            }`}
          />
          <X
            className={`absolute top-0 left-0 w-5 h-5 transition-all duration-500 ease-out ${
              isModalOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-45"
            }`}
          />
        </div>
      </button>
    </>
  );
};

export default NavigationToggle;
