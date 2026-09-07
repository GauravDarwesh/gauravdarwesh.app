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
 *
 * When the Notion iframe exists:
 *   - The custom cursor is completely disabled.
 *   - The browser's native cursor is restored everywhere.
 *   - This remains active for the entire Notion interaction.
 *
 * Once the Notion iframe is removed:
 *   - The custom cursor is restored.
 */
const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);
  const visible = useRef(false);

  useEffect(() => {
    // Only enable for fine pointers such as mouse / trackpad
    const mq = window.matchMedia("(pointer: fine)");

    if (!mq.matches) return;

    setEnabled(true);

    const root = document.documentElement;

    /**
     * Enable / disable the global custom-cursor mode.
     *
     * When disabled, the native browser cursor is restored.
     */
    const setCustomCursorMode = (active: boolean) => {
      if (active) {
        root.classList.add("has-custom-cursor");
      } else {
        root.classList.remove("has-custom-cursor");

        visible.current = false;

        if (cursorRef.current) {
          cursorRef.current.style.opacity = "0";
        }
      }
    };

    // ------------------------------------------------------------
    // Native cursor suppression
    // ------------------------------------------------------------

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
     *
     * NOTE: this is only ever called while custom-cursor mode is
     * active (i.e. Notion is confirmed absent), so it no longer
     * needs to re-check for the iframe itself.
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

    // ------------------------------------------------------------
    // Notion iframe detection
    // ------------------------------------------------------------

    const NOTION_SELECTOR = 'iframe[title="Notion article"]';

    // Tracks the last known presence of the Notion iframe so we can
    // ignore unrelated DOM mutations (route changes, button state,
    // scroll-driven class toggles, etc.) and only react to a real
    // open/close transition. Reacting to every mutation was the
    // cause of the cursor flicker on button clicks / scrolling.
    let notionActive = false;

    const applyNotionState = (hasNotion: boolean) => {
      if (hasNotion === notionActive) return;

      notionActive = hasNotion;

      if (hasNotion) {
        setCustomCursorMode(false);
      } else {
        setCustomCursorMode(true);

        // Start hidden until the next mouse movement, since we
        // don't know if the pointer is still over the page/at a
        // valid position after Notion closes.
        visible.current = false;

        if (cursorRef.current) {
          cursorRef.current.style.opacity = "0";
        }

        updateCursorColor();
      }
    };

    const checkNotion = () => {
      applyNotionState(!!document.querySelector(NOTION_SELECTOR));
    };

    // Coalesce bursts of mutations (a route change can fire dozens)
    // into a single check per animation frame instead of one check
    // per mutation record.
    let notionCheckRaf = 0;

    const scheduleNotionCheck = () => {
      if (notionCheckRaf) return;

      notionCheckRaf = requestAnimationFrame(() => {
        notionCheckRaf = 0;
        checkNotion();
      });
    };

    const notionObserver = new MutationObserver(scheduleNotionCheck);

    notionObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ------------------------------------------------------------
    // Pointer events
    // ------------------------------------------------------------

    const onMove = (e: MouseEvent) => {
      // If Notion is open, native cursor mode is active — don't
      // update the custom cursor at all.
      if (notionActive) {
        return;
      }

      target.current.x = e.clientX;
      target.current.y = e.clientY;

      updateCursorColor();

      if (!visible.current && cursorRef.current) {
        visible.current = true;

        cursorRef.current.style.opacity = "1";
      }
    };

    const onLeave = () => {
      visible.current = false;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "0";
      }
    };

    const onEnter = () => {
      if (notionActive) {
        return;
      }

      visible.current = true;

      if (cursorRef.current) {
        cursorRef.current.style.opacity = "1";

        updateCursorColor();
      }
    };

    // ------------------------------------------------------------
    // Theme observer
    // ------------------------------------------------------------

    const themeObserver = new MutationObserver(() => {
      if (!notionActive) {
        updateCursorColor();
      }
    });

    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // ------------------------------------------------------------
    // Very smooth easing loop
    // ------------------------------------------------------------

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.667, 3);

      last = now;

      const ease = 1 - Math.pow(1 - 0.38, dt);

      pos.current.x += (target.current.x - pos.current.x) * ease;

      pos.current.y += (target.current.y - pos.current.y) * ease;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove, { passive: true });

    root.addEventListener("mouseleave", onLeave);

    root.addEventListener("mouseenter", onEnter);

    // ------------------------------------------------------------
    // Initial state
    // ------------------------------------------------------------

    checkNotion();

    // ------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------

    return () => {
      root.classList.remove("has-custom-cursor");

      window.removeEventListener("mousemove", onMove);

      root.removeEventListener("mouseleave", onLeave);

      root.removeEventListener("mouseenter", onEnter);

      cancelAnimationFrame(rafRef.current);

      if (notionCheckRaf) {
        cancelAnimationFrame(notionCheckRaf);
      }

      themeObserver.disconnect();
      notionObserver.disconnect();

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
