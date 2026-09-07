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
      const ease = 1 - Math.pow(1 - 0.38, dt); // buttery trailing
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
        width="28"
        height="28"
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
        className="custom-cursor-arrow"
      >
        {/* classic arrow pointer, rounded joins, no separate stroke to avoid artifacts */}
        <path
          d="M8.2 3.6c0-1.05 1.24-1.58 1.96-.84l15.2 15.2c.72.72.2 1.96-.85 1.96h-6.3a1.8 1.8 0 0 0-1.55.87l-3.86 5.79c-.66.99-2.12.42-2.12-.8L8.2 3.6z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
