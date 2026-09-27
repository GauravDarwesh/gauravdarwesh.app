import { useEffect, useRef } from "react";

/**
 * Animated LED wallpaper.
 *
 * Fixed checkerboard geometry + one continuous global light field.
 * The field swirls across the entire canvas on its own.
 * There is intentionally no mouse / pointer interaction.
 */
const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let last = performance.now();
    let time = 0;
    let running = true;
    let isMinimal = document.documentElement.dataset.theme === "minimal";

    const state = {
      width: 1,
      height: 1,
      dpr: 1,
      tile: 19,
      gap: 1,
      cell: 20,
      cols: 0,
      rows: 0,
    };

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const smooth = (v: number) => {
      const x = clamp01(v);
      return x * x * (3 - 2 * x);
    };

    const smoother = (v: number) => {
      const x = clamp01(v);
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    const hash3 = (x: number, y: number, z: number) => {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      n ^= n >>> 16;
      return (n >>> 0) / 4294967296;
    };

    const noise3 = (x: number, y: number, z: number) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const zi = Math.floor(z);

      const fx = x - xi;
      const fy = y - yi;
      const fz = z - zi;

      const u = smooth(fx);
      const v = smooth(fy);
      const w = smooth(fz);
      const mix = (a: number, b: number, t: number) => a + (b - a) * t;

      const x00 = mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);
      const x10 = mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);
      const x01 = mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);
      const x11 = mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);

      return mix(mix(x00, x10, v), mix(x01, x11, v), w);
    };

    const fbm = (x: number, y: number, z: number) =>
      0.64 * noise3(x, y, z) + 0.36 * noise3(x * 2.17 + 9.3, y * 2.17 + 12.7, z * 2.17 + 5.1);

    const resize = () => {
      state.tile = window.innerWidth <= 768 ? 16 : window.innerWidth <= 900 ? 17 : 19;

      state.cell = state.tile + state.gap;

      const rect = canvas.getBoundingClientRect();
      state.width = Math.max(1, Math.ceil(rect.width));
      state.height = Math.max(1, Math.ceil(rect.height));
      state.cols = Math.ceil(state.width / state.cell) + 2;
      state.rows = Math.ceil(state.height / state.cell) + 2;
      state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.ceil(state.width * state.dpr);
      canvas.height = Math.ceil(state.height * state.dpr);

      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      ctx.imageSmoothingEnabled = false;
    };

    const draw = () => {
      if (isMinimal) return;

      const { width, height, cols, rows, cell, tile } = state;

      const motion = reducedMotionQuery.matches ? 0.22 : 1;
      const t = time * motion;

      ctx.fillStyle = "#140705";
      ctx.fillRect(0, 0, width, height);

      /*
       * ONE global coordinate system.
       *
       * This is intentionally not four blobs and not four quadrants.
       * Every tile is evaluated in the same continuous field, so a bright
       * region can travel from one side of the screen to the other.
       */
      const globalCx = width * 0.5;
      const globalCy = height * 0.5;
      const maxRadius = Math.hypot(width, height) * 0.58;

      /* Circular motion parameters. */
      const rotation = t * 1.18;
      const pulse = t * 2.05;
      const driftX = Math.sin(t * 0.33) * width * 0.055;
      const driftY = Math.cos(t * 0.27) * height * 0.045;

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;

          const px = x + tile * 0.5;
          const py = y + tile * 0.5;

          let dx = px - globalCx - driftX;
          let dy = py - globalCy - driftY;

          const rawRadius = Math.hypot(dx, dy);
          const radius = rawRadius / maxRadius;
          const baseAngle = Math.atan2(dy, dx);

          /*
           * Vortex mapping:
           * inner rings rotate more than outer rings, producing a continuous
           * circular flow instead of a collection of independent spots.
           */
          const swirlStrength = 2.15 * (1 - clamp01(radius));
          const warpedAngle = baseAngle + rotation + swirlStrength * 0.64 + Math.sin(radius * 7.4 - t * 1.45) * 0.18;

          /* Convert the warped polar space back into a continuous field. */
          const warpedX = Math.cos(warpedAngle) * radius * 5.6 + t * 0.045;
          const warpedY = Math.sin(warpedAngle) * radius * 5.6 - t * 0.032;

          /* Large-scale moving structure. */
          const large = fbm(warpedX * 0.42 + 8.2, warpedY * 0.42 - 4.7, 32.0 + t * 0.2);

          /* Mid-scale circular detail. */
          const mid = fbm(warpedX * 0.86 - t * 0.028, warpedY * 0.86 + t * 0.038, 71.0 + t * 0.33);

          /* Fine detail moves in the opposite direction. */
          const fine = fbm(warpedX * 1.55 + t * 0.055, warpedY * 1.38 - t * 0.047, 119.0 + t * 0.52);

          /*
           * A global rotating band. It wraps around the whole canvas rather
           * than beginning a new animation in each quarter of the screen.
           */
          const band = 0.5 + 0.5 * Math.sin(warpedAngle * 2.4 + radius * 11.0 - pulse);

          /* Expanding circular wave passing through the entire field. */
          const ring = 0.5 + 0.5 * Math.sin(radius * 24.0 - t * 3.8 + Math.sin(warpedAngle * 2.0 + t) * 0.7);

          let brightness = large * 0.48 + mid * 0.28 + fine * 0.1 + band * 0.08 + ring * 0.06;

          /* Keep the whole surface alive; no dead four-corner blocks. */
          brightness = clamp01((brightness - 0.22) / 0.62);

          brightness = smoother(brightness);

          /*
           * Independent color field. It also uses the same global vortex,
           * so color transitions stay spatially continuous.
           */
          let colorField = fbm(warpedX * 0.38 + t * 0.025, warpedY * 0.38 - t * 0.019, 153.0 + t * 0.24);

          colorField += 0.22 * fbm(warpedX * 0.74 - t * 0.019, warpedY * 0.68 + t * 0.026, 194.0 + t * 0.31);

          colorField = clamp01(colorField * 0.82 + band * 0.12 + brightness * 0.16);

          /*
           * Orange is the default. The top brightness range deliberately
           * reaches a real yellow so yellow cannot disappear again.
           */
          const orangeR = 255;
          const orangeG = lerp(55, 138, colorField);
          const orangeB = lerp(6, 14, colorField);

          const yellowMix = smooth((brightness - 0.55) / 0.22) * 0.92 + smooth((colorField - 0.68) / 0.2) * 0.24;

          const r = orangeR;
          const g = lerp(orangeG, 232, clamp01(yellowMix));
          const b = lerp(orangeB, 42, clamp01(yellowMix));

          /* Soft LED breathing, asynchronous but subtle. */
          const breathe = 0.955 + 0.045 * Math.sin(t * 1.35 + col * 0.71 - row * 0.43);

          const light = 0.16 + Math.pow(brightness, 0.68) * 1.07;

          ctx.fillStyle = `rgb(${Math.round(Math.max(0, Math.min(255, r * light * breathe)))} ${Math.round(
            Math.max(0, Math.min(255, g * light * breathe)),
          )} ${Math.round(Math.max(0, Math.min(255, b * light * breathe)))})`;

          ctx.fillRect(x, y, tile, tile);
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);

      last = now;
      time += dt;
      draw();

      raf = requestAnimationFrame(tick);
    };

    const handleResize = () => {
      resize();
      draw();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        return;
      }

      running = true;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    const observer = new MutationObserver(() => {
      isMinimal = document.documentElement.dataset.theme === "minimal";

      if (!isMinimal) draw();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    resize();
    draw();
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", handleResize, {
      passive: true,
    });

    window.addEventListener("orientationchange", handleResize, {
      passive: true,
    });

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();

      window.removeEventListener("resize", handleResize);

      window.removeEventListener("orientationchange", handleResize);

      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="site-background orange-bg">
      <canvas ref={canvasRef} className="led-wallpaper-canvas" />
    </div>
  );
};

export default AnimatedLedBackground;
