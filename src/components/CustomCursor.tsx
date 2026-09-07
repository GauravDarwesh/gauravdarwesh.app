import { useEffect, useRef, useState } from "react";

/**
 * Custom glowing white cursor for desktop pointers.
 * Follows the mouse with a soft, fluid lag for a very smooth feel.
 * Disabled for touch devices.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const visible = useRef(false);

  useEffect(() => {
    // Only for fine (mouse/trackpad) pointers
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!visible.current && cursorRef.current) {
        visible.current = true;
        cursorRef.current.style.opacity = "1";
      }
    };

    const onLeave = () => {
      visible.current = false;
      if (cursorRef.current) cursorRef.current.style.opacity = "0";
    };

    const onEnter = () => {
      visible.current = true;
      if (cursorRef.current) cursorRef.current.style.opacity = "1";
    };

    // Very smooth easing loop (lerp) + time-delta independent
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.667, 3); // normalize to 60fps steps
      last = now;
      const ease = 1 - Math.pow(1 - 0.22, dt); // buttery trailing
      pos.current.x += (target.current.x - pos.current.x) * ease;
      pos.current.y += (target.current.y - pos.current.y) * ease;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="custom-cursor-arrow"
      >
        <path
          d="M5 3.5c0-.9 1.06-1.36 1.68-.72l13.06 13.06c.62.62.16 1.68-.72 1.68h-5.48c-.5 0-.98.2-1.33.55l-3.4 3.4c-.65.65-1.81.19-1.81-.73V3.5z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
