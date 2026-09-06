import { useRef, useState, type CSSProperties } from "react";
import { useSiteTheme } from "@/components/SiteThemeProvider";
import { Button } from "@/components/ui/button";

const PULL_THRESHOLD = 42;

const ThemePullTab = () => {
  const { isMinimal, toggleTheme } = useSiteTheme();
  const startYRef = useRef<number | null>(null);
  const draggedRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const finishPull = (pointerId?: number, target?: EventTarget | null) => {
    const shouldToggle = pullDistance >= PULL_THRESHOLD;
    startYRef.current = null;
    setPullDistance(0);

    if (pointerId !== undefined && target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    if (shouldToggle) {
      draggedRef.current = true;
      toggleTheme();
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    }
  };

  return (
    <Button
      type="button"
      className="theme-pull-tab"
      aria-label={isMinimal ? "Pull to use colorful theme" : "Pull to use minimal black and white theme"}
      aria-pressed={isMinimal}
      title={isMinimal ? "Color theme" : "Minimal theme"}
      onClick={() => {
        if (!draggedRef.current) toggleTheme();
      }}
      onPointerDown={(event) => {
        startYRef.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (startYRef.current === null) return;
        const distance = Math.max(0, Math.min(68, event.clientY - startYRef.current));
        setPullDistance(distance);
      }}
      onPointerUp={(event) => finishPull(event.pointerId, event.currentTarget)}
      onPointerCancel={(event) => finishPull(event.pointerId, event.currentTarget)}
      style={{ "--pull-distance": `${pullDistance}px` } as CSSProperties}
    >
      <span className="theme-pull-tab__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="theme-pull-tab__cord" aria-hidden="true" />
      <span className="theme-pull-tab__label" aria-hidden="true">
        {isMinimal ? "COLOR" : "MONO"}
      </span>
    </Button>
  );
};

export default ThemePullTab;
