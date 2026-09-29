import { useEffect, useRef } from "react";

/**
 * Animated LED Consciousness Background
 *
 * Concept:
 * The LED wall behaves like a tiny living world.
 *
 * Story cycle:
 *   AWAKE  -> THINK -> CREATE -> MOVE -> DREAM -> AWAKE
 *
 * Everything is still rendered procedurally on the LED grid.
 * No external images, videos, shaders, or cursor interaction.
 */

const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // ------------------------------------------------------------
    // CONFIG
    // ------------------------------------------------------------

    const CFG = {
      speed: 1,

      // LED grid
      cellDesktop: 20,
      cellTablet: 18,
      cellMobile: 16,

      // Base organic field
      waveScale: 0.1,
      waveDriftX: 0.06,
      waveDriftY: 0.025,
      waveEvolve: 0.09,

      colorScale: 0.05,
      colorDrift: 0.04,
      colorDriftY: 0.018,
      colorEvolve: 0.05,

      hueCycle: 0.012,

      threshold: 0.02,
      gamma: 0.95,
      floor: 0.55,

      // ----------------------------------------------------------
      // CINEMATIC STORY
      // ----------------------------------------------------------

      // Seconds per scene
      sceneDuration: 20,

      // Amount of time used to blend into next scene
      sceneTransition: 4,

      // How strongly the cinematic objects appear
      sceneStrength: 0.72,

      // Overall story speed
      storySpeed: 0.85,
    };

    /**
     * Same palette as your existing background.
     * No colors added.
     */
    const palette = [
      "#ff2d00",
      "#ff5400",
      "#ff6b1a",
      "#ff8510",
      "#ff9f1c",
      "#ffad24",
      "#ffbd32",
      "#ffd047",
      "#ffd60a",
      "#ffe566",
      "#ff8a3d",
      "#ff4d1a",
    ];

    // ------------------------------------------------------------
    // GRID
    // ------------------------------------------------------------

    let cell = CFG.cellDesktop;

    let cols = 0;
    let rows = 0;

    let width = 1;
    let height = 1;
    let dpr = 1;

    let hueSpin = 0;

    // ------------------------------------------------------------
    // UTILITIES
    // ------------------------------------------------------------

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const smooth = (t: number) => {
      const x = clamp01(t);
      return x * x * (3 - 2 * x);
    };

    const smoother = (t: number) => {
      const x = clamp01(t);
      return x * x * x * (x * (x * 6 - 15) + 10);
    };

    const rangeMask = (value: number, start: number, end: number, feather = 0.02) => {
      const a = smooth((value - start) / Math.max(feather, 0.0001));

      const b = smooth((end - value) / Math.max(feather, 0.0001));

      return a * b;
    };

    /**
     * Soft Gaussian blob.
     */
    const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => {
      const dx = (x - cx) / sx;
      const dy = (y - cy) / sy;

      return Math.exp(-(dx * dx + dy * dy) * 0.5);
    };

    /**
     * Distance from a point to a segment.
     */
    const segmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const vx = x2 - x1;
      const vy = y2 - y1;

      const wx = px - x1;
      const wy = py - y1;

      const c1 = vx * wx + vy * wy;
      const c2 = vx * vx + vy * vy;

      let t = c2 > 0 ? c1 / c2 : 0;

      t = clamp01(t);

      const sx = x1 + vx * t;
      const sy = y1 + vy * t;

      return Math.hypot(px - sx, py - sy);
    };

    /**
     * Glowing line used to create silhouettes,
     * paths, cables, limbs, etc.
     */
    const lineGlow = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, thickness: number) => {
      const d = segmentDistance(px, py, x1, y1, x2, y2);

      return Math.exp(-Math.pow(d / thickness, 2) * 2.5);
    };

    /**
     * Deterministic pseudo random.
     */
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

    // ------------------------------------------------------------
    // PALETTE LUT
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // CINEMATIC SCENES
    // ------------------------------------------------------------

    type SceneName = "awake" | "think" | "create" | "move" | "dream";

    const scenes: SceneName[] = ["awake", "think", "create", "move", "dream"];

    /**
     * Each scene returns:
     *
     * light -> how strongly the scene illuminates the LED
     * hue   -> subtle movement through the existing palette
     */
    const sceneContribution = (scene: SceneName, x: number, y: number, t: number, phase: number) => {
      let light = 0;
      let hue = 0;

      // ==========================================================
      // AWAKE
      // ==========================================================

      if (scene === "awake") {
        const cx = 0.5 + Math.sin(t * 0.07) * 0.16;

        const cy = 0.5 + Math.cos(t * 0.05) * 0.11;

        const d = Math.hypot(x - cx, y - cy);

        // Expanding consciousness wave
        const waveRadius = 0.04 + phase * 0.42;

        const waveWidth = 0.028;

        const ring = Math.exp(-Math.pow((d - waveRadius) / waveWidth, 2));

        // Living core
        const core = gaussian(x, y, cx, cy, 0.085, 0.085) * (0.55 + 0.45 * Math.sin(t * 1.6));

        // Secondary breathing field
        const breathing = Math.sin(d * 35 - t * 1.8) * Math.exp(-d * 4.5) * 0.18;

        light = ring * 0.75 + core * 0.75 + breathing;

        hue = 0.01 * Math.sin(t * 0.2);
      }

      // ==========================================================
      // THINK
      // ==========================================================

      if (scene === "think") {
        /**
         * Abstract human figure.
         * Kept intentionally impressionistic:
         * LEDs suggest the presence of a person,
         * rather than drawing a literal detailed human.
         */

        const headX = 0.4;
        const headY = 0.42;

        const head = gaussian(x, y, headX, headY, 0.052, 0.06);

        const neck = gaussian(x, y, headX, 0.49, 0.035, 0.045);

        const torso = gaussian(x, y, 0.4, 0.6, 0.095, 0.16);

        // Arms toward a subtle desk
        const arm1 = lineGlow(x, y, 0.35, 0.56, 0.52, 0.67, 0.018);

        const arm2 = lineGlow(x, y, 0.45, 0.57, 0.57, 0.67, 0.018);

        // Desk
        const desk = lineGlow(x, y, 0.27, 0.7, 0.63, 0.7, 0.014);

        // Monitor/luminous object
        const monitor = gaussian(x, y, 0.6, 0.58, 0.055, 0.035);

        // ------------------------------------------------------
        // Thought orbit
        // ------------------------------------------------------

        const orbitAngle = t * 0.65;

        const thoughtX = headX + Math.cos(orbitAngle) * 0.15;

        const thoughtY = headY + Math.sin(orbitAngle) * 0.11;

        const thought = gaussian(x, y, thoughtX, thoughtY, 0.028, 0.028);

        // Smaller orbit particle
        const orbit2 = gaussian(
          x,
          y,
          headX + Math.cos(orbitAngle * 1.7) * 0.2,
          headY + Math.sin(orbitAngle * 1.7) * 0.15,
          0.016,
          0.016,
        );

        // Thought connection
        const thoughtLine = lineGlow(x, y, headX, headY, thoughtX, thoughtY, 0.008);

        light =
          head * 0.55 +
          neck * 0.2 +
          torso * 0.42 +
          arm1 * 0.36 +
          arm2 * 0.3 +
          desk * 0.22 +
          monitor * 0.32 +
          thought * 0.95 +
          orbit2 * 0.55 +
          thoughtLine * 0.25;

        hue = 0.045 + Math.sin(t * 0.3) * 0.01;
      }

      // ==========================================================
      // CREATE
      // ==========================================================

      if (scene === "create") {
        /**
         * A world assembling itself.
         *
         * The vertical structures rise and fall slowly,
         * while light moves upward through them.
         */

        const floor = 0.8;

        const buildingXs = [0.11, 0.21, 0.31, 0.43, 0.55, 0.67, 0.79, 0.89];

        for (let i = 0; i < buildingXs.length; i++) {
          const bx = buildingXs[i];

          const h = 0.16 + 0.3 * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 0.35));

          const top = floor - h;

          const horizontal = Math.exp(-Math.pow((x - bx) / 0.035, 2));

          const vertical = rangeMask(y, top, floor, 0.025);

          const scan = 0.55 + 0.45 * Math.sin(y * 34 - t * 2.2 + i);

          light += horizontal * vertical * scan * 0.32;

          // Building core
          light += gaussian(x, y, bx, top + h * 0.55, 0.025, h * 0.55) * 0.1;
        }

        // Rising "creative energy"
        const energyX = 0.48 + Math.sin(t * 0.16) * 0.15;

        const energyLine = Math.exp(-Math.pow((x - energyX) / 0.025, 2)) * Math.exp(-Math.pow((y - 0.52) / 0.28, 2));

        const movingEnergy = 0.5 + 0.5 * Math.sin(y * 26 - t * 2.8);

        light += energyLine * movingEnergy * 0.46;

        // Horizon
        light += lineGlow(x, y, 0.05, floor, 0.95, floor, 0.014) * 0.45;

        hue = 0.085 + Math.sin(t * 0.22) * 0.015;
      }

      // ==========================================================
      // MOVE
      // ==========================================================

      if (scene === "move") {
        /**
         * Abstract walking human.
         * The figure travels across the LED wall.
         */

        const travel = phase;

        const personX = -0.18 + travel * 1.36;

        const groundY = 0.75;

        const headY = 0.43;
        const shoulderY = 0.51;
        const hipY = 0.63;

        const step = Math.sin(phase * Math.PI * 8);

        const head = gaussian(x, y, personX, headY, 0.04, 0.045);

        const torso = lineGlow(x, y, personX, shoulderY, personX, hipY, 0.034);

        const shoulder = lineGlow(x, y, personX - 0.08, shoulderY, personX + 0.08, shoulderY, 0.02);

        // Left arm
        const leftArm = lineGlow(x, y, personX - 0.05, shoulderY, personX - 0.1, 0.62 + step * 0.025, 0.015);

        // Right arm
        const rightArm = lineGlow(x, y, personX + 0.05, shoulderY, personX + 0.1, 0.62 - step * 0.025, 0.015);

        // Left leg
        const leftLeg = lineGlow(x, y, personX, hipY, personX - 0.065 + step * 0.035, groundY, 0.017);

        // Right leg
        const rightLeg = lineGlow(x, y, personX, hipY, personX + 0.065 - step * 0.035, groundY, 0.017);

        // Foot shadow
        const shadow = gaussian(x, y, personX, groundY + 0.015, 0.13, 0.018);

        // Motion trail
        const trail = gaussian(x, y, personX - 0.13, 0.58, 0.16, 0.14) * 0.28;

        light =
          head * 0.75 +
          torso * 0.68 +
          shoulder * 0.28 +
          leftArm * 0.32 +
          rightArm * 0.32 +
          leftLeg * 0.42 +
          rightLeg * 0.42 +
          shadow * 0.18 +
          trail;

        hue = 0.03 + Math.sin(t * 0.16) * 0.02;
      }

      // ==========================================================
      // DREAM
      // ==========================================================

      if (scene === "dream") {
        /**
         * Planet + orbit + particles.
         * The scene deliberately feels less "human"
         * and more like the world has become self-aware.
         */

        const cx = 0.57 + Math.cos(t * 0.1) * 0.1;

        const cy = 0.49 + Math.sin(t * 0.13) * 0.07;

        const planet = gaussian(x, y, cx, cy, 0.15, 0.15);

        // Planet rim
        const planetDistance = Math.hypot(x - cx, y - cy);

        const rim = Math.exp(-Math.pow((planetDistance - 0.15) / 0.018, 2));

        // Elliptical orbit ring
        const ox = (x - cx) / 0.31;

        const oy = (y - cy) / 0.085;

        const orbitDistance = Math.abs(Math.hypot(ox, oy) - 1);

        const orbitRing = Math.exp(-Math.pow(orbitDistance / 0.045, 2));

        // Orbiting light particle
        const angle = t * 0.42;

        const particleX = cx + Math.cos(angle) * 0.31;

        const particleY = cy + Math.sin(angle) * 0.085;

        const particle = gaussian(x, y, particleX, particleY, 0.025, 0.025);

        // Deep-space particles
        const stars = Math.pow(fbm(x * 8, y * 8, 77.0), 11);

        // Slow cosmic wave
        const cosmicWave = Math.sin(x * 10 + y * 7 - t * 0.65) * 0.5 + 0.5;

        light =
          planet * 0.46 +
          rim * 0.6 +
          orbitRing * 0.34 +
          particle * 0.9 +
          stars * 0.45 +
          cosmicWave * gaussian(x, y, 0.5, 0.52, 0.6, 0.6) * 0.08;

        hue = 0.14 + Math.sin(t * 0.12) * 0.02;
      }

      return {
        light: clamp01(light),
        hue,
      };
    };

    // ------------------------------------------------------------
    // SCENE MIXING
    // ------------------------------------------------------------

    const getSceneState = (time: number) => {
      const storyTime = time * CFG.storySpeed;

      const totalSceneTime = CFG.sceneDuration;

      const scenePosition = storyTime / totalSceneTime;

      const sceneIndex = Math.floor(scenePosition) % scenes.length;

      const phase = scenePosition - Math.floor(scenePosition);

      const nextIndex = (sceneIndex + 1) % scenes.length;

      /**
       * Only start crossfading toward the next scene
       * near the end of the current scene.
       */
      const transitionStart = 1 - CFG.sceneTransition / CFG.sceneDuration;

      const transitionProgress = clamp01((phase - transitionStart) / (1 - transitionStart));

      const blend = smoother(transitionProgress);

      return {
        current: scenes[sceneIndex],
        next: scenes[nextIndex],
        phase,
        blend,
      };
    };

    // ------------------------------------------------------------
    // RESIZE
    // ------------------------------------------------------------

    const resize = () => {
      if (window.innerWidth <= 768) {
        cell = CFG.cellMobile;
      } else if (window.innerWidth <= 900) {
        cell = CFG.cellTablet;
      } else {
        cell = CFG.cellDesktop;
      }

      const rect = canvas.getBoundingClientRect();

      width = Math.max(1, Math.ceil(rect.width));

      height = Math.max(1, Math.ceil(rect.height));

      cols = Math.ceil(width / cell) + 2;

      rows = Math.ceil(height / cell) + 2;

      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.ceil(width * dpr);

      canvas.height = Math.ceil(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.imageSmoothingEnabled = false;

      document.documentElement.style.setProperty("--cell", `${cell}px`);
    };

    // ------------------------------------------------------------
    // DRAW
    // ------------------------------------------------------------

    const draw = () => {
      if (isMinimal) return;

      const motion = reducedMotionQuery.matches ? 0.18 : 1;

      const t = realT * CFG.speed * motion;

      ctx.clearRect(0, 0, width, height);

      const story = getSceneState(t);

      for (let row = 0; row < rows; row++) {
        const py = row * cell;

        /**
         * Normalized Y coordinate.
         */
        const ny = row / Math.max(rows - 1, 1);

        for (let col = 0; col < cols; col++) {
          const px = col * cell;

          /**
           * Normalized X coordinate.
           */
          const nx = col / Math.max(cols - 1, 1);

          // ------------------------------------------------------
          // BASE ORGANIC FIELD
          // ------------------------------------------------------

          let brightness = fbm(
            col * CFG.waveScale + t * CFG.waveDriftX,

            row * CFG.waveScale + t * CFG.waveDriftY,

            t * CFG.waveEvolve + 47.1,
          );

          brightness = (brightness - CFG.threshold) / (1 - CFG.threshold);

          brightness = brightness < 0 ? 0 : Math.pow(brightness, CFG.gamma);

          // ------------------------------------------------------
          // BASE COLOR FIELD
          // ------------------------------------------------------

          let colorField = fbm(
            col * CFG.colorScale + t * CFG.colorDrift,

            row * CFG.colorScale + t * CFG.colorDriftY,

            t * CFG.colorEvolve,
          );

          colorField += t * CFG.hueCycle;

          colorField -= Math.floor(colorField);

          colorField += Math.sin(t * 0.18 + col * 0.017 + row * 0.009 + hueSpin) * 0.025;

          colorField -= Math.floor(colorField);

          // ------------------------------------------------------
          // CINEMATIC SCENE
          // ------------------------------------------------------

          const currentScene = sceneContribution(story.current, nx, ny, t, story.phase);

          const nextScene = sceneContribution(story.next, nx, ny, t, 0);

          const sceneLight = lerp(currentScene.light, nextScene.light, story.blend);

          const sceneHue = lerp(currentScene.hue, nextScene.hue, story.blend);

          /**
           * Scene light bends the existing organic field
           * rather than replacing it.
           *
           * This is what makes the cinematic objects
           * feel embedded inside the LED world.
           */
          brightness = brightness * 0.66 + sceneLight * CFG.sceneStrength;

          brightness = clamp01(CFG.floor + (1 - CFG.floor) * brightness);

          // Palette movement
          colorField += sceneHue;

          colorField -= Math.floor(colorField);

          // Slight scene-based color breathing
          colorField += Math.sin(t * 0.11 + nx * 2.7 - ny * 1.8) * 0.018;

          colorField -= Math.floor(colorField);

          // ------------------------------------------------------
          // COLOR LOOKUP
          // ------------------------------------------------------

          const hueIndex = Math.min(511, Math.max(0, (colorField * 512) | 0));

          const bIndex = Math.min(63, Math.max(0, (brightness * 64) | 0));

          const m = (bIndex + 0.5) / 64;

          const offset = hueIndex * 3;

          const rr = lut[offset] * m;

          const gg = lut[offset + 1] * m;

          const bb = lut[offset + 2] * m;

          ctx.fillStyle = `rgb(${rr | 0} ${gg | 0} ${bb | 0})`;

          /**
           * Slight overlap keeps the LED wall seamless.
           */
          ctx.fillRect(px, py, cell + 0.5, cell + 0.5);
        }
      }
    };

    // ------------------------------------------------------------
    // ANIMATION
    // ------------------------------------------------------------

    const tick = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);

      last = now;

      realT += dt;

      hueSpin += dt * 0.04;

      draw();

      raf = requestAnimationFrame(tick);
    };

    // ------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // MINIMAL THEME
    // ------------------------------------------------------------

    const observer = new MutationObserver(() => {
      isMinimal = document.documentElement.dataset.theme === "minimal";

      if (!isMinimal) {
        draw();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // ------------------------------------------------------------
    // START
    // ------------------------------------------------------------

    resize();

    draw();

    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", handleResize, { passive: true });

    window.addEventListener("orientationchange", handleResize, { passive: true });

    document.addEventListener("visibilitychange", handleVisibility);

    // ------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------

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
