import { useEffect, useRef, useState } from "react";

/**
 * Custom glowing cursor for desktop / fine pointers.
 *
 * Glass mode:
 *   - White cursor
 *
 * Minimal / monochrome mode:
 *   - Black cursor
 *   - White cursor over dark surfaces
 *
 * The native cursor is hidden globally while the custom cursor
 * is active.
 *
 * Notion iframe:
 *   - The custom cursor remains active everywhere else.
 *   - When the pointer enters the Notion iframe, the native cursor
 *     is restored because the iframe owns its own document.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);

  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });

  const rafRef = useRef<number | null>(null);

  const visible = useRef(false);
  const pointerInsideWindow = useRef(false);
  const overNotionIframe = useRef(false);

  const styleRef = useRef<HTMLStyleElement | null>(null);
  const notionIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");

    if (!mq.matches) {
      setEnabled(false);
      return;
    }

    setEnabled(true);

    const root = document.documentElement;

    // ------------------------------------------------------------
    // Global native-cursor suppression
    // ------------------------------------------------------------

    root.classList.add("has-custom-cursor");

    const style = document.createElement("style");

    style.setAttribute("data-custom-cursor", "true");

    style.textContent = `
      html.has-custom-cursor,
      html.has-custom-cursor body,
      html.has-custom-cursor *,
      html.has-custom-cursor *::before,
      html.has-custom-cursor *::after {
        cursor: none !important;
      }

      html.has-custom-cursor iframe[title="Notion article"] {
        cursor: auto !important;
      }
    `;

    document.head.appendChild(style);
    styleRef.current = style;

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    const setCursorOpacity = (opacity: number) => {
      const cursor = cursorRef.current;

      if (!cursor) return;

      cursor.style.opacity = String(opacity);
    };

    const setCursorVisible = (nextVisible: boolean) => {
      visible.current = nextVisible;

      const cursor = cursorRef.current;

      if (!cursor) return;

      cursor.style.opacity = nextVisible && !overNotionIframe.current ? "1" : "0";
    };

    /**
     * WCAG-style relative luminance calculation.
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
     * Determines whether the actual page surface beneath the pointer
     * is sufficiently dark that a black cursor would disappear.
     *
     * Transparent layers are skipped while walking upward.
     */
    const isOverDarkSurface = (x: number, y: number) => {
      const cursor = cursorRef.current;

      if (cursor) {
        cursor.style.visibility = "hidden";
      }

      const element = document.elementFromPoint(x, y);

      if (cursor) {
        cursor.style.visibility = "";
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

            return getLuminance(r, g, b) < 0.15;
          }
        }

        current = current.parentElement;
      }

      return false;
    };

    /**
     * Returns true if the pointer coordinates currently sit inside
     * the Notion iframe.
     */
    const isPointInsideIframe = (iframe: HTMLIFrameElement, x: number, y: number) => {
      const rect = iframe.getBoundingClientRect();

      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    /**
     * Find the Notion iframe currently rendered by the application.
     */
    const getNotionIframe = () => {
      return document.querySelector('iframe[title="Notion article"]') as HTMLIFrameElement | null;
    };

    /**
     * Updates whether the custom cursor should yield control
     * to the browser/iframe cursor.
     */
    const updateIframeState = (x: number, y: number) => {
      const iframe = getNotionIframe();

      notionIframeRef.current = iframe;

      const inside = !!iframe && isPointInsideIframe(iframe, x, y);

      if (inside !== overNotionIframe.current) {
        overNotionIframe.current = inside;

        if (inside) {
          setCursorOpacity(0);
        } else if (pointerInsideWindow.current) {
          setCursorOpacity(visible.current ? 1 : 0);
        }
      }
    };

    /**
     * Updates the visual color of the cursor according to theme
     * and the surface beneath it.
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

      const x = target.current.x;
      const y = target.current.y;

      const overDarkSurface = isOverDarkSurface(x, y);

      cursor.style.color = overDarkSurface ? "#ffffff" : "#000000";
    };

    // ------------------------------------------------------------
    // Pointer events
    // ------------------------------------------------------------

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      pointerInsideWindow.current = true;

      updateIframeState(e.clientX, e.clientY);
      updateCursorColor();

      if (!visible.current) {
        setCursorVisible(true);
      }
    };

    const onEnter = () => {
      pointerInsideWindow.current = true;

      if (!overNotionIframe.current) {
        setCursorVisible(true);
        updateCursorColor();
      }
    };

    const onLeave = () => {
      pointerInsideWindow.current = false;
      setCursorVisible(false);
    };

    // ------------------------------------------------------------
    // Notion iframe handling
    // ------------------------------------------------------------

    const attachIframeListeners = () => {
      const iframe = getNotionIframe();

      notionIframeRef.current = iframe;

      if (!iframe) return;

      iframe.style.cursor = "auto";

      /**
       * Mouse events from inside an iframe do not bubble into the parent,
       * therefore explicitly hide our cursor when entering it.
       */
      iframe.addEventListener(
        "mouseenter",
        () => {
          overNotionIframe.current = true;
          setCursorOpacity(0);
        },
        { passive: true },
      );

      iframe.addEventListener(
        "mouseleave",
        () => {
          overNotionIframe.current = false;

          if (pointerInsideWindow.current) {
            setCursorOpacity(visible.current ? 1 : 0);
            updateCursorColor();
          }
        },
        { passive: true },
      );
    };

    // ------------------------------------------------------------
    // Theme observer
    // ------------------------------------------------------------

    const themeObserver = new MutationObserver(() => {
      updateCursorColor();
    });

    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // ------------------------------------------------------------
    // DOM observer
    // ------------------------------------------------------------

    const notionObserver = new MutationObserver(() => {
      attachIframeListeners();

      updateIframeState(target.current.x, target.current.y);
    });

    notionObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ------------------------------------------------------------
    // Smooth animation
    // ------------------------------------------------------------

    let previousTime = performance.now();

    const tick = (now: number) => {
      const cursor = cursorRef.current;

      const elapsed = Math.min(now - previousTime, 40);

      previousTime = now;

      /**
       * Frame-rate independent exponential smoothing.
       *
       * Faster than the previous interpolation while remaining
       * soft enough to avoid the cursor feeling robotic.
       */
      const smoothing = 1 - Math.exp(-elapsed / 28);

      pos.current.x += (target.current.x - pos.current.x) * smoothing;

      pos.current.y += (target.current.y - pos.current.y) * smoothing;

      if (cursor) {
        cursor.style.transform = `
          translate3d(
            ${pos.current.x}px,
            ${pos.current.y}px,
            0
          )
        `;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    // ------------------------------------------------------------
    // Initial state
    // ------------------------------------------------------------

    attachIframeListeners();

    updateCursorColor();

    // ------------------------------------------------------------
    // Listeners
    // ------------------------------------------------------------

    window.addEventListener("mousemove", onMove, {
      passive: true,
    });

    window.addEventListener("mouseenter", onEnter);

    window.addEventListener("mouseleave", onLeave);

    // ------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------

    return () => {
      root.classList.remove("has-custom-cursor");

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mouseleave", onLeave);

      themeObserver.disconnect();
      notionObserver.disconnect();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      if (styleRef.current?.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
      }

      styleRef.current = null;
      notionIframeRef.current = null;

      visible.current = false;
      pointerInsideWindow.current = false;
      overNotionIframe.current = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 2147483647,
        opacity: 0,
        willChange: "transform, opacity, color",
        transform: "translate3d(-100px, -100px, 0)",
        transition: "opacity 180ms ease, color 180ms ease",
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        xmlns="http://www.w3.org/2000/svg"
        className="custom-cursor-arrow"
        style={{
          display: "block",
          overflow: "visible",
        }}
      >
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
