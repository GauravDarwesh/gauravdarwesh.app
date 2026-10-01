import { useEffect, useRef } from "react";

type AnimatedLedBackgroundProps = {
  pathname: string;
};

type BackgroundMood = "gdx" | "classic" | "notions" | "visuals" | "other";

const moodForPath = (pathname: string): BackgroundMood => {
  if (pathname === "/") return "gdx";
  if (pathname === "/hobbies") return "classic";
  if (pathname === "/blog") return "notions";
  if (pathname === "/visuals") return "visuals";
  return "other";
};

const AnimatedLedBackground = ({ pathname }: AnimatedLedBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mood = moodForPath(pathname);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let last = performance.now();
    let realT = 0;
    let running = true;
    let isMinimal = document.documentElement.dataset.theme === "minimal";

    const CFG = {
      speed: mood === "visuals" ? 0.34 : mood === "notions" ? 0.48 : 0.58,
      waveScale: 0.055,
      waveDriftX: 0.028,
      waveDriftY: 0.014,
      waveEvolve: 0.045,
      colorScale: 0.027,
      colorDrift: 0.021,
      colorDriftY: 0.01,
      colorEvolve: 0.026,
      hueCycle: 0.0035,
      threshold: 0.08,
      gamma: 1.22,
      floor: mood === "gdx" ? 0.34 : mood === "visuals" ? 0.16 : 0.24,
    };

    const palette = [
      "#120407",
      "#26070b",
      "#430b0b",
      "#6d160e",
      "#9b2c12",
      "#d44a16",
      "#f2761b",
      "#ffad32",
      "#cf4215",
      "#72120d",
      "#300609",
      "#180407",
    ];

    let cell = 20;
    let cols = 0;
    let rows = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let hueSpin = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    const canTrackPointer = window.matchMedia("(pointer: fine)").matches && !reducedMotionQuery.matches;

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const smooth = (t: number) => {
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
      0.62 * noise3(x, y, z) + 0.38 * noise3(x * 2.17 + 11.3, y * 2.17 + 7.9, z * 2.17 + 3.1);

    const stops = palette.map((hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]);

    const lut = new Uint8ClampedArray(512 * 3);

    const fillLUT = () => {
      const n = stops.length;
      for (let k = 0; k < 512; k++) {
        const s = (k / 512) * n;
        const i0 = Math.floor(s);
        let f = s - i0;
        f = f * f * (3 - 2 * f);
        const a = stops[i0 % n];
        const b = stops[(i0 + 1) % n];
        for (let c = 0; c < 3; c++) {
          lut[k * 3 + c] = Math.sqrt(a[c] * a[c] * (1 - f) + b[c] * b[c] * f);
        }
      }
    };

    fillLUT();

    const resize = () => {
      if (window.innerWidth <= 768) cell = 22;
      else if (window.innerWidth <= 900) cell = 20;
      else cell = 18;

      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.ceil(rect.width));
      height = Math.max(1, Math.ceil(rect.height));

      // Extra cells avoid exposed edges during fractional viewport sizes
      cols = Math.ceil(width / cell) + 2;
      rows = Math.ceil(height / cell) + 2;

      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      document.documentElement.style.setProperty("--cell", `${cell}px`);
    };

    const draw = () => {
      if (isMinimal) return;

      const motion = reducedMotionQuery.matches ? 0.18 : 1;

      const wtW = realT * CFG.speed * motion;
      const wtC = realT * CFG.speed * motion;

      ctx.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        const py = row * cell;

        for (let col = 0; col < cols; col += 1) {
          const px = col * cell;

          let brightness = fbm(
            col * CFG.waveScale + wtW * CFG.waveDriftX,
            row * CFG.waveScale + wtW * CFG.waveDriftY,
            wtW * CFG.waveEvolve + 47.1,
          );

          brightness = (brightness - CFG.threshold) / (1 - CFG.threshold);
          brightness = brightness < 0 ? 0 : Math.pow(brightness, CFG.gamma);
          brightness = CFG.floor + (1 - CFG.floor) * clamp01(brightness);

          let colorField = fbm(
            col * CFG.colorScale + wtC * CFG.colorDrift,
            row * CFG.colorScale + wtC * CFG.colorDriftY,
            wtC * CFG.colorEvolve,
          );

          colorField += wtC * CFG.hueCycle;
          colorField -= Math.floor(colorField);

          colorField += Math.sin(wtC * 0.18 + col * 0.017 + row * 0.009 + hueSpin) * 0.025;
          colorField -= Math.floor(colorField);

          const hueIndex = Math.min(511, Math.max(0, (colorField * 512) | 0));
          const bIndex = Math.min(63, Math.max(0, (brightness * 64) | 0));

          const m = (bIndex + 0.5) / 64;
          const o = hueIndex * 3;

          const saturation = mood === "notions" ? 0.72 : mood === "visuals" ? 0.62 : 1;
          const luminance = mood === "visuals" ? 0.58 : mood === "classic" ? 0.82 : 1;
          const average = (lut[o] + lut[o + 1] + lut[o + 2]) / 3;
          const rr = (average + (lut[o] - average) * saturation) * m * luminance;
          const gg = (average + (lut[o + 1] - average) * saturation) * m * luminance;
          const bb = (average + (lut[o + 2] - average) * saturation) * m * luminance;

          ctx.fillStyle = `rgb(${rr | 0} ${gg | 0} ${bb | 0})`;
          // Draw flush with +0.5 to avoid subpixel seam artifacts
          ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
        }
      }
    };

    const tick = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);

      last = now;
      realT += dt;
      hueSpin += dt * 0.04;
      pointerX += (pointerTargetX - pointerX) * 0.025;
      pointerY += (pointerTargetY - pointerY) * 0.025;
      document.documentElement.style.setProperty("--ember-shift-x", `${pointerX.toFixed(2)}px`);
      document.documentElement.style.setProperty("--ember-shift-y", `${pointerY.toFixed(2)}px`);

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

    const handlePointerMove = (event: PointerEvent) => {
      if (!canTrackPointer) return;
      pointerTargetX = ((event.clientX / window.innerWidth) * 2 - 1) * 16;
      pointerTargetY = ((event.clientY / window.innerHeight) * 2 - 1) * 12;
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
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.documentElement.style.removeProperty("--ember-shift-x");
      document.documentElement.style.removeProperty("--ember-shift-y");
    };
  }, [mood]);

  return (
    <div aria-hidden="true" className="site-background orange-bg" data-background-mood={mood}>
      <canvas ref={canvasRef} className="led-wallpaper-canvas" />
      <div className="ember-illumination" />
      <div className="ember-texture" />
    </div>
  );
};

export default AnimatedLedBackground;
