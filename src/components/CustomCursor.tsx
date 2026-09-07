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
  const lastMouse = useRef({ x: -100, y: -100 });

  useEffect(() => {
    // Only for fine (mouse/trackpad) pointers
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      lastMouse.current.x = e.clientX;
      lastMouse.current.y = e.clientY;
      if (!visible.current && cursorRef.current) {
        visible.current = true;
        cursorRef.current.style.opacity = "1";
      }
    };

    // During scroll the mouse doesn't move, but the page does.
    // Keep the custom cursor glued to the same page point so it
    // never desyncs — and keep the native cursor suppressed.
    const onScroll = () => {
      target.current.x = lastMouse.current.x;
      target.current.y = lastMouse.current.y;
      pos.current.x = lastMouse.current.x;
      pos.current.y = lastMouse.current.y;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
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
        width="26"
        height="26"
        viewBox="0 0 26 26"
        xmlns="http://www.w3.org/2000/svg"
        className="custom-cursor-arrow"
      >
        {/* classic arrow pointer with fully rounded corners, single fill = no artifacts */}
        <path
          d="M7.1 2.2c-.04-1.06 1.14-1.63 1.86-.81l13.9 14.1c.73.74.2 1.95-.85 1.97h-5.35c-.5.01-.98.22-1.31.58l-3.6 3.7c-.69.7-1.88.22-1.87-.79L7.1 2.2z"
          fill="currentColor"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CustomCursor;
