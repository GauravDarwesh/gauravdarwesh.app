import { useEffect, useRef } from "react";

/**
 * Procedural LED wallpaper.
 *
 * The animation is entirely time-driven.
 * There are NO mouse/pointer listeners.
 */
const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let running = true;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      cols: 0,
      rows: 0,
      cell: 20,
      tile: 19,
      time: 0,
      frameAccumulator: 0,
    };

    /*
     * Warm palette for your portfolio.
     * This is intentionally your own palette rather than copying the
     * reference site's exact colors.
     */
    const palette = [
      [255, 67, 17],
      [255, 92, 20],
      [255, 123, 18],
      [255, 153, 17],
      [255, 184, 36],
      [255, 207, 64],
      [255, 222, 104],
      [255, 151, 48],
    ] as const;

    const clamp01 = (n: number) =>
      Math.max(0, Math.min(1, n));

    const lerp = (
      a: number,
      b: number,
      t: number,
    ) => a + (b - a) * t;

    const smooth = (t: number) =>
      t * t * (3 - 2 * t);

    /*
     * Deterministic hash.
     *
     * It looks random, but the same coordinates always produce the
     * same result. That is important because we want smooth movement
     * rather than flickering random LEDs.
     */
    const hash = (
      x: number,
      y: number,
      seed: number,
    ) => {
      const s =
        Math.sin(
          x * 127.1 +
            y * 311.7 +
            seed * 74.7,
        ) * 43758.5453123;

      return s - Math.floor(s);
    };

    /*
     * Smooth value noise.
     */
    const valueNoise = (
      x: number,
      y: number,
      seed: number,
    ): number => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);

      const tx = smooth(x - x0);
      const ty = smooth(y - y0);

      const a = hash(x0, y0, seed);
      const b = hash(x0 + 1, y0, seed);
      const c = hash(x0, y0 + 1, seed);
      const d = hash(x0 + 1, y0 + 1, seed);

      return lerp(
        lerp(a, b, tx),
        lerp(c, d, tx),
        ty,
      );
    };

    /*
     * Fractional Brownian Motion.
     *
     * Multiple noise frequencies give us:
     * - large moving color masses
     * - medium movement
     * - small local variation
     */
    const fbm = (
      x: number,
      y: number,
      seed: number,
      octaves = 4,
    ): number => {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      let weight = 0;

      for (
        let octave = 0;
        octave < octaves;
        octave += 1
      ) {
        value +=
          valueNoise(
            x * frequency,
            y * frequency,
            seed + octave * 17.31,
          ) * amplitude;

        weight += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      return weight > 0
        ? value / weight
        : 0;
    };

    const getCellGeometry = () => {
      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth <= 900;

      state.tile = isMobile
        ? 16
        : isTablet
          ? 17
          : 19;

      state.cell = state.tile + 1;
    };

    const resize = () => {
      getCellGeometry();

      const rect =
        canvas.getBoundingClientRect();

      state.width = Math.max(
        1,
        Math.ceil(rect.width),
      );

      state.height = Math.max(
        1,
        Math.ceil(rect.height),
      );

      state.cols =
        Math.ceil(
          state.width / state.cell,
        ) + 2;

      state.rows =
        Math.ceil(
          state.height / state.cell,
        ) + 2;

      /*
       * Do not render at 2x/3x/4x DPR.
       * That would make a constantly-running wallpaper
       * needlessly expensive on Retina displays.
       */
      state.dpr = Math.min(
        window.devicePixelRatio || 1,
        1.5,
      );

      canvas.width = Math.ceil(
        state.width * state.dpr,
      );

      canvas.height = Math.ceil(
        state.height * state.dpr,
      );

      ctx.setTransform(
        state.dpr,
        0,
        0,
        state.dpr,
        0,
        0,
      );

      ctx.imageSmoothingEnabled = true;

      ctx.fillStyle = "#130906";
      ctx.fillRect(
        0,
        0,
        state.width,
        state.height,
      );
    };

    const draw = () => {
      const {
        width,
        height,
        cols,
        rows,
        cell,
        tile,
      } = state;

      /*
       * Deep base tone underneath everything.
       */
      ctx.fillStyle = "#130906";

      ctx.fillRect(
        0,
        0,
        width,
        height,
      );

      const t = state.time;

      const motion =
        prefersReducedMotion.matches
          ? 0.06
          : 1;

      /*
       * Large-scale movement.
       *
       * These numbers are intentionally slow.
       * The field takes a long time to travel across the screen.
       */
      const driftX =
        t * 0.010 * motion;

      const driftY =
        t * 0.006 * motion;

      const colorDrift =
        t * 0.0075 * motion;

      for (
        let row = 0;
        row < rows;
        row += 1
      ) {
        const y = row * cell;

        if (y > height + cell)
          continue;

        for (
          let col = 0;
          col < cols;
          col += 1
        ) {
          const x = col * cell;

          if (x > width + cell)
            continue;

          /*
           * Broad moving structure.
           *
           * This produces big pools of orange/yellow
           * that migrate slowly.
           */
          const broad = fbm(
            col * 0.045 + driftX,
            row * 0.045 + driftY,
            11.7,
            4,
          );

          /*
           * Medium-scale movement.
           *
           * Stops everything from looking like one giant
           * gradient simply translating across the page.
           */
          const medium = fbm(
            col * 0.095 -
              driftY * 1.25,
            row * 0.085 +
              colorDrift * 0.8,
            42.9,
            3,
          );

          /*
           * Small-scale variation.
           */
          const fine = fbm(
            col * 0.21 +
              t * 0.0025 * motion,
            row * 0.18 -
              t * 0.0017 * motion,
            81.4,
            2,
          );

          /*
           * Organic breathing.
           *
           * Each region breathes slightly differently,
           * rather than the entire wallpaper pulsing
           * simultaneously.
           */
          const breatheWave =
            0.5 +
            0.5 *
              Math.sin(
                t *
                  0.18 *
                  motion +
                  broad * 3.4 +
                  col * 0.013 -
                  row * 0.009,
              );

          /*
           * Combine the fields.
           */
          const colorField =
            clamp01(
              broad * 0.58 +
                medium * 0.30 +
                fine * 0.12,
            );

          let brightness =
            0.20 +
            broad * 0.43 +
            medium * 0.19 +
            fine * 0.08;

          brightness +=
            (breatheWave - 0.5) *
            0.14;

          brightness =
            clamp01(brightness);

          /*
           * Convert our field into a position
           * inside the orange → amber → yellow palette.
           */
          const palettePosition =
            clamp01(
              colorField * 1.12 +
                Math.sin(
                  t * 0.055,
                ) * 0.035,
            ) *
            (palette.length - 1);

          const p0 =
            Math.floor(
              palettePosition,
            );

          const p1 =
            Math.min(
              palette.length - 1,
              p0 + 1,
            );

          const mix =
            smooth(
              palettePosition - p0,
            );

          let r = lerp(
            palette[p0][0],
            palette[p1][0],
            mix,
          );

          let g = lerp(
            palette[p0][1],
            palette[p1][1],
            mix,
          );

          let b = lerp(
            palette[p0][2],
            palette[p1][2],
            mix,
          );

          /*
           * Turn the noise field into perceived LED brightness.
           */
          const glow =
            Math.pow(
              brightness,
              0.82,
            );

          r *=
            0.44 + glow * 0.62;

          g *=
            0.38 + glow * 0.67;

          b *=
            0.30 + glow * 0.73;

          /*
           * Extremely subtle local breathing.
           *
           * This prevents large groups from appearing mechanically
           * synchronized while remaining far away from flicker.
           */
          const localPulse =
            0.96 +
            0.04 *
              Math.sin(
                t * 0.35 +
                  col * 0.73 +
                  row * 0.41,
              );

          r *= localPulse;
          g *= localPulse;
          b *= localPulse;

          r = Math.max(
            0,
            Math.min(
              255,
              Math.round(r),
            ),
          );

          g = Math.max(
            0,
            Math.min(
              255,
              Math.round(g),
            ),
          );

          b = Math.max(
            0,
            Math.min(
              255,
              Math.round(b),
            ),
          );

          /*
           * The 1px separator is NOT drawn here.
           * CSS draws the fixed grid over the canvas.
           */
          ctx.fillStyle =
            `rgb(${r} ${g} ${b})`;

          ctx.fillRect(
            x,
            y,
            tile,
            tile,
          );
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;

      const dt = Math.min(
        (now - last) / 1000,
        0.05,
      );

      last = now;

      /*
       * Time is in seconds.
       */
      state.time += dt;

      /*
       * Render at ~36fps.
       *
       * Because the movement itself is very slow,
       * this still looks fluid but costs less than
       * rendering at 60fps.
       */
      state.frameAccumulator += dt;

      if (
        state.frameAccumulator >=
        1 / 36
      ) {
        state.frameAccumulator = 0;
        draw();
      }

      raf =
        requestAnimationFrame(tick);
    };

    const handleVisibility = () => {
      running =
        !document.hidden;

      if (running) {
        last =
          performance.now();

        cancelAnimationFrame(
          raf,
        );

        raf =
          requestAnimationFrame(
            tick,
          );
      } else {
        cancelAnimationFrame(
          raf,
        );
      }
    };

    const handleResize = () => {
      resize();
    };

    resize();

    draw();

    raf =
      requestAnimationFrame(tick);

    window.addEventListener(
      "resize",
      handleResize,
      { passive: true },
    );

    window.addEventListener(
      "orientationchange",
      handleResize,
      { passive: true },
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      running = false;

      cancelAnimationFrame(
        raf,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "orientationchange",
        handleResize,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="site-background orange-bg"
    >
      <canvas
        ref={canvasRef}
        className="led-wallpaper-canvas"
      />
    </div>
  );
};

export default AnimatedLedBackground;
