import { useEffect, useRef } from "react";

/**
 * Animated LED wallpaper.
 *
 * Important:
 * - No mouse / pointer listeners.
 * - The grid itself never moves.
 * - The illumination moves continuously underneath the fixed grid.
 * - The motion uses several independent fields so it does not look like
 *   one giant CSS gradient sliding around.
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
      cell: 20,
      cols: 0,
      rows: 0,
    };

    // Deep ember -> orange -> amber -> yellow.
    const palette = [
      [150, 28, 6],
      [186, 35, 6],
      [215, 43, 6],
      [236, 53, 6],
      [248, 65, 7],
      [255, 79, 8],
      [255, 95, 9],
      [255, 112, 11],
      [255, 131, 13],
      [255, 151, 16],
      [255, 172, 21],
      [255, 193, 30],
      [255, 214, 56],
    ] as const;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const smoothstep = (t: number) => {
      const x = clamp01(t);
      return x * x * (3 - 2 * x);
    };

    const smootherstep = (t: number) => {
      const x = clamp01(t);
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    /* Fast deterministic 3D noise. Time is the third dimension. */
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

      state.cell = state.tile + 1;

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

      const motion = reducedMotionQuery.matches ? 0.18 : 1;

      /* Same basic architecture as the reference: separate evolving
         fields for luminance and color, rather than one moving gradient. */
      const wtW = realT * 1.0 * motion;
      const wtC = realT * 0.92 * motion;

      ctx.fillStyle = "#140705";
      ctx.fillRect(0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;

          /* Moving luminance field. */
          let brightness = fbm(col * 0.1 + wtW * 0.06, row * 0.1 + wtW * 0.025, wtW * 0.09 + 19.1);

          /* Larger structure drifts in a different direction. */
          const broad = fbm(col * 0.05 - wtW * 0.018, row * 0.046 + wtW * 0.012, wtW * 0.05 + 47.3);

          /* Small detail evolves faster. */
          const local = fbm(col * 0.2 + wtW * 0.036, row * 0.18 - wtW * 0.028, wtW * 0.11 + 91.7);

          brightness = brightness * 0.72 + broad * 0.2 + local * 0.08;

          /* Reference-style threshold / gamma / warm floor. */
          brightness = clamp01((brightness - 0.06) / 0.94);

          brightness = Math.pow(brightness, 0.92);

          brightness = 0.5 + 0.5 * brightness;

          /* Separate color field. */
          let colorField = fbm(col * 0.05 + wtC * 0.04, row * 0.05 + wtC * 0.018, wtC * 0.05 + 73.1);

          colorField += 0.16 * fbm(col * 0.11 - wtC * 0.022, row * 0.095 + wtC * 0.014, wtC * 0.075 + 117.2);

          colorField += Math.sin(wtC * 0.12 + col * 0.017 + row * 0.009) * 0.035;

          /* Orange occupies most of the palette; yellow is only the top end. */
          colorField = clamp01(0.035 + colorField * 0.78);

          const palettePosition = colorField * (palette.length - 1);

          const p0 = Math.floor(palettePosition);

          const p1 = Math.min(palette.length - 1, p0 + 1);

          const mix = smoothstep(palettePosition - p0);

          let r = lerp(palette[p0][0], palette[p1][0], mix);

          let g = lerp(palette[p0][1], palette[p1][1], mix);

          let b = lerp(palette[p0][2], palette[p1][2], mix);

          const light = 0.3 + Math.pow(brightness, 0.82) * 0.82;

          r *= light;
          g *= light * 0.92;
          b *= light * 0.84;

          /* Tiny unsynchronised LED breathing. */
          const breathe = 0.965 + 0.055 * Math.sin(realT * 0.4 + col * 0.71 - row * 0.43);

          r *= breathe;
          g *= breathe;
          b *= breathe;

          ctx.fillStyle = `rgb(${Math.round(Math.max(0, Math.min(255, r)))} ${Math.round(
            Math.max(0, Math.min(255, g)),
          )} ${Math.round(Math.max(0, Math.min(255, b)))})`;

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
