import React, { useCallback, useEffect, useRef } from "react";

interface GDxPetProps {
  onEnterSearch: () => void;
  disabled?: boolean;
}

const EASE_SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_SPRING = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * GDx — tiny hand-drawn page pet.
 *
 * The important distinction in this version:
 *
 *   WORLD POSITION
 *       ↓
 *   full viewport x/y
 *       ↓
 *   CHARACTER MOTION
 *       ↓
 *   body / limbs / squash / rotation
 *
 * The pet is therefore not trapped inside a small centred strip.
 */
const GDxPet = ({ onEnterSearch, disabled = false }: GDxPetProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const limbsRef = useRef<SVGGElement | null>(null);

  // World position in viewport coordinates.
  const positionRef = useRef({ x: 0, y: 0 });

  const busyRef = useRef(true);
  const mountedRef = useRef(false);
  const reducedRef = useRef(false);

  const idleTimerRef = useRef<number | null>(null);
  const entranceTimerRef = useRef<number | null>(null);

  const breathingRef = useRef<Animation | null>(null);
  const bodyAnimationRef = useRef<Animation | null>(null);
  const limbAnimationRef = useRef<Animation | null>(null);
  const worldAnimationRef = useRef<Animation | null>(null);

  const cancel = (ref: React.MutableRefObject<Animation | null>) => {
    ref.current?.cancel();
    ref.current = null;
  };

  const animate = useCallback((element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = element.animate(keyframes, options);
    return animation.finished.catch(() => {});
  }, []);

  const viewport = useCallback(() => {
    const mobile = window.innerWidth < 640;

    return {
      width: window.innerWidth,
      height: window.innerHeight,

      // Keep GDx away from the extreme edges.
      left: mobile ? 28 : 42,
      right: mobile ? 28 : 42,

      // Don't let it walk underneath the SearchBar/navigation.
      top: mobile ? 92 : 105,

      // Leave a little breathing room at the bottom.
      bottom: mobile ? 54 : 68,
    };
  }, []);

  const bounds = useCallback(() => {
    const v = viewport();

    return {
      minX: v.left,
      maxX: Math.max(v.left, v.width - v.right - 52),

      minY: v.top,
      maxY: Math.max(v.top, v.height - v.bottom - 40),
    };
  }, [viewport]);

  const renderPosition = useCallback((x: number, y: number, rotation = 0) => {
    const el = buttonRef.current;
    if (!el) return;

    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
  }, []);

  const setPosition = useCallback(
    (x: number, y: number, rotation = 0) => {
      positionRef.current = { x, y };
      renderPosition(x, y, rotation);
    },
    [renderPosition],
  );

  const randomPosition = useCallback(() => {
    const b = bounds();

    return {
      x: rand(b.minX, b.maxX),
      y: rand(b.minY, b.maxY),
    };
  }, [bounds]);

  const startBreathing = useCallback(() => {
    const body = bodyRef.current;
    if (!body || reducedRef.current || busyRef.current) return;

    cancel(breathingRef);

    breathingRef.current = body.animate(
      [
        { transform: "translate3d(0,0,0) scale(1,1)" },
        {
          transform: "translate3d(0,-0.8px,0) scale(1.012,0.988)",
          offset: 0.45,
        },
        { transform: "translate3d(0,0,0) scale(1,1)" },
      ],
      {
        duration: 3900,
        iterations: Infinity,
        easing: EASE_IN_OUT,
      },
    );
  }, []);

  const stopBreathing = useCallback(() => {
    cancel(breathingRef);
  }, []);

  const bodyMotion = useCallback(async (keyframes: Keyframe[], duration: number, easing = EASE_SOFT) => {
    const body = bodyRef.current;
    if (!body) return;

    cancel(bodyAnimationRef);

    const animation = body.animate(keyframes, {
      duration,
      easing,
      fill: "forwards",
    });

    bodyAnimationRef.current = animation;
    await animation.finished.catch(() => {});

    if (bodyRef.current) {
      bodyRef.current.style.transform = "translate3d(0,0,0)";
    }

    bodyAnimationRef.current = null;
  }, []);

  const wiggleLimbs = useCallback(async (duration: number, amount = 5) => {
    const limbs = limbsRef.current;
    if (!limbs || reducedRef.current) return;

    cancel(limbAnimationRef);

    const animation = limbs.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${amount}deg)`, offset: 0.25 },
        { transform: `rotate(${-amount}deg)`, offset: 0.52 },
        { transform: `rotate(${amount * 0.45}deg)`, offset: 0.76 },
        { transform: "rotate(0deg)" },
      ],
      {
        duration: Math.max(280, duration),
        easing: EASE_IN_OUT,
        fill: "forwards",
      },
    );

    limbAnimationRef.current = animation;
    await animation.finished.catch(() => {});
    limbAnimationRef.current = null;
  }, []);

  /**
   * Actual world movement.
   *
   * This is the part the previous version was missing:
   * x/y are viewport coordinates, not offsets from a centred wrapper.
   */
  const walkTo = useCallback(
    async (targetX: number, targetY: number, duration: number, running = false) => {
      const el = buttonRef.current;
      if (!el) return;

      const { x: fromX, y: fromY } = positionRef.current;

      const dx = targetX - fromX;
      const dy = targetY - fromY;

      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

      const direction = dx >= 0 ? 1 : -1;
      const lean = running ? 7 : 3.5;

      cancel(worldAnimationRef);

      const animation = el.animate(
        [
          {
            transform: `translate3d(${fromX}px,${fromY}px,0) rotate(${direction}deg)`,
          },
          {
            transform: `translate3d(
              ${fromX + dx * 0.38}px,
              ${fromY + dy * 0.38 - (running ? 5 : 2)}px,
              0
            ) rotate(${direction * lean}deg)`,
            offset: 0.38,
          },
          {
            transform: `translate3d(
              ${fromX + dx * 0.72}px,
              ${fromY + dy * 0.72}px,
              0
            ) rotate(${direction * lean * 0.5}deg)`,
            offset: 0.72,
          },
          {
            transform: `translate3d(${targetX}px,${targetY}px,0) rotate(0deg)`,
          },
        ],
        {
          duration,
          easing: running ? EASE_SPRING : EASE_IN_OUT,
          fill: "forwards",
        },
      );

      worldAnimationRef.current = animation;

      positionRef.current = {
        x: targetX,
        y: targetY,
      };

      await Promise.all([
        animation.finished.catch(() => {}),
        wiggleLimbs(running ? Math.min(duration, 850) : Math.min(duration, 1100), running ? 7 : 4),
      ]);

      if (buttonRef.current) {
        renderPosition(targetX, targetY, 0);
      }

      worldAnimationRef.current = null;
    },
    [renderPosition, wiggleLimbs],
  );

  /*
   * ─────────────────────────────────────────────────────────────
   * MASTI
   * ─────────────────────────────────────────────────────────────
   */

  const lookAround = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-5deg) translateX(-1px)", offset: 0.22 },
        { transform: "rotate(0deg)", offset: 0.44 },
        { transform: "rotate(6deg) translateX(1px)", offset: 0.68 },
        { transform: "rotate(0deg)" },
      ],
      1800,
      EASE_IN_OUT,
    );
  }, [bodyMotion]);

  const hop = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const { x, y } = positionRef.current;

    await animate(
      el,
      [
        {
          transform: `translate3d(${x}px,${y}px,0) scale(1.08,0.9)`,
        },
        {
          transform: `translate3d(${x + rand(-4, 4)}px,${y - 22}px,0) scale(0.97,1.04)`,
          offset: 0.38,
        },
        {
          transform: `translate3d(${x + rand(-5, 5)}px,${y - 26}px,0) scale(1,1)`,
          offset: 0.56,
        },
        {
          transform: `translate3d(${x}px,${y}px,0) scale(1.07,0.93)`,
          offset: 0.84,
        },
        {
          transform: `translate3d(${x}px,${y}px,0) scale(1,1)`,
        },
      ],
      {
        duration: 760,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    renderPosition(x, y);
  }, [animate, renderPosition]);

  const doubleHop = useCallback(async () => {
    await hop();
    await sleep(90);
    await hop();
  }, [hop]);

  const stretch = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "scale(1,1)" },
        { transform: "translateY(1px) scale(0.92,1.08)", offset: 0.22 },
        { transform: "translateY(-2px) scale(1.06,0.94)", offset: 0.55 },
        { transform: "scale(1,1)" },
      ],
      1250,
      EASE_SPRING,
    );
  }, [bodyMotion]);

  const sit = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "translateY(0) scale(1,1)" },
        {
          transform: "translateY(3px) scale(1.055,0.91)",
          offset: 0.2,
        },
        {
          transform: "translateY(3px) scale(1.055,0.91)",
          offset: 0.82,
        },
        { transform: "translateY(0) scale(1,1)" },
      ],
      2400,
      EASE_SOFT,
    );
  }, [bodyMotion]);

  const stumble = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const { x, y } = positionRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,${y}px,0) rotate(0deg)` },
        {
          transform: `translate3d(${x + 3}px,${y + 2}px,0) rotate(-10deg)`,
          offset: 0.28,
        },
        {
          transform: `translate3d(${x + 8}px,${y + 3}px,0) rotate(13deg)`,
          offset: 0.52,
        },
        {
          transform: `translate3d(${x}px,${y - 2}px,0) rotate(-5deg)`,
          offset: 0.72,
        },
        {
          transform: `translate3d(${x}px,${y}px,0) rotate(0deg)`,
        },
      ],
      {
        duration: 1050,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    renderPosition(x, y);
  }, [animate, renderPosition]);

  const peek = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const { x, y } = positionRef.current;

    await animate(
      el,
      [
        {
          transform: `translate3d(${x}px,${y}px,0) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate3d(${x}px,${y + 10}px,0) scale(0.94)`,
          opacity: 0.35,
          offset: 0.28,
        },
        {
          transform: `translate3d(${x}px,${y - 7}px,0) scale(1.02)`,
          opacity: 1,
          offset: 0.62,
        },
        {
          transform: `translate3d(${x}px,${y}px,0) scale(1)`,
          opacity: 1,
        },
      ],
      {
        duration: 1600,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    el.style.opacity = "1";
    renderPosition(x, y);
  }, [animate, renderPosition]);

  const wander = useCallback(async () => {
    const b = bounds();

    const { x: currentX, y: currentY } = positionRef.current;

    // Prefer a meaningful distance so the movement is actually visible.
    let targetX = rand(b.minX, b.maxX);
    let targetY = rand(b.minY, b.maxY);

    let attempts = 0;

    while (Math.hypot(targetX - currentX, targetY - currentY) < 150 && attempts < 8) {
      targetX = rand(b.minX, b.maxX);
      targetY = rand(b.minY, b.maxY);
      attempts++;
    }

    const distance = Math.hypot(targetX - currentX, targetY - currentY);

    const duration = Math.max(1500, Math.min(4200, distance * 8.5));

    await walkTo(targetX, targetY, duration, false);
  }, [bounds, walkTo]);

  const run = useCallback(async () => {
    const b = bounds();
    const { x, y } = positionRef.current;

    const direction = Math.random() < 0.5 ? -1 : 1;

    let targetX = direction < 0 ? rand(b.minX, Math.max(b.minX, x - 180)) : rand(Math.min(b.maxX, x + 180), b.maxX);

    // If there isn't enough room in the chosen direction, cross the page.
    if (Math.abs(targetX - x) < 120) {
      targetX = direction < 0 ? b.minX : b.maxX;
    }

    const targetY = Math.max(b.minY, Math.min(b.maxY, y + rand(-35, 35)));

    const distance = Math.hypot(targetX - x, targetY - y);

    await walkTo(targetX, targetY, Math.max(850, Math.min(2600, distance * 4.4)), true);
  }, [bounds, walkTo]);

  const hideAndReappear = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const from = positionRef.current;
    const to = randomPosition();

    await animate(
      el,
      [
        {
          transform: `translate3d(${from.x}px,${from.y}px,0) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate3d(${from.x}px,${from.y + 8}px,0) scale(0.65)`,
          opacity: 0,
          offset: 0.28,
        },
        {
          transform: `translate3d(${to.x}px,${to.y + 8}px,0) scale(0.65)`,
          opacity: 0,
          offset: 0.72,
        },
        {
          transform: `translate3d(${to.x}px,${to.y}px,0) scale(1)`,
          opacity: 1,
        },
      ],
      {
        duration: 1900,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    positionRef.current = to;

    el.style.opacity = "1";
    renderPosition(to.x, to.y);
  }, [animate, randomPosition, renderPosition]);

  const spin = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const { x, y } = positionRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,${y}px,0) rotate(0deg)` },
        {
          transform: `translate3d(${x + 4}px,${y - 12}px,0) rotate(-20deg)`,
          offset: 0.28,
        },
        {
          transform: `translate3d(${x - 3}px,${y - 17}px,0) rotate(20deg)`,
          offset: 0.58,
        },
        {
          transform: `translate3d(${x}px,${y}px,0) rotate(0deg)`,
        },
      ],
      {
        duration: 1050,
        easing: EASE_SPRING,
        fill: "forwards",
      },
    );

    renderPosition(x, y);
  }, [animate, renderPosition]);

  const sleepMasti = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "translateY(0) scale(1,1)" },
        {
          transform: "translateY(3px) scale(1.07,0.9)",
          offset: 0.2,
        },
        {
          transform: "translateY(3px) scale(1.07,0.9) rotate(2deg)",
          offset: 0.5,
        },
        {
          transform: "translateY(3px) scale(1.07,0.9) rotate(-2deg)",
          offset: 0.78,
        },
        { transform: "translateY(0) scale(1,1)" },
      ],
      3000,
      EASE_IN_OUT,
    );
  }, [bodyMotion]);

  /*
   * Movement-heavy repertoire.
   *
   * We intentionally bias the first development version toward movement
   * because GDx should visibly inhabit the page.
   */
  const masti = useRef<Array<() => Promise<void>>>([]);

  useEffect(() => {
    // Movement is intentionally weighted more heavily during this phase.
    masti.current = [
      wander,
      wander,
      wander,
      run,
      hop,
      doubleHop,
      lookAround,
      stretch,
      sit,
      stumble,
      peek,
      hideAndReappear,
      spin,
      sleepMasti,
    ];
  }, [wander, run, hop, doubleHop, lookAround, stretch, sit, stumble, peek, hideAndReappear, spin, sleepMasti]);

  /*
   * ─────────────────────────────────────────────────────────────
   * LIFECYCLE
   * ─────────────────────────────────────────────────────────────
   */

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    mountedRef.current = true;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;

    const startIdleScheduler = () => {
      if (cancelled || document.hidden || disabled) return;

      const delay = reducedRef.current ? rand(9000, 15000) : rand(3500, 8500);

      idleTimerRef.current = window.setTimeout(async () => {
        idleTimerRef.current = null;

        if (cancelled || !mountedRef.current || disabled || busyRef.current || document.hidden) {
          startIdleScheduler();
          return;
        }

        const list = masti.current;

        if (!list.length) {
          startIdleScheduler();
          return;
        }

        busyRef.current = true;
        stopBreathing();

        const action = list[Math.floor(Math.random() * list.length)];

        try {
          await action();
        } catch {
          // Animation cancellation is harmless.
        }

        if (!cancelled && mountedRef.current) {
          busyRef.current = false;
          startBreathing();
          startIdleScheduler();
        }
      }, delay);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (idleTimerRef.current) {
          window.clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }

        cancel(worldAnimationRef);
        stopBreathing();
        return;
      }

      if (!busyRef.current && !disabled) {
        startBreathing();
        startIdleScheduler();
      }
    };

    /*
     * Start at the lower centre of the viewport.
     * This is just the initial home position — GDx is free to leave it.
     */
    const initial = bounds();

    const startX = window.innerWidth / 2 - 26;
    const startY = Math.min(initial.maxY, Math.max(initial.minY, window.innerHeight * 0.72));

    setPosition(startX, startY);

    el.style.opacity = "0";

    entranceTimerRef.current = window.setTimeout(async () => {
      if (cancelled) return;

      busyRef.current = true;

      if (reducedRef.current) {
        el.style.opacity = "1";
        setPosition(startX, startY);
      } else {
        await animate(
          el,
          [
            {
              opacity: 0,
              transform: `translate3d(${startX}px,${startY + 18}px,0) scale(0.72)`,
            },
            {
              opacity: 1,
              transform: `translate3d(${startX}px,${startY - 5}px,0) scale(1.035)`,
              offset: 0.7,
            },
            {
              opacity: 1,
              transform: `translate3d(${startX}px,${startY}px,0) scale(1)`,
            },
          ],
          {
            duration: 1150,
            easing: EASE_SOFT,
            fill: "forwards",
          },
        );

        setPosition(startX, startY);
        el.style.opacity = "1";
      }

      if (cancelled) return;

      busyRef.current = false;
      startBreathing();

      // First visible behaviour arrives relatively soon during development.
      startIdleScheduler();
    }, 3200);

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (entranceTimerRef.current) {
        window.clearTimeout(entranceTimerRef.current);
        entranceTimerRef.current = null;
      }

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      cancel(breathingRef);
      cancel(bodyAnimationRef);
      cancel(limbAnimationRef);
      cancel(worldAnimationRef);

      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [animate, bounds, disabled, setPosition, startBreathing, stopBreathing]);

  /*
   * ─────────────────────────────────────────────────────────────
   * TAP → SEARCHBAR
   * ─────────────────────────────────────────────────────────────
   *
   * This is intentionally still simple for this phase.
   * We establish the correct full-screen world first.
   */
  const handleActivate = useCallback(async () => {
    if (disabled || busyRef.current) return;

    const el = buttonRef.current;

    if (!el) {
      onEnterSearch();
      return;
    }

    busyRef.current = true;
    stopBreathing();

    const { x, y } = positionRef.current;

    if (reducedRef.current) {
      onEnterSearch();
      busyRef.current = false;
      startBreathing();
      return;
    }

    try {
      // Small anticipation.
      await animate(
        el,
        [
          {
            transform: `translate3d(${x}px,${y}px,0) scale(1,1)`,
          },
          {
            transform: `translate3d(${x}px,${y + 3}px,0) scale(1.13,0.84)`,
          },
        ],
        {
          duration: 170,
          easing: EASE_IN_OUT,
          fill: "forwards",
        },
      );

      /*
       * SearchBar target is intentionally only used here.
       * We are NOT changing SearchBar yet.
       */
      const search = document.querySelector<HTMLElement>("[data-gdx-search-target]");

      const target = search?.getBoundingClientRect();

      const targetX = target ? target.left + target.width / 2 - 26 : window.innerWidth / 2 - 26;

      const targetY = target ? target.top + target.height / 2 - 20 : 42;

      const apexX = x + (targetX - x) * 0.45;
      const apexY = Math.min(y, targetY) - Math.max(90, window.innerHeight * 0.12);

      await animate(
        el,
        [
          {
            transform: `translate3d(${x}px,${y + 3}px,0) scale(0.94,1.08)`,
          },
          {
            transform: `translate3d(${apexX}px,${apexY}px,0) rotate(8deg) scale(1,1)`,
            offset: 0.5,
          },
          {
            transform: `translate3d(${targetX}px,${targetY}px,0) scale(0.9,1.1)`,
          },
        ],
        {
          duration: 780,
          easing: EASE_SPRING,
          fill: "forwards",
        },
      );

      await animate(
        el,
        [
          {
            transform: `translate3d(${targetX}px,${targetY}px,0) scale(0.9,1.1)`,
            opacity: 1,
          },
          {
            transform: `translate3d(${targetX}px,${targetY + 4}px,0) scale(1.16,0.5)`,
            opacity: 0.5,
            offset: 0.55,
          },
          {
            transform: `translate3d(${targetX}px,${targetY + 5}px,0) scale(0.35,0.2)`,
            opacity: 0,
          },
        ],
        {
          duration: 280,
          easing: EASE_IN,
          fill: "forwards",
        },
      );

      onEnterSearch();

      window.setTimeout(() => {
        if (!mountedRef.current) return;

        el.style.opacity = "0";
        el.style.transform = `translate3d(${x}px,${y + 12}px,0) scale(0.7)`;

        el.animate(
          [
            {
              opacity: 0,
              transform: `translate3d(${x}px,${y + 12}px,0) scale(0.7)`,
            },
            {
              opacity: 1,
              transform: `translate3d(${x}px,${y}px,0) scale(1)`,
            },
          ],
          {
            duration: 850,
            easing: EASE_SOFT,
            fill: "forwards",
          },
        );

        positionRef.current = { x, y };
        el.style.opacity = "1";
        renderPosition(x, y);

        busyRef.current = false;
        startBreathing();
      }, 1150);
    } catch {
      if (!mountedRef.current) return;

      el.style.opacity = "1";
      renderPosition(x, y);
      busyRef.current = false;
      startBreathing();
    }
  }, [animate, disabled, onEnterSearch, renderPosition, startBreathing, stopBreathing]);

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-0 z-30"
      style={{
        contain: "layout paint",
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleActivate}
        aria-label="Talk to GDx"
        disabled={disabled}
        className="pointer-events-auto absolute cursor-pointer border-0 bg-transparent p-2 opacity-0 will-change-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full"
        style={{
          left: 0,
          top: 0,
          touchAction: "manipulation",
        }}
      >
        <span
          ref={bodyRef}
          className="block will-change-transform"
          style={{
            transformOrigin: "50% 72%",
          }}
        >
          <svg
            width="52"
            height="40"
            viewBox="0 0 52 40"
            fill="none"
            className="select-none overflow-visible"
            aria-hidden="true"
            style={{
              filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.18))",
            }}
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

              {/* thin, imperfect limbs */}
              <g
                ref={limbsRef}
                style={{
                  transformOrigin: "22px 20px",
                }}
              >
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
