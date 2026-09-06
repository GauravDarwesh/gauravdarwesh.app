import React, { useCallback, useRef, useState } from "react";
import { useSiteTheme } from "@/components/SiteThemeProvider";

const PULL_THRESHOLD = 34;
const MAX_PULL = 52;

const ThemePullTab = () => {
  const { isMinimal, toggleTheme } = useSiteTheme();
  const [pull, setPull] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    draggedRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!startRef.current) return;
      const delta = isMobile
        ? e.clientX - startRef.current.x
        : e.clientY - startRef.current.y;
      const next = Math.max(0, Math.min(MAX_PULL, delta));
      if (next > 4) draggedRef.current = true;
      setPull(next);
    },
    [isMobile],
  );

  const finish = useCallback(() => {
    if (!startRef.current) return;
    startRef.current = null;
    const shouldToggle = pull >= PULL_THRESHOLD || !draggedRef.current;
    setPull(0);
    if (shouldToggle) toggleTheme();
  }, [pull, toggleTheme]);

  return (
    <button
      type="button"
      className="theme-pull-tab"
      style={{ ["--pull-distance" as string]: `${pull}px` }}
      aria-label={isMinimal ? "Switch to colour theme" : "Switch to monochrome theme"}
      aria-pressed={isMinimal}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => {
        startRef.current = null;
        setPull(0);
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};

export default ThemePullTab;
