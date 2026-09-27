import { useEffect, useRef } from "react";

/**
 * Procedural LED field used as the site's fixed wallpaper.
 *
 * The visual treatment is intentionally original:
 * - 20px-ish square LED cells
 * - fixed red / orange / amber palette
 * - cursor changes luminance, never the hue/palette
 * - a soft moving wake follows the pointer
 * - pointer down creates a restrained ripple
 * - reduced-motion and touch-safe behavior
 */
type Point = {
  x: number;
  y: number;
  time: number;
};

type Ripple = {
  x: number;
  y: number;
  born: number;
};

const PALETTE = [
  [112, 24, 12],
  [138, 31, 11],
  [162, 41, 10],
  [184, 53, 11],
  [205, 65, 13],
  [221, 82, 18],
  [229, 101, 25],
  [229, 123, 33],
  [218, 145, 52],
  [190, 76, 24],
];

const DPR_CAP = 2;
const MAX_TRAIL = 18;
const TRAIL_LIFE = 720;
const RIPPLE_LIFE = 1050;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hash2(x: number, y: number) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm(x: number, y: number) {
  return (
    valueNoise(x, y) * 0.58 +
    valueNoise(x * 2.07 + 11.4, y * 2.07 + 6.8) * 0.27 +
    valueNoise(x * 4.11 - 4.1, y * 4.11 + 8.7) * 0.15
  );
}

function paletteColor(position: number) {
  const scaled = clamp(position, 0, 0.999999) * PALETTE.length;
  const index = Math.floor(scaled);
  const next = (index + 1) % PALETTE.length;
  const t = smoothstep(0, 1, scaled - index);

  const a = PALETTE[index];
  const b = PALETTE[next];

  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ] as const;
}

function distanceSquared(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

const LEDBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (!context) return;

    let frameId = 0;
    let destroyed = false;
    let width = 0;
    let height = 0;
    let cell = 20;
    let tile = 19;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let lastFrame = performance.now();
    let reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let minimalTheme =
      document.documentElement.getAttribute("data-theme") === "minimal";

    const pointer = {
      x: 0,
      y: 0,
      active: false,
      lastEvent: 0,
    };

    let trail: Point[] = [];
    let ripples: Ripple[] = [];

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    mediaQuery.addEventListener?.("change", onMotionPreferenceChange);

    const themeObserver = new MutationObserver(() => {
      minimalTheme =
        document.documentElement.getAttribute("data-theme") === "minimal";
      canvas.style.opacity = minimalTheme ? "0" : "1";
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    canvas.style.opacity = minimalTheme ? "0" : "1";

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      if (width <= 600) {
        cell = 18;
      } else if (width <= 900) {
        cell = 19;
      } else {
        cell = 20;
      }

      tile = cell - 1;
      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;

      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = false;
    };

    const pushTrailPoint = (x: number, y: number, now: number) => {
      const last = trail[trail.length - 1];

      if (last && distanceSquared(x, y, last.x, last.y) < 20) {
        last.x = x;
        last.y = y;
        last.time = now;
        return;
      }

      trail.push({ x, y, time: now });

      if (trail.length > MAX_TRAIL) {
        trail.shift();
      }
    };

    const updatePointer = (x: number, y: number, now: number) => {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointer.lastEvent = now;

      if (!reducedMotion) {
        pushTrailPoint(x, y, now);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      updatePointer(event.clientX, event.clientY, performance.now());
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      updatePointer(event.clientX, event.clientY, performance.now());
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const now = performance.now();
      updatePointer(event.clientX, event.clientY, now);

      if (!reducedMotion) {
        ripples.push({
          x: event.clientX,
          y: event.clientY,
          born: now,
        });

        if (ripples.length > 3) {
          ripples.shift();
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerenter", onPointerEnter, {
      passive: true,
    });
    window.addEventListener("pointerleave", onPointerLeave, {
      passive: true,
    });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("resize", resize, { passive: true });

    resize();

    const draw = (now: number) => {
      if (destroyed) return;

      lastFrame = now;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (minimalTheme) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        frameId = requestAnimationFrame(draw);
        return;
      }

      context.fillStyle = "#140c08";
      context.fillRect(0, 0, width, height);

      const time = now * 0.001;

      if (pointer.active && now - pointer.lastEvent > 140) {
        pointer.active = false;
      }

      const aliveTrail = trail.filter(
        (point) => now - point.time < TRAIL_LIFE,
      );
      trail = aliveTrail;

      ripples = ripples.filter(
        (ripple) => now - ripple.born < RIPPLE_LIFE,
      );

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;
        const centerY = y + tile * 0.5;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;
          const centerX = x + tile * 0.5;

          // Stable procedural base. It does not re-randomize with the cursor.
          const seedA = fbm(col * 0.085 + 2.7, row * 0.085 - 3.4);
          const seedB = fbm(col * 0.19 - 8.2, row * 0.17 + 1.8);
          let base = seedA * 0.72 + seedB * 0.28;

          // Keep the palette distribution more LED-like than poster-like.
          base = Math.pow(clamp(base, 0, 1), 1.18);

          let [r, g, b] = paletteColor(base * 0.82 + 0.06);

          // Extremely slow luminance breathing; hue and palette are stable.
          const idlePulse = reducedMotion
            ? 1
            : 0.985 +
              0.032 *
                Math.sin(
                  time * 0.32 + col * 0.17 + row * 0.13 + seedA * 7,
                );

          let light = idlePulse;

          // Pointer wake: luminance changes, not hue.
          if (!reducedMotion && (pointer.active || trail.length > 0)) {
            for (let i = trail.length - 1; i >= 0; i -= 1) {
              const point = trail[i];
              const age = now - point.time;
              const ageFactor = clamp(1 - age / TRAIL_LIFE, 0, 1);
              if (ageFactor <= 0) continue;

              const spread = 54 + ageFactor * 18;
              const d2 = distanceSquared(centerX, centerY, point.x, point.y);
              const influence = Math.exp(-d2 / (spread * spread));

              light += influence * ageFactor * 0.22;
            }

            if (pointer.active) {
              const d2 = distanceSquared(
                centerX,
                centerY,
                pointer.x,
                pointer.y,
              );

              const cursorInfluence = Math.exp(-d2 / (58 * 58));
              light += cursorInfluence * 0.70;

              // A directional edge gives the cursor a little more "wake".
              const dx = centerX - pointer.x;
              const dy = centerY - pointer.y;
              const distance = Math.sqrt(d2) || 1;
              const direction = clamp(
                (dx / distance) * 0.55 + (dy / distance) * 0.45,
                -1,
                1,
              );

              light += cursorInfluence * Math.max(0, direction) * 0.08;
            }
          }

          // Click ripple: a moving ring of brightness, no hue shift.
          if (!reducedMotion && ripples.length > 0) {
            for (const ripple of ripples) {
              const age = now - ripple.born;
              const progress = clamp(age / RIPPLE_LIFE, 0, 1);
              const radius = 12 + progress * Math.min(width, height) * 0.42;
              const ringDistance = Math.abs(
                Math.sqrt(
                  distanceSquared(centerX, centerY, ripple.x, ripple.y),
                ) - radius,
              );

              const ring =
                Math.exp(-(ringDistance * ringDistance) / (38 * 38)) *
                (1 - progress) *
                0.24;

              light += ring;
            }
          }

          // Slight local contrast so neighboring cells don't all look equal.
          const contrast = 0.97 + base * 0.09;
          light *= contrast;

          r = clamp(Math.round(r * light), 0, 255);
          g = clamp(Math.round(g * light), 0, 255);
          b = clamp(Math.round(b * light), 0, 255);

          context.fillStyle = `rgb(${r} ${g} ${b})`;
          context.fillRect(x, y, tile, tile);
        }
      }

      // One-pixel grid seam, kept completely stationary.
      context.fillStyle = "rgba(20, 10, 5, 0.84)";

      for (let col = 0; col <= cols; col += 1) {
        context.fillRect(col * cell, 0, 1, height);
      }

      for (let row = 0; row <= rows; row += 1) {
        context.fillRect(0, row * cell, width, 1);
      }

      // Very restrained vignette to keep the center readable.
      const vignette = context.createRadialGradient(
        width * 0.48,
        height * 0.43,
        Math.min(width, height) * 0.16,
        width * 0.48,
        height * 0.43,
        Math.max(width, height) * 0.74,
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.72, "rgba(0,0,0,0.025)");
      vignette.addColorStop(1, "rgba(0,0,0,0.16)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      cancelAnimationFrame(frameId);

      mediaQuery.removeEventListener?.("change", onMotionPreferenceChange);
      themeObserver.disconnect();

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerenter", onPointerEnter);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="site-background led-background"
      aria-hidden="true"
    />
  );
};

export default LEDBackground;
