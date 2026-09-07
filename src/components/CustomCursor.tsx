import { useEffect, useRef, useState } from "react";

/**
 * Custom glowing cursor for desktop pointers.
 *
 * Glass mode:
 *   - White cursor
 *
 * Minimal / monochrome mode:
 *   - Black cursor
 *   - White cursor when hovering over a dark/black surface
 *
 * Disabled for touch devices.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const visible = useRef(false);
  const hasPointerPosition = useRef(false);

  useEffect(() => {
    // Only enable for fine pointers such as mouse / trackpad
    const mq = window.matchMedia("(pointer: fine)");

    if (!mq.matches) return;

    setEnabled(true);

    const root = document.documentElement;

    root.classList.add("has-custom-cursor");

    // Hide the native cursor everywhere while the custom cursor is active.
    // This prevents the native cursor from appearing during fast scrolling
    // or while moving across different elements on macOS.
    const style = document.createElement("style");

    style.setAttribute("data-custom-cursor", "true");

    style.textContent = `
      html.has-custom-cursor,
      html.has-custom-cursor *,
      html.has-custom-cursor *::before,
      html.has-custom-cursor *::after {
        cursor: none !important;
      }
    `;

    document.head.appendChild(style);

    /**
     * Get the background luminance of a color.
     * Lower luminance = darker color.
     */
    const getLuminance = (r: number, g: number, b: number) => {
      const rs = r / 255;
      const gs = g / 255;
      const bs = b / 255;

      const rLinear = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);

      const gLinear = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);

      const bLinear = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    };

    /**
     * Returns true when the pointer is over a dark/black surface.
     *
     * Transparent elements are skipped so the function can continue
     * looking up the DOM tree for the actual visible background.
     */
    const isOverDarkSurface = (x: number, y: number) => {
      const cursor = cursorRef.current;

      // Prevent the custom cursor itself from being detected.
      if (cursor) {
        cursor.style.visibility = "hidden";
      }

      const element = document.elementFromPoint(x, y);

      if (cursor) {
        cursor.style.visibility = "visible";
      }

      if (!element) return false;

      let current: Element | null = element;

      while (current) {
        const styles = window.getComputedStyle(current);
        const background = styles.backgroundColor;

        if (background && background !== "transparent" && background !== "rgba(0, 0, 0, 0)") {
          const match = background.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);

          if (match) {
            const r = Number(match[1]);
            const g = Number(match[2]);
            const b = Number(match[3]);

            const luminance = getLuminance(r, g, b);

            // Dark enough that a black cursor would be difficult to see.
            return luminance < 0.15;
          }
        }

        current = current.parentElement;
      }

      return false;
    };

    /**
     * Update the cursor color according to the actual site theme.
     *
     * SiteThemeProvider sets:
     *   data-theme="glass"
     *   data-theme="minimal"
     */
    const updateCursorColor = () => {
      const cursor = cursorRef.current;

      if (!cursor) return;

      const isMinimal = root.dataset.theme === "minimal";

      // Glass mode is always white.
      if (!isMinimal) {
        cursor.style.color = "#ffffff";
        return;
      }

      // Minimal mode is black unless the pointer is directly
      // over a dark surface.
      const overDarkSurface = isOverDarkSurface(target.current.x, target.current.y);

      cursor.style.color = overDarkSurface ? "#ffffff" : "#000000";
    };

    /**
     * Temporarily hand control back to the native cursor when the
     * pointer enters a cross-origin iframe such as the Notion article.
     *
     * The iframe has its own document, so mousemove events inside it
     * cannot be tracked by this parent page.
     */
    const hideCustomCursor = () => {
      visible.current = false;
      hasPointerPosition.current = false;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "0";
      }
    };

    const showCustomCursor = () => {
      if (!hasPointerPosition.current) return;

      visible.current = true;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "1";
        updateCursorColor();
      }
    };

    /**
     * Attach the clean cursor handoff to an iframe.
     *
     * This does not attempt to access the iframe's document, which would
     * violate the browser's same-origin boundary for the Notion iframe.
     */
    const attachIframeBoundary = (iframe: HTMLIFrameElement) => {
      iframe.addEventListener("mouseenter", hideCustomCursor);
      iframe.addEventListener("mouseleave", showCustomCursor);

      return () => {
        iframe.removeEventListener("mouseenter", hideCustomCursor);
        iframe.removeEventListener("mouseleave", showCustomCursor);
      };
    };

    const iframeCleanups = new Map<HTMLIFrameElement, () => void>();

    const attachExistingIframes = () => {
      document.querySelectorAll("iframe").forEach((iframe) => {
        if (!iframeCleanups.has(iframe)) {
          iframeCleanups.set(iframe, attachIframeBoundary(iframe));
        }
      });
    };

    attachExistingIframes();

    /**
     * Watch for dynamically mounted iframes such as the Notion modal.
     */
    const iframeObserver = new MutationObserver(() => {
      attachExistingIframes();
    });

    iframeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      /*
       * On the first real pointer event, place the rendered cursor
       * directly at the pointer before starting the smooth animation.
       *
       * This prevents the cursor from visually popping in from an old
       * position when returning from an iframe or when the page first loads.
       */
      if (!hasPointerPosition.current) {
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;

        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }

        hasPointerPosition.current = true;
      }

      updateCursorColor();

      if (!visible.current && cursorRef.current) {
        visible.current = true;
        cursorRef.current.style.opacity = "1";
      }
    };

    const onLeave = () => {
      visible.current = false;
      hasPointerPosition.current = false;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "0";
      }
    };

    const onEnter = () => {
      /*
       * Do not show the cursor until a fresh mouse position is received.
       * This prevents it from appearing at a stale position immediately
       * after crossing a page/iframe boundary.
       */
      if (!hasPointerPosition.current) return;

      visible.current = true;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "1";
        updateCursorColor();
      }
    };

    /**
     * Watch the data-theme attribute used by SiteThemeProvider.
     *
     * This makes the cursor immediately switch between:
     *   glass -> white
     *   minimal -> black/white depending on surface
     */
    const observer = new MutationObserver(() => {
      updateCursorColor();
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Smooth easing loop with time-delta independence.
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.667, 3);

      last = now;

      /*
       * Smooth exponential interpolation.
       *
       * Using a delta-time based interpolation keeps the cursor movement
       * consistent across different refresh rates and avoids the visible
       * stepping/jumping that can happen with frame-dependent movement.
       */
      const ease = 1 - Math.pow(1 - 0.45, dt);

      pos.current.x += (target.current.x - pos.current.x) * ease;
      pos.current.y += (target.current.y - pos.current.y) * ease;

      if (cursorRef.current && hasPointerPosition.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });

    root.addEventListener("mouseleave", onLeave);

    root.addEventListener("mouseenter", onEnter);

    // Set the correct initial color.
    updateCursorColor();

    return () => {
      root.classList.remove("has-custom-cursor");

      window.removeEventListener("mousemove", onMove);

      root.removeEventListener("mouseleave", onLeave);

      cancelAnimationFrame(rafRef.current);

      observer.disconnect();

      iframeObserver.disconnect();

      iframeCleanups.forEach((cleanup) => cleanup());
      iframeCleanups.clear();

      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      aria-hidden="true"
      style={{
        pointerEvents: "none",
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        xmlns="http://www.w3.org/2000/svg"
        className="custom-cursor-arrow"
      >
        {/* Original cursor shape — unchanged */}
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
