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

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * GDx
 *
 * A tiny hand-drawn page pet.
 *
 * Important implementation rules:
 * - Animation is imperative. React is never used as an animation clock.
 * - GDx mostly does nothing.
 * - Every "masti" is short and returns to a calm idle state.
 * - The outer layer never captures pointer events.
 * - No layout is changed by animation.
 */
const GDxPet = ({ onEnterSearch, disabled = false }: GDxPetProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const limbsRef = useRef<SVGGElement | null>(null);

  const xRef = useRef(0);
  const busyRef = useRef(true);
  const destroyedRef = useRef(false);
  const reducedRef = useRef(false);

  const idleTimerRef = useRef<number | null>(null);
  const entranceTimerRef = useRef<number | null>(null);

  const breathingRef = useRef<Animation | null>(null);
  const limbAnimationRef = useRef<Animation | null>(null);

  const cancelAnimation = (ref: React.MutableRefObject<Animation | null>) => {
    ref.current?.cancel();
    ref.current = null;
  };

  const animate = useCallback((el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const animation = el.animate(keyframes, options);
    return animation.finished.catch(() => {});
  }, []);

  const setPosition = useCallback((x: number, y = 0, rotation = 0) => {
    const el = buttonRef.current;
    if (!el) return;

    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    xRef.current = x;
  }, []);

  const clampX = useCallback((x: number) => {
    const horizontalPadding = window.innerWidth < 640 ? 48 : 72;
    const limit = Math.min(230, Math.max(90, window.innerWidth / 2 - horizontalPadding));
    return Math.max(-limit, Math.min(limit, x));
  }, []);

  const startBreathing = useCallback(() => {
    const body = bodyRef.current;
    if (!body || reducedRef.current || busyRef.current) return;

    cancelAnimation(breathingRef);

    breathingRef.current = body.animate(
      [
        { transform: "translate3d(0,0,0) scale(1,1)" },
        {
          transform: "translate3d(0,-0.9px,0) scale(1.012,0.988)",
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
    cancelAnimation(breathingRef);
  }, []);

  const bodyMotion = useCallback(
    async (keyframes: Keyframe[], duration: number, easing = EASE_SOFT) => {
      const body = bodyRef.current;
      if (!body) return;

      await animate(body, keyframes, {
        duration,
        easing,
        fill: "forwards",
      });

      // Keep the resting state clean after the animation.
      body.style.transform = "translate3d(0,0,0)";
    },
    [animate],
  );

  const limbWiggle = useCallback(async (duration: number, amount = 5) => {
    const limbs = limbsRef.current;
    if (!limbs || reducedRef.current) return;

    cancelAnimation(limbAnimationRef);

    const animation = limbs.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${amount}deg)`, offset: 0.25 },
        { transform: `rotate(${-amount}deg)`, offset: 0.55 },
        { transform: `rotate(${amount * 0.55}deg)`, offset: 0.78 },
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
  }, []);

  const moveTo = useCallback(
    async (targetX: number, duration: number, running = false) => {
      const el = buttonRef.current;
      if (!el) return;

      const fromX = xRef.current;
      const distance = targetX - fromX;

      if (Math.abs(distance) < 2) return;

      const direction = distance >= 0 ? 1 : -1;
      const lean = running ? 9 : 5;

      const animation = el.animate(
        [
          {
            transform: `translate3d(${fromX}px,0,0) rotate(${direction * 1}deg)`,
          },
          {
            transform: `translate3d(${fromX + distance * 0.45}px,-1px,0) rotate(${direction * lean}deg)`,
            offset: 0.45,
          },
          {
            transform: `translate3d(${targetX}px,0,0) rotate(${direction * 1}deg)`,
          },
        ],
        {
          duration,
          easing: running ? EASE_SPRING : EASE_IN_OUT,
          fill: "forwards",
        },
      );

      xRef.current = targetX;

      await Promise.all([animation.finished.catch(() => {}), limbWiggle(Math.min(duration, 700), running ? 7 : 4)]);

      el.style.transform = `translate3d(${targetX}px,0,0)`;
    },
    [limbWiggle],
  );

  /*
   * ─────────────────────────────────────────────────────────────
   * MASTI REPERTOIRE
   * ─────────────────────────────────────────────────────────────
   */

  const lookAround = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-5deg) translateX(-1px)", offset: 0.22 },
        { transform: "rotate(0deg)", offset: 0.43 },
        { transform: "rotate(6deg) translateX(1px)", offset: 0.67 },
        { transform: "rotate(0deg)" },
      ],
      1900,
      EASE_IN_OUT,
    );
  }, [bodyMotion]);

  const tinyHop = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const x = xRef.current;

    await animate(
      el,
      [
        {
          transform: `translate3d(${x}px,0,0) scale(1.08,0.9)`,
        },
        {
          transform: `translate3d(${x}px,-18px,0) scale(0.97,1.035)`,
          offset: 0.38,
        },
        {
          transform: `translate3d(${x + rand(-4, 4)}px,-21px,0) scale(1,1)`,
          offset: 0.56,
        },
        {
          transform: `translate3d(${x}px,0,0) scale(1.07,0.93)`,
          offset: 0.84,
        },
        {
          transform: `translate3d(${x}px,0,0) scale(1,1)`,
        },
      ],
      {
        duration: 720,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    el.style.transform = `translate3d(${x}px,0,0)`;
  }, [animate]);

  const doubleHop = useCallback(async () => {
    await tinyHop();
    await wait(90);
    await tinyHop();
  }, [tinyHop]);

  const stretch = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "translateY(0) scale(1,1)" },
        {
          transform: "translateY(1px) scale(0.92,1.08)",
          offset: 0.22,
        },
        {
          transform: "translateY(-2px) scale(1.06,0.94)",
          offset: 0.55,
        },
        { transform: "translateY(0) scale(1,1)" },
      ],
      1250,
      EASE_SPRING,
    );
  }, [bodyMotion]);

  const sitAndThink = useCallback(async () => {
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
      2550,
      EASE_SOFT,
    );
  }, [bodyMotion]);

  const wave = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-4deg)", offset: 0.2 },
        { transform: "rotate(3deg)", offset: 0.4 },
        { transform: "rotate(-3deg)", offset: 0.6 },
        { transform: "rotate(2deg)", offset: 0.8 },
        { transform: "rotate(0deg)" },
      ],
      1350,
      EASE_IN_OUT,
    );

    await limbWiggle(900, 10);
  }, [bodyMotion, limbWiggle]);

  const walk = useCallback(async () => {
    const target = clampX(xRef.current + rand(-105, 105));
    const duration = Math.max(850, Math.abs(target - xRef.current) * 13);

    await moveTo(target, duration, false);
  }, [clampX, moveTo]);

  const run = useCallback(async () => {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const target = clampX(xRef.current + direction * rand(150, 235));
    const duration = Math.max(620, Math.abs(target - xRef.current) * 5.2);

    await moveTo(target, duration, true);

    await bodyMotion(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-3deg) translateY(-1px)", offset: 0.35 },
        { transform: "rotate(0deg)" },
      ],
      420,
      EASE_SOFT,
    );
  }, [bodyMotion, clampX, moveTo]);

  const stumble = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const x = xRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,0,0) rotate(0deg)` },
        {
          transform: `translate3d(${x + rand(-4, 4)}px,2px,0) rotate(-10deg)`,
          offset: 0.3,
        },
        {
          transform: `translate3d(${x + rand(5, 9)}px,3px,0) rotate(13deg)`,
          offset: 0.53,
        },
        {
          transform: `translate3d(${x}px,-2px,0) rotate(-5deg)`,
          offset: 0.72,
        },
        { transform: `translate3d(${x}px,0,0) rotate(0deg)` },
      ],
      {
        duration: 1050,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    el.style.transform = `translate3d(${x}px,0,0)`;
  }, [animate]);

  const peek = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const x = xRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,0,0)`, opacity: 1 },
        {
          transform: `translate3d(${x}px,12px,0) scale(0.94)`,
          opacity: 0.45,
          offset: 0.28,
        },
        {
          transform: `translate3d(${x}px,-7px,0) scale(1.02)`,
          opacity: 1,
          offset: 0.62,
        },
        { transform: `translate3d(${x}px,0,0) scale(1)`, opacity: 1 },
      ],
      {
        duration: 1650,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    el.style.opacity = "1";
    el.style.transform = `translate3d(${x}px,0,0)`;
  }, [animate]);

  const hideAndReappear = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const fromX = xRef.current;
    const toX = clampX(fromX + rand(-145, 145));

    await animate(
      el,
      [
        {
          transform: `translate3d(${fromX}px,0,0) scale(1)`,
          opacity: 1,
        },
        {
          transform: `translate3d(${fromX}px,6px,0) scale(0.72)`,
          opacity: 0,
          offset: 0.3,
        },
        {
          transform: `translate3d(${toX}px,6px,0) scale(0.72)`,
          opacity: 0,
          offset: 0.65,
        },
        {
          transform: `translate3d(${toX}px,0,0) scale(1)`,
          opacity: 1,
        },
      ],
      {
        duration: 2100,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    xRef.current = toX;
    el.style.opacity = "1";
    el.style.transform = `translate3d(${toX}px,0,0)`;
  }, [animate, clampX]);

  const spin = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const x = xRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,0,0) rotate(0deg)` },
        {
          transform: `translate3d(${x + 4}px,-14px,0) rotate(-18deg)`,
          offset: 0.28,
        },
        {
          transform: `translate3d(${x - 3}px,-18px,0) rotate(18deg)`,
          offset: 0.58,
        },
        {
          transform: `translate3d(${x}px,0,0) rotate(0deg)`,
        },
      ],
      {
        duration: 1050,
        easing: EASE_SPRING,
        fill: "forwards",
      },
    );

    el.style.transform = `translate3d(${x}px,0,0)`;
  }, [animate]);

  const hang = useCallback(async () => {
    const el = buttonRef.current;
    if (!el) return;

    const x = xRef.current;

    await animate(
      el,
      [
        { transform: `translate3d(${x}px,0,0) rotate(0deg)` },
        {
          transform: `translate3d(${x}px,-15px,0) rotate(150deg)`,
          offset: 0.3,
        },
        {
          transform: `translate3d(${x + 2}px,-11px,0) rotate(176deg)`,
          offset: 0.58,
        },
        {
          transform: `translate3d(${x}px,0,0) rotate(0deg)`,
        },
      ],
      {
        duration: 2400,
        easing: EASE_SOFT,
        fill: "forwards",
      },
    );

    el.style.transform = `translate3d(${x}px,0,0)`;
  }, [animate]);

  const sleep = useCallback(async () => {
    await bodyMotion(
      [
        { transform: "translateY(0) scale(1,1) rotate(0deg)" },
        {
          transform: "translateY(3px) scale(1.07,0.9) rotate(-3deg)",
          offset: 0.18,
        },
        {
          transform: "translateY(3px) scale(1.07,0.9) rotate(3deg)",
          offset: 0.5,
        },
        {
          transform: "translateY(3px) scale(1.07,0.9) rotate(-2deg)",
          offset: 0.82,
        },
        { transform: "translateY(0) scale(1,1) rotate(0deg)" },
      ],
      3200,
      EASE_IN_OUT,
    );
  }, [bodyMotion]);

  const masti = useRef<Array<() => Promise<void>>>([]);

  useEffect(() => {
    masti.current = [
      lookAround,
      tinyHop,
      doubleHop,
      stretch,
      sitAndThink,
      wave,
      walk,
      run,
      stumble,
      peek,
      hideAndReappear,
      spin,
      hang,
      sleep,
    ];
  }, [
    lookAround,
    tinyHop,
    doubleHop,
    stretch,
    sitAndThink,
    wave,
    walk,
    run,
    stumble,
    peek,
    hideAndReappear,
    spin,
    hang,
    sleep,
  ]);

  /*
   * The pet is intentionally quiet.
   *
   * The delay is selected again after every behaviour, so there is no
   * recognisable "every N seconds" rhythm.
   */
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    destroyedRef.current = false;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;

    const runIdleCycle = () => {
      if (cancelled) return;

      const delay = reducedRef.current ? rand(12000, 18000) : rand(7500, 14500);

      idleTimerRef.current = window.setTimeout(async () => {
        if (cancelled || destroyedRef.current || disabled || busyRef.current || document.hidden) {
          runIdleCycle();
          return;
        }

        busyRef.current = true;
        stopBreathing();

        const list = masti.current;
        const action = list[Math.floor(Math.random() * list.length)];

        try {
          await action?.();
        } catch {
          // Animation cancellation/unmount is intentionally harmless.
        }

        if (!cancelled && !destroyedRef.current) {
          busyRef.current = false;
          startBreathing();
        }

        runIdleCycle();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (idleTimerRef.current) {
          window.clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        stopBreathing();
        return;
      }

      if (!busyRef.current && !disabled) {
        startBreathing();
        runIdleCycle();
      }
    };

    const entrance = window.setTimeout(async () => {
      if (cancelled) return;

      busyRef.current = true;

      if (reducedRef.current) {
        el.style.opacity = "1";
        el.style.transform = "translate3d(0,0,0)";
      } else {
        await animate(
          el,
          [
            {
              opacity: 0,
              transform: "translate3d(0,16px,0) scale(0.72)",
            },
            {
              opacity: 1,
              transform: "translate3d(0,-5px,0) scale(1.035)",
              offset: 0.7,
            },
            {
              opacity: 1,
              transform: "translate3d(0,0,0) scale(1)",
            },
          ],
          {
            duration: 1150,
            easing: EASE_SOFT,
            fill: "forwards",
          },
        );

        el.style.opacity = "1";
        el.style.transform = "translate3d(0,0,0)";
      }

      if (cancelled) return;

      busyRef.current = false;
      startBreathing();
      runIdleCycle();
    }, 3200);

    entranceTimerRef.current = entrance;

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      destroyedRef.current = true;

      window.clearTimeout(entrance);

      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      if (entranceTimerRef.current) {
        window.clearTimeout(entranceTimerRef.current);
        entranceTimerRef.current = null;
      }

      stopBreathing();
      cancelAnimation(limbAnimationRef);
    };
  }, [
    animate,
    disabled,
    startBreathing,
    stopBreathing,
    lookAround,
    tinyHop,
    doubleHop,
    stretch,
    sitAndThink,
    wave,
    walk,
    run,
    stumble,
    peek,
    hideAndReappear,
    spin,
    hang,
    sleep,
  ]);

  /*
   * Interaction is deliberately kept separate from the idle system.
   * The search transition can be refined independently later.
   */
  const handleActivate = useCallback(async () => {
    if (disabled || busyRef.current || reducedRef.current) {
      if (disabled || busyRef.current) return;

      // Reduced-motion users still get the action without a long animation.
      busyRef.current = true;
      stopBreathing();
      onEnterSearch();
      busyRef.current = false;
      startBreathing();
      return;
    }

    const el = buttonRef.current;
    if (!el) {
      onEnterSearch();
      return;
    }

    busyRef.current = true;
    stopBreathing();

    const x = xRef.current;

    try {
      await animate(
        el,
        [
          {
            transform: `translate3d(${x}px,0,0) scale(1,1)`,
          },
          {
            transform: `translate3d(${x}px,3px,0) scale(1.13,0.84)`,
          },
        ],
        {
          duration: 170,
          easing: EASE_IN_OUT,
          fill: "forwards",
        },
      );

      await animate(
        el,
        [
          {
            transform: `translate3d(${x}px,3px,0) scale(0.94,1.08)`,
          },
          {
            transform: `translate3d(${x + rand(-8, 8)}px,-27px,0) scale(0.98,1.03)`,
            offset: 0.38,
          },
          {
            transform: `translate3d(${x + rand(-14, 14)}px,-34px,0) scale(1,1)`,
            offset: 0.58,
          },
          {
            transform: `translate3d(${x}px,0,0) scale(1.06,0.94)`,
            offset: 0.88,
          },
          {
            transform: `translate3d(${x}px,0,0) scale(1,1)`,
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
            transform: `translate3d(${x}px,0,0) scale(1,1)`,
            opacity: 1,
          },
          {
            transform: `translate3d(${x}px,3px,0) scale(1.16,0.5)`,
            opacity: 0.55,
            offset: 0.52,
          },
          {
            transform: `translate3d(${x}px,5px,0) scale(0.35,0.2)`,
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

      /*
       * Until SearchBar gets its own GDx lifecycle, bring the pet back
       * quietly after the interaction. This keeps GDx independently usable.
       */
      window.setTimeout(() => {
        const node = buttonRef.current;
        if (!node || destroyedRef.current) return;

        node.style.opacity = "0";
        node.style.transform = `translate3d(${x}px,12px,0)`;

        node.animate(
          [
            {
              opacity: 0,
              transform: `translate3d(${x}px,12px,0) scale(0.7)`,
            },
            {
              opacity: 1,
              transform: `translate3d(${x}px,0,0) scale(1)`,
            },
          ],
          {
            duration: 850,
            easing: EASE_SOFT,
            fill: "forwards",
          },
        );

        node.style.opacity = "1";
        node.style.transform = `translate3d(${x}px,0,0)`;

        busyRef.current = false;
        startBreathing();
      }, 1150);
    } catch {
      if (!destroyedRef.current) {
        el.style.opacity = "1";
        el.style.transform = `translate3d(${x}px,0,0)`;
        busyRef.current = false;
        startBreathing();
      }
    }
  }, [animate, disabled, onEnterSearch, startBreathing, stopBreathing]);

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none fixed inset-x-0 bottom-[14vh] z-30 flex justify-center"
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
        className="pointer-events-auto cursor-pointer border-0 bg-transparent p-2 opacity-0 will-change-transform focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-full"
        style={{
          transform: "translate3d(0,16px,0)",
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

              {/* tiny, imperfect limbs */}
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
