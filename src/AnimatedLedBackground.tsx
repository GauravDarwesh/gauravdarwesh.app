import { useEffect, useRef } from "react";

/**
 * Animated LED wallpaper.
 *
 * Fixed checkerboard geometry + continuously drifting light/color field.
 * No mouse or pointer interaction.
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
    let realT = 0;
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

    // Orange-forward. Yellow is reserved for the brightest highlights.
    const palette = [
      [102, 20, 5],
      [136, 25, 5],
      [170, 31, 5],
      [201, 39, 5],
      [224, 47, 5],
      [240, 58, 6],
      [249, 70, 7],
      [255, 84, 8],
      [255, 101, 9],
      [255, 119, 10],
      [255, 139, 13],
      [255, 159, 17],
      [255, 180, 23],
      [255, 198, 32],
    ] as const;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const smoothstep = (t: number) => {
      const x = clamp01(t);
      return x * x * (3 - 2 * x);
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

      const u = smoothstep(fx);
      const v = smoothstep(fy);
      const w = smoothstep(fz);

      const mix = (a: number, b: number, t: number) => a + (b - a) * t;

      const x00 = mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);

      const x10 = mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);

      const x01 = mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);

      const x11 = mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);

      return mix(mix(x00, x10, v), mix(x01, x11, v), w);
    };

    const fbm = (x: number, y: number, z: number) => {
      return 0.62 * noise3(x, y, z) + 0.38 * noise3(x * 2.17 + 11.3, y * 2.17 + 7.9, z * 2.17 + 3.1);
    };

    const resize = () => {
      if (window.innerWidth <= 768) {
        state.tile = 16;
      } else if (window.innerWidth <= 900) {
        state.tile = 17;
      } else {
        state.tile = 19;
      }

      state.gap = 1;
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

    const sampleColor = (colorField: number, brightness: number) => {
      /*
       * Restrict the hue range so the wallpaper stays orange-forward.
       * Only the upper tail reaches amber/yellow.
       */
      const restrictedColor = clamp01(0.02 + colorField * 0.68);

      const palettePosition = restrictedColor * (palette.length - 1);

      const p0 = Math.floor(palettePosition);
      const p1 = Math.min(palette.length - 1, p0 + 1);

      const mix = smoothstep(palettePosition - p0);

      let r = lerp(palette[p0][0], palette[p1][0], mix);
      let g = lerp(palette[p0][1], palette[p1][1], mix);
      let b = lerp(palette[p0][2], palette[p1][2], mix);

      // Soft illumination response.
      const light = 0.14 + Math.pow(brightness, 0.72) * 1.12;

      r *= light;
      g *= light * 0.88;
      b *= light * 0.74;

      return [Math.max(0, Math.min(255, r)), Math.max(0, Math.min(255, g)), Math.max(0, Math.min(255, b))];
    };

    const draw = () => {
      if (isMinimal) return;

      const { width, height, cols, rows, cell, tile } = state;

      const motion = reducedMotionQuery.matches ? 0.22 : 1;

      const t = realT * motion;
      const luminanceT = t * 0.76;
      const colorT = t * 0.53;

      ctx.fillStyle = "#140705";
      ctx.fillRect(0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;

          /*
           * Three independently drifting fields.
           * This produces organic travel instead of a single gradient sliding.
           */
          const broad = fbm(
            col * 0.036 - luminanceT * 0.034,
            row * 0.036 + luminanceT * 0.01,
            23.7 + luminanceT * 0.052,
          );

          const mid = fbm(
            col * 0.082 + luminanceT * 0.052,
            row * 0.067 - luminanceT * 0.021,
            71.4 + luminanceT * 0.073,
          );

          const fine = fbm(col * 0.17 - luminanceT * 0.025, row * 0.14 + luminanceT * 0.032, 119.8 + luminanceT * 0.11);

          let brightness = broad * 0.58 + mid * 0.3 + fine * 0.12;

          brightness = clamp01((brightness - 0.2) / 0.7);

          brightness = Math.pow(brightness, 0.82);

          /*
           * Independent color drift.
           * Color can slide through the tile field even when
           * the luminance structure is changing differently.
           */
          let colorField = fbm(col * 0.046 + colorT * 0.03, row * 0.046 + colorT * 0.014, 147.2 + colorT * 0.046);

          colorField += 0.24 * fbm(col * 0.095 - colorT * 0.02, row * 0.078 + colorT * 0.017, 188.4 + colorT * 0.078);

          colorField += Math.sin(colorT * 0.32 + col * 0.018 - row * 0.011) * 0.045;

          /*
           * Slow directional sweep so the movement is obvious.
           * The checkerboard itself never translates.
           */
          const travellingWave = 0.5 + 0.5 * Math.sin(col * 0.03 - row * 0.012 - t * 0.56);

          brightness = brightness * 0.74 + travellingWave * 0.26;

          /*
           * Very small per-LED breathing so the field remains alive.
           */
          const breathe = 0.96 + 0.05 * Math.sin(t * 0.42 + col * 0.73 - row * 0.47);

          const [r0, g0, b0] = sampleColor(colorField, brightness);

          const r = r0 * breathe;
          const g = g0 * breathe;
          const b = b0 * breathe;

          ctx.fillStyle = `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;

          // Fixed square LED. One-pixel gap creates the checkerboard.
          ctx.fillRect(x, y, tile, tile);
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);

      last = now;
      realT += dt;

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

    window.addEventListener("resize", handleResize, { passive: true });

    window.addEventListener("orientationchange", handleResize, { passive: true });

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
