import { useEffect, useRef } from "react";

/**
 * Orange LED wallpaper inspired by the motion language of the reference site.
 *
 * - Fixed checkerboard geometry
 * - Light field moves on its own
 * - No mouse / pointer listeners
 * - Multiple orbiting fields create fast circular motion
 * - Orange-forward palette; yellow reserved for highlights
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

    // Deep orange -> orange -> amber -> small amount of yellow.
    const palette = [
      [94, 18, 4],
      [128, 23, 4],
      [162, 29, 5],
      [193, 36, 5],
      [218, 44, 5],
      [237, 54, 6],
      [248, 66, 7],
      [255, 80, 8],
      [255, 97, 9],
      [255, 117, 10],
      [255, 139, 13],
      [255, 161, 18],
      [255, 181, 23],
      [255, 202, 32],
      [255, 218, 57],
    ] as const;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const smooth = (v: number) => {
      const x = clamp01(v);
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
      0.63 * noise3(x, y, z) + 0.37 * noise3(x * 2.13 + 9.7, y * 2.13 + 13.1, z * 2.13 + 5.4);

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

    const colorAt = (field: number, brightness: number) => {
      // Strongly orange weighted. Yellow only occupies the extreme top end.
      const position = clamp01(0.015 + field * 0.7) * (palette.length - 1);
      const p0 = Math.floor(position);
      const p1 = Math.min(palette.length - 1, p0 + 1);
      const mix = smooth(position - p0);

      let r = lerp(palette[p0][0], palette[p1][0], mix);
      let g = lerp(palette[p0][1], palette[p1][1], mix);
      let b = lerp(palette[p0][2], palette[p1][2], mix);

      const light = 0.16 + Math.pow(brightness, 0.74) * 1.08;
      r *= light;
      g *= light * 0.88;
      b *= light * 0.72;

      return [r, g, b] as const;
    };

    const draw = () => {
      if (isMinimal) return;

      const { width, height, cols, rows, cell, tile } = state;
      const motion = reducedMotionQuery.matches ? 0.18 : 1;
      const t = time * motion;

      ctx.fillStyle = "#140705";
      ctx.fillRect(0, 0, width, height);

      const cx = cols * 0.5;
      const cy = rows * 0.5;
      const orbitA = Math.min(cols, rows) * 0.34;
      const orbitB = Math.min(cols, rows) * 0.26;

      // Four asynchronous orbital centres. Their different radii/speeds
      // make the field curve and fold instead of simply translating.
      const a1 = t * 0.92;
      const a2 = t * -0.73 + 1.8;
      const a3 = t * 0.56 + 3.2;
      const a4 = t * -0.41 + 5.1;

      const blobs = [
        {
          x: cx + Math.cos(a1) * orbitA,
          y: cy + Math.sin(a1) * orbitA * 0.76,
          size: Math.min(cols, rows) * 0.24,
          strength: 1.0,
        },
        {
          x: cx + Math.cos(a2) * orbitB * 1.15,
          y: cy + Math.sin(a2) * orbitB,
          size: Math.min(cols, rows) * 0.29,
          strength: 0.88,
        },
        {
          x: cx + Math.cos(a3) * orbitA * 0.72,
          y: cy + Math.sin(a3) * orbitA * 0.72,
          size: Math.min(cols, rows) * 0.18,
          strength: 0.75,
        },
        {
          x: cx + Math.cos(a4) * orbitB * 1.65,
          y: cy + Math.sin(a4) * orbitB * 0.65,
          size: Math.min(cols, rows) * 0.2,
          strength: 0.68,
        },
      ];

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;

          // Base organic texture.
          let brightness = fbm(col * 0.072 + t * 0.075, row * 0.072 - t * 0.035, 21 + t * 0.12);

          let colorField = fbm(col * 0.045 - t * 0.028, row * 0.045 + t * 0.022, 73 + t * 0.07);

          // Add orbiting circular light wells.
          let orbital = 0;
          let orbitalHue = 0;

          for (const blob of blobs) {
            const dx = col - blob.x;
            const dy = row - blob.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const q = dist / blob.size;
            const falloff = Math.exp(-q * q * 2.4) * blob.strength;

            orbital += falloff;

            // Swirl term rotates the pattern around each moving centre.
            const angle = Math.atan2(dy, dx);
            const ring = 0.5 + 0.5 * Math.sin(angle * 2.2 - dist * 0.56 + t * 2.4);
            orbital += ring * falloff * 0.28;
            orbitalHue += ring * falloff * 0.1;
          }

          // Fast circular ripple wrapping the whole field.
          const dx = col - cx;
          const dy = row - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const circularWave = 0.5 + 0.5 * Math.sin(dist * 0.24 - angle * 1.55 - t * 3.1);

          brightness = brightness * 0.46 + orbital * 0.9 + circularWave * 0.19;

          brightness = clamp01((brightness - 0.14) / 0.8);

          brightness = Math.pow(brightness, 0.72);

          colorField = clamp01(colorField * 0.72 + orbitalHue + circularWave * 0.16);

          const [r0, g0, b0] = colorAt(colorField, brightness);

          // Micro-breathing keeps the LED surface alive without flashing.
          const breathe = 0.95 + 0.055 * Math.sin(t * 1.25 + col * 0.71 - row * 0.43);

          ctx.fillStyle = `rgb(${Math.round(Math.max(0, Math.min(255, r0 * breathe)))} ${Math.round(
            Math.max(0, Math.min(255, g0 * breathe)),
          )} ${Math.round(Math.max(0, Math.min(255, b0 * breathe)))})`;

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
