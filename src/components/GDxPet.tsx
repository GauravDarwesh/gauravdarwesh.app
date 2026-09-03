import React, { useCallback, useEffect, useRef } from "react";

interface GDxPetProps {
  onEnterSearch: () => void;
  disabled?: boolean;
}

/** Easing curves — soft, spring-like, never linear. */
const EASE_SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_INOUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * GDx — a tiny hand-drawn doodle creature that lives on the homepage.
 * All animation is imperative (Web Animations API) so React never re-renders
 * during motion.
 */
const GDxPet = ({ onEnterSearch, disabled = false }: GDxPetProps) => {
  const wrapRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const limbsRef = useRef<SVGGElement | null>(null);

  const xRef = useRef(0); // horizontal offset from home, px
  const busyRef = useRef(true); // busy until the entrance completes
  const idleAnimRef = useRef<Animation | null>(null);
  const timerRef = useRef<number | null>(null);
  const reduced = useRef(false);

  /** continuous soft breathing while idle */
  const startBreathing = useCallback(() => {
    const el = bodyRef.current;
    if (!el || reduced.current) return;
    idleAnimRef.current?.cancel();
    idleAnimRef.current = el.animate(
      [
        { transform: "translateY(0px) scale(1, 1)" },
        { transform: "translateY(-1.2px) scale(1.015, 0.985)" },
        { transform: "translateY(0px) scale(1, 1)" },
      ],
      { duration: 3600, iterations: Infinity, easing: EASE_INOUT }
    );
  }, []);

  const stopBreathing = useCallback(() => {
    idleAnimRef.current?.cancel();
    idleAnimRef.current = null;
  }, []);

  const move = useCallback((x: number, y: number, duration: number, easing = EASE_SOFT) => {
    const el = wrapRef.current;
    if (!el) return Promise.resolve();
    const from = el.style.transform || `translate3d(${xRef.current}px, 0px, 0)`;
    const to = `translate3d(${x}px, ${y}px, 0)`;
    const a = el.animate([{ transform: from }, { transform: to }], {
      duration,
      easing,
      fill: "forwards",
    });
    el.style.transform = to;
    xRef.current = x;
    return a.finished.catch(() => {});
  }, []);

  /** the small repertoire of idle behaviours */
  const behaviours = useRef<Array<() => Promise<void>>>([]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wrap = () => wrapRef.current;
    const body = () => bodyRef.current;
    const limbs = () => limbsRef.current;

    const wiggleLimbs = (duration: number) => {
      const el = limbs();
      if (!el || reduced.current) return;
      el.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(5deg)" },
          { transform: "rotate(-5deg)" },
          { transform: "rotate(0deg)" },
        ],
        { duration: Math.max(320, duration / 3), iterations: Math.max(1, Math.round(duration / 320)), easing: EASE_INOUT }
      );
    };

    const bodyKeys = (keys: Keyframe[], duration: number, easing = EASE_SOFT) => {
      const el = body();
      if (!el) return Promise.resolve();
      const a = el.animate(keys, { duration, easing });
      return a.finished.catch(() => {});
    };

    const clampX = (x: number) => {
      const limit = Math.min(220, window.innerWidth / 2 - 60);
      return Math.max(-limit, Math.min(limit, x));
    };

    const lookAround = async () => {
      await bodyKeys(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-7deg) translateX(-2px)" },
          { transform: "rotate(0deg)" },
          { transform: "rotate(7deg) translateX(2px)" },
          { transform: "rotate(0deg)" },
        ],
        2200,
        EASE_INOUT
      );
    };

    const walk = async () => {
      const target = clampX(xRef.current + rand(-90, 90));
      const dur = Math.max(900, Math.abs(target - xRef.current) * 16);
      wiggleLimbs(dur);
      await move(target, 0, dur, EASE_INOUT);
    };

    const run = async () => {
      const target = clampX(xRef.current + (Math.random() < 0.5 ? -1 : 1) * rand(140, 220));
      const dur = Math.max(650, Math.abs(target - xRef.current) * 6);
      wiggleLimbs(dur);
      await move(target, 0, dur, EASE_INOUT);
    };

    const jump = async () => {
      const el = wrap();
      if (!el) return;
      const x = xRef.current;
      const a = el.animate(
        [
          { transform: `translate3d(${x}px, 0px, 0) scale(1.06, 0.94)` },
          { transform: `translate3d(${x}px, -26px, 0) scale(0.96, 1.05)`, offset: 0.45 },
          { transform: `translate3d(${x}px, 0px, 0) scale(1.08, 0.92)`, offset: 0.85 },
          { transform: `translate3d(${x}px, 0px, 0) scale(1, 1)` },
        ],
        { duration: 900, easing: EASE_SOFT }
      );
      await a.finished.catch(() => {});
    };

    const sit = async () => {
      await bodyKeys(
        [
          { transform: "translateY(0) scale(1,1)" },
          { transform: "translateY(3px) scale(1.06, 0.9)", offset: 0.2 },
          { transform: "translateY(3px) scale(1.06, 0.9)", offset: 0.8 },
          { transform: "translateY(0) scale(1,1)" },
        ],
        2600,
        EASE_SOFT
      );
    };

    const peek = async () => {
      const el = wrap();
      if (!el) return;
      const x = xRef.current;
      const a = el.animate(
        [
          { transform: `translate3d(${x}px, 0px, 0)`, opacity: 1 },
          { transform: `translate3d(${x}px, 14px, 0)`, opacity: 0.35, offset: 0.25 },
          { transform: `translate3d(${x}px, -6px, 0)`, opacity: 1, offset: 0.6 },
          { transform: `translate3d(${x}px, 0px, 0)`, opacity: 1 },
        ],
        { duration: 1800, easing: EASE_SOFT }
      );
      await a.finished.catch(() => {});
    };

    const climb = async () => {
      const el = wrap();
      if (!el) return;
      const x = xRef.current;
      const a = el.animate(
        [
          { transform: `translate3d(${x}px, 0px, 0)` },
          { transform: `translate3d(${x}px, -20px, 0) rotate(-4deg)`, offset: 0.35 },
          { transform: `translate3d(${x + 14}px, -34px, 0) rotate(0deg)`, offset: 0.6 },
          { transform: `translate3d(${x + 14}px, -34px, 0)`, offset: 0.8 },
          { transform: `translate3d(${x}px, 0px, 0)` },
        ],
        { duration: 2600, easing: EASE_SOFT }
      );
      await a.finished.catch(() => {});
    };

    const hang = async () => {
      const el = wrap();
      if (!el) return;
      const x = xRef.current;
      const a = el.animate(
        [
          { transform: `translate3d(${x}px, 0px, 0) rotate(0deg)` },
          { transform: `translate3d(${x}px, -18px, 0) rotate(168deg)`, offset: 0.35 },
          { transform: `translate3d(${x}px, -14px, 0) rotate(174deg)`, offset: 0.65 },
          { transform: `translate3d(${x}px, 0px, 0) rotate(0deg)` },
        ],
        { duration: 3000, easing: EASE_SOFT }
      );
      await a.finished.catch(() => {});
    };

    const hideAndReappear = async () => {
      const el = wrap();
      if (!el) return;
      const x = xRef.current;
      const nx = clampX(x + rand(-120, 120));
      const a = el.animate(
        [
          { transform: `translate3d(${x}px, 0px, 0) scale(1)`, opacity: 1 },
          { transform: `translate3d(${x}px, 6px, 0) scale(0.6)`, opacity: 0, offset: 0.35 },
          { transform: `translate3d(${nx}px, 6px, 0) scale(0.6)`, opacity: 0, offset: 0.6 },
          { transform: `translate3d(${nx}px, 0px, 0) scale(1)`, opacity: 1 },
        ],
        { duration: 2400, easing: EASE_SOFT, fill: "forwards" }
      );
      el.style.transform = `translate3d(${nx}px, 0px, 0)`;
      xRef.current = nx;
      await a.finished.catch(() => {});
    };

    behaviours.current = [lookAround, walk, run, jump, sit, peek, climb, hang, hideAndReappear];
  }, [move]);

  /** entrance + randomized idle scheduler */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      timerRef.current = window.setTimeout(async () => {
        if (cancelled) return;
        if (!busyRef.current && !disabled && !reduced.current && !document.hidden) {
          busyRef.current = true;
          stopBreathing();
          const list = behaviours.current;
          const pick = list[Math.floor(Math.random() * list.length)];
          try {
            await pick();
          } catch {
            /* noop */
          }
          if (!cancelled) {
            busyRef.current = false;
            startBreathing();
          }
        }
        schedule();
      }, rand(8000, 14000));
    };

    // stay hidden through the existing 3s page entrance, then emerge
    const entrance = window.setTimeout(async () => {
      if (cancelled) return;
      const a = el.animate(
        [
          { opacity: 0, transform: "translate3d(0px, 18px, 0) scale(0.7)" },
          { opacity: 1, transform: "translate3d(0px, -6px, 0) scale(1.04)", offset: 0.65 },
          { opacity: 1, transform: "translate3d(0px, 0px, 0) scale(1)" },
        ],
        { duration: reduced.current ? 400 : 1400, easing: EASE_SOFT, fill: "forwards" }
      );
      el.style.opacity = "1";
      el.style.transform = "translate3d(0px, 0px, 0)";
      await a.finished.catch(() => {});
      if (cancelled) return;
      busyRef.current = false;
      startBreathing();
    }, 3400);

    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(entrance);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      stopBreathing();
    };
  }, [disabled, startBreathing, stopBreathing]);

  /** click: anticipation → arc jump into the SearchBar → absorb → callback */
  const handleActivate = useCallback(async () => {
    if (disabled || busyRef.current) return;
    busyRef.current = true;
    stopBreathing();

    const el = wrapRef.current;
    if (!el) {
      onEnterSearch();
      return;
    }

    const rect = el.getBoundingClientRect();
    const searchEl = document.querySelector<HTMLElement>("[data-gdx-search-target]");
    const target = searchEl?.getBoundingClientRect();
    const targetX = (target ? target.left + target.width / 2 : window.innerWidth / 2) - (rect.left + rect.width / 2);
    const targetY = (target ? target.top + target.height / 2 : 40) - (rect.top + rect.height / 2);
    const x0 = xRef.current;

    // 1. anticipation squash
    await el
      .animate(
        [
          { transform: `translate3d(${x0}px, 0px, 0) scale(1, 1)` },
          { transform: `translate3d(${x0}px, 3px, 0) scale(1.14, 0.84)` },
        ],
        { duration: 180, easing: EASE_INOUT, fill: "forwards" }
      )
      .finished.catch(() => {});

    // 2. parabolic arc toward the search bar (rise fast, fall accelerating)
    const apexX = x0 + (targetX + x0) * 0.35;
    const apexY = Math.min(targetY, 0) - 90;
    await el
      .animate(
        [
          { transform: `translate3d(${x0}px, 3px, 0) scale(0.94, 1.1)`, easing: "cubic-bezier(0.16, 0.9, 0.3, 1)" },
          { transform: `translate3d(${apexX}px, ${apexY}px, 0) scale(1, 1) rotate(8deg)`, offset: 0.55, easing: EASE_IN },
          { transform: `translate3d(${x0 + targetX}px, ${targetY}px, 0) scale(0.9, 1.12) rotate(0deg)` },
        ],
        { duration: 720, fill: "forwards" }
      )
      .finished.catch(() => {});

    // 3. absorption into the bar
    await el
      .animate(
        [
          { transform: `translate3d(${x0 + targetX}px, ${targetY}px, 0) scale(0.9, 1.12)`, opacity: 1 },
          { transform: `translate3d(${x0 + targetX}px, ${targetY + 4}px, 0) scale(1.2, 0.5)`, opacity: 0.5, offset: 0.6 },
          { transform: `translate3d(${x0 + targetX}px, ${targetY + 6}px, 0) scale(0.4, 0.2)`, opacity: 0 },
        ],
        { duration: 300, easing: EASE_IN, fill: "forwards" }
      )
      .finished.catch(() => {});

    onEnterSearch();

    // return home, softly
    window.setTimeout(() => {
      const node = wrapRef.current;
      if (!node) return;
      node.style.transform = `translate3d(${x0}px, 0px, 0)`;
      node.animate(
        [
          { opacity: 0, transform: `translate3d(${x0}px, 14px, 0) scale(0.6)` },
          { opacity: 1, transform: `translate3d(${x0}px, 0px, 0) scale(1)` },
        ],
        { duration: 900, easing: EASE_SOFT, fill: "forwards" }
      );
      node.style.opacity = "1";
      busyRef.current = false;
      startBreathing();
    }, 1400);
  }, [disabled, onEnterSearch, startBreathing, stopBreathing]);

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-x-0 bottom-[14vh] z-30 flex justify-center"
      style={{ contain: "layout paint" }}
    >
      <button
        ref={wrapRef}
        type="button"
        onClick={handleActivate}
        aria-label="GDx"
        className="pointer-events-auto bg-transparent border-0 p-2 cursor-pointer opacity-0 will-change-transform focus:outline-none"
        style={{ transform: "translate3d(0px, 18px, 0)" }}
      >
        <span ref={bodyRef} className="block will-change-transform">
          <svg
            width="52"
            height="40"
            viewBox="0 0 52 40"
            fill="none"
            className="overflow-visible select-none"
            style={{ filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.18))" }}
          >
            <g
              stroke="currentColor"
              className="text-white/85"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              {/* G */}
              <path d="M14.6 8.2c-2.6-2.4-8.6-1.9-9.7 3.1-1 4.6 1.4 8.4 5.2 8.4 3 0 4.6-1.9 4.7-4.4h-3.4" />
              {/* D */}
              <path d="M19.6 5.9c0 4.6.1 9.2.2 13.7 4.4.5 7.8-1.7 7.9-6.6.1-4.7-3.3-7.4-8.1-7.1" />
              {/* x */}
              <path d="M32.4 12.1c2.2 2.5 4.3 5 6.4 7.5M38.9 12c-2.2 2.6-4.3 5.1-6.4 7.6" />
              {/* limbs — thin, imperfect */}
              <g ref={limbsRef} style={{ transformOrigin: "22px 20px" }}>
                <path d="M5.6 15.4c-2.3.9-3.6 2-4.4 3.6" />
                <path d="M40.8 15c2.4.6 3.9 1.6 5 3.1" />
                <path d="M17.4 21.6c-.6 3.6-1.2 6.1-2.3 8.2M15.1 29.8c-1.3.6-2.3 1.1-3.4 1.3" />
                <path d="M28.6 21.8c.5 3.5 1.1 6 2.2 8.1M30.8 29.9c1.3.6 2.4 1 3.5 1.1" />
              </g>
            </g>
          </svg>
        </span>
      </button>
    </div>
  );
};

export default GDxPet;
