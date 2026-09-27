import { useEffect, useRef } from "react";

/**
 * Living LED wallpaper.
 *
 * Inspired by procedural LED-wall techniques, but implemented independently
 * for this site. The cursor is deliberately NOT used anywhere in the system.
 *
 * Visual model:
 *   1. A fixed 20px-ish LED grid.
 *   2. Large procedural color masses drifting slowly underneath it.
 *   3. Medium/fine noise evolving at different rates.
 *   4. Per-cell breathing so the wall feels alive instead of like one image
 *      translating from left to right.
 */
const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let animationFrame = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let accumulator = 0;
    let active = true;
    let minimalTheme = document.documentElement.dataset.theme === "minimal";

    const state = {
      width: 1,
      height: 1,
      dpr: 1,
      tile: 19,
      cell: 20,
      cols: 0,
      rows: 0,
    };

    /* Warm GD palette: deep ember → orange → amber → lemon. */
    const palette = [
      [250, 48, 8],
      [255, 67, 12],
      [255, 90, 14],
      [255, 116, 14],
      [255, 143, 15],
      [255, 169, 20],
      [255, 195, 34],
      [255, 216, 62],
      [255, 229, 106],
      [255, 164, 42],
    ] as const;

    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

    const mix = (a: number, b: number, t: number) => a + (b - a) * t;

    const smootherstep = (t: number) => {
      const x = clamp01(t);
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    const hash = (x: number, y: number, seed: number) => {
      const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;

      return value - Math.floor(value);
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

      return mix(mix(a, b, tx), mix(c, d, tx), ty);
    };

    const fbm = (x: number, y: number, seed: number, octaves = 4) => {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      let totalAmplitude = 0;

      for (let i = 0; i < octaves; i += 1) {
        value += valueNoise(x * frequency, y * frequency, seed + i * 19.17) * amplitude;

        totalAmplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      return totalAmplitude > 0 ? value / totalAmplitude : 0;
    };

    const chooseGeometry = () => {
      if (window.innerWidth <= 768) {
        state.tile = 16;
      } else if (window.innerWidth <= 900) {
        state.tile = 17;
      } else {
        state.tile = 19;
      }

      state.cell = state.tile + 1;
    };

    const resize = () => {
      chooseGeometry();

      const rect = canvas.getBoundingClientRect();

      state.width = Math.max(1, Math.ceil(rect.width));
      state.height = Math.max(1, Math.ceil(rect.height));

      state.cols = Math.ceil(state.width / state.cell) + 2;
      state.rows = Math.ceil(state.height / state.cell) + 2;

      /* Cap DPR so Retina screens do not multiply the wallpaper cost. */
      state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.ceil(state.width * state.dpr);
      canvas.height = Math.ceil(state.height * state.dpr);

      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = "#120806";
      ctx.fillRect(0, 0, state.width, state.height);
    };

    const draw = () => {
      if (minimalTheme) return;

      const { width, height, cols, rows, cell, tile } = state;

      const reduced = reducedMotionQuery.matches;
      const motion = reduced ? 0.18 : 1;
      const t = elapsed * motion;

      ctx.fillStyle = "#120806";
      ctx.fillRect(0, 0, width, height);

      /*
       * These are intentionally close to the movement scale used by the
       * reference behavior: the pattern evolves continuously rather than
       * completing an obvious CSS-style loop.
       */
      const broadX = t * 0.043;
      const broadY = t * 0.021;

      const colorX = t * 0.031;
      const colorY = t * 0.014;

      const fineX = t * 0.071;
      const fineY = -t * 0.033;

      for (let row = 0; row < rows; row += 1) {
        const y = row * cell;
        if (y > height + cell) continue;

        for (let col = 0; col < cols; col += 1) {
          const x = col * cell;
          if (x > width + cell) continue;

          /* Large flowing atmospheric field. */
          const broad = fbm(col * 0.078 + broadX, row * 0.071 + broadY, 7.3, 4);

          /* Separate color field moving at a different angle/speed. */
          const color = fbm(col * 0.105 + colorX, row * 0.095 + colorY, 43.7, 4);

          /* Fine variation prevents the wall from behaving as one blob. */
          const fine = fbm(col * 0.225 + fineX, row * 0.185 + fineY, 91.1, 3);

          /* Slow traveling wave across the individual LEDs. */
          const wave = 0.5 + 0.5 * Math.sin(t * 0.42 + col * 0.105 + row * 0.037);

          /* Per-cell breathing, intentionally subtle but visible. */
          const localBreath = 0.5 + 0.5 * Math.sin(t * 0.28 + col * 0.63 + row * 0.47 + broad * 4.3);

          /*
           * Brightness is deliberately more dynamic than the previous
           * version. The LEDs should visibly live, not merely change by
           * one or two RGB values.
           */
          let brightness = 0.24 + broad * 0.42 + color * 0.18 + fine * 0.08;

          brightness += (wave - 0.5) * 0.12;

          brightness += (localBreath - 0.5) * 0.16;

          brightness = clamp01(brightness);

          /*
           * Bias the color field toward orange/amber while allowing small
           * pockets to reach yellow. This keeps the existing aesthetic.
           */
          let palettePosition = color * 0.72 + broad * 0.28;

          palettePosition = clamp01(palettePosition * 1.18 - 0.04);

          const scaledPalette = palettePosition * (palette.length - 1);

          const paletteIndex = Math.floor(scaledPalette);

          const nextPaletteIndex = Math.min(palette.length - 1, paletteIndex + 1);

          const paletteMix = smootherstep(scaledPalette - paletteIndex);

          let red = mix(palette[paletteIndex][0], palette[nextPaletteIndex][0], paletteMix);

          let green = mix(palette[paletteIndex][1], palette[nextPaletteIndex][1], paletteMix);

          let blue = mix(palette[paletteIndex][2], palette[nextPaletteIndex][2], paletteMix);

          /* Nonlinear response = brighter centers without harsh flicker. */
          const glow = Math.pow(brightness, 0.76);

          red *= 0.36 + glow * 0.76;
          green *= 0.3 + glow * 0.78;
          blue *= 0.26 + glow * 0.8;

          /* Local LED imperfection: tiny phase offsets, no randomness/flicker. */
          const micro = 0.985 + 0.035 * Math.sin(t * 0.52 + col * 0.81 - row * 0.37);

          red *= micro;
          green *= micro;
          blue *= micro;

          const r = Math.round(Math.max(0, Math.min(255, red)));
          const g = Math.round(Math.max(0, Math.min(255, green)));
          const b = Math.round(Math.max(0, Math.min(255, blue)));

          ctx.fillStyle = `rgb(${r} ${g} ${b})`;
          ctx.fillRect(x, y, tile, tile);
        }
      }
    };

    const tick = (now: number) => {
      if (!active) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);

      lastTime = now;
      elapsed += dt;
      accumulator += dt;

      /* 45fps is enough for a very slow light field and saves CPU/GPU. */
      if (accumulator >= 1 / 45) {
        accumulator = 0;
        draw();
      }

      animationFrame = requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      active = !document.hidden;

      cancelAnimationFrame(animationFrame);

      if (active) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const handleResize = () => {
      resize();
      draw();
    };

    const themeObserver = new MutationObserver(() => {
      minimalTheme = document.documentElement.dataset.theme === "minimal";

      if (!minimalTheme) draw();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    resize();
    draw();

    animationFrame = requestAnimationFrame(tick);

    window.addEventListener("resize", handleResize, { passive: true });

    window.addEventListener("orientationchange", handleResize, { passive: true });

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      themeObserver.disconnect();

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
