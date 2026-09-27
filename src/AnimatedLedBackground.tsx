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
    let elapsed = 0;
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
      [230, 42, 8],
      [248, 58, 9],
      [255, 78, 10],
      [255, 102, 11],
      [255, 128, 12],
      [255, 155, 16],
      [255, 181, 23],
      [255, 205, 40],
      [255, 221, 78],
      [255, 231, 119],
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

    const hash = (x: number, y: number, seed: number) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
      return n - Math.floor(n);
    };

    const valueNoise = (x: number, y: number, seed: number) => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const tx = smootherstep(x - x0);
      const ty = smootherstep(y - y0);

      const a = hash(x0, y0, seed);
      const b = hash(x0 + 1, y0, seed);
      const c = hash(x0, y0 + 1, seed);
      const d = hash(x0 + 1, y0 + 1, seed);

      return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
    };

    const fbm = (x: number, y: number, seed: number, octaves = 4) => {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      let total = 0;

      for (let i = 0; i < octaves; i += 1) {
        value += valueNoise(x * frequency, y * frequency, seed + i * 17.37) * amplitude;

        total += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      return total ? value / total : 0;
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
      const slow = reducedMotionQuery.matches ? 0.18 : 1;
      const t = elapsed * slow;

      ctx.fillStyle = "#120806";
      ctx.fillRect(0, 0, width, height);

      // These are deliberately visible movement speeds. The reference-style
      // effect comes from moving the sampled field, not animating one layer.
      const largeX = t * 0.115;
      const largeY = t * 0.052;
      const midX = -t * 0.072;
      const midY = t * 0.038;
      const fineX = t * 0.17;
      const fineY = -t * 0.095;

      // Slow drifting "hot spots" make movement impossible to miss while
      // remaining smooth and organic.
      const blob1x = cols * 0.22 + Math.sin(t * 0.16) * cols * 0.16;
      const blob1y = rows * 0.28 + Math.cos(t * 0.13) * rows * 0.18;

      const blob2x = cols * 0.7 + Math.cos(t * 0.12 + 1.4) * cols * 0.2;
      const blob2y = rows * 0.7 + Math.sin(t * 0.15 + 0.8) * rows * 0.17;

      const blob3x = cols * 0.5 + Math.sin(t * 0.09 + 3.2) * cols * 0.28;
      const blob3y = rows * 0.18 + Math.cos(t * 0.11 + 2.1) * rows * 0.16;

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;
        if (y > height + cell) continue;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;
          if (x > width + cell) continue;

          // Large-scale field.
          const large = fbm(col * 0.058 + largeX, row * 0.052 + largeY, 9.7, 4);

          // Independent medium field moving diagonally the other way.
          const medium = fbm(col * 0.108 + midX, row * 0.091 + midY, 31.2, 4);

          // Fine structure gives the LEDs individual character.
          const fine = fbm(col * 0.235 + fineX, row * 0.195 + fineY, 71.8, 3);

          // A travelling wave sweeps through the wall continuously.
          const travellingWave = 0.5 + 0.5 * Math.sin(t * 0.62 + col * 0.13 + row * 0.047);

          // Low-frequency local breathing, offset per cell.
          const breathing = 0.5 + 0.5 * Math.sin(t * 0.31 + col * 0.51 - row * 0.43 + large * 5.0);

          // Moving luminous pockets.
          const d1x = (col - blob1x) / (cols * 0.23);
          const d1y = (row - blob1y) / (rows * 0.3);
          const d2x = (col - blob2x) / (cols * 0.28);
          const d2y = (row - blob2y) / (rows * 0.25);
          const d3x = (col - blob3x) / (cols * 0.25);
          const d3y = (row - blob3y) / (rows * 0.22);

          const blob1 = Math.exp(-(d1x * d1x + d1y * d1y) * 1.65);
          const blob2 = Math.exp(-(d2x * d2x + d2y * d2y) * 1.55);
          const blob3 = Math.exp(-(d3x * d3x + d3y * d3y) * 1.75);

          const hotSpots = blob1 * 0.26 + blob2 * 0.22 + blob3 * 0.18;

          // Brightness: enough range to visibly change, but without flashing.
          let brightness =
            0.18 +
            large * 0.4 +
            medium * 0.18 +
            fine * 0.08 +
            hotSpots +
            (travellingWave - 0.5) * 0.16 +
            (breathing - 0.5) * 0.14;

          brightness = smoothstep(clamp01(brightness));

          // Color evolves independently from brightness.
          let colorField = large * 0.57 + medium * 0.24 + fine * 0.07 + hotSpots * 0.75;

          colorField += 0.045 * Math.sin(t * 0.1 + large * 7.0 + col * 0.035);

          colorField = clamp01(colorField);

          const palettePosition = colorField * (palette.length - 1);

          const p0 = Math.floor(palettePosition);
          const p1 = Math.min(palette.length - 1, p0 + 1);
          const pt = smootherstep(palettePosition - p0);

          let r = lerp(palette[p0][0], palette[p1][0], pt);
          let g = lerp(palette[p0][1], palette[p1][1], pt);
          let b = lerp(palette[p0][2], palette[p1][2], pt);

          const light = 0.3 + brightness * 0.8;

          r *= light;
          g *= 0.92 * light;
          b *= 0.84 * light;

          // Slight per-cell modulation; never a flicker.
          const cellBreath = 0.965 + 0.05 * Math.sin(t * 0.43 + col * 0.71 + row * 0.37);

          r *= cellBreath;
          g *= cellBreath;
          b *= cellBreath;

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
      elapsed += dt;

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
