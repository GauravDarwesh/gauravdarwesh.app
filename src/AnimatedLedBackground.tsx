import { useEffect, useRef } from "react";

/* ============================================================
 * PALETTE — verbatim from the original file. Do not modify.
 * ============================================================ */
const PALETTE: readonly string[] = [
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

/* ============================================================
 * SUBSTRATE_CFG — verbatim from the original file.
 * Controls the "resting mind". Do not modify without a parity re-check.
 * ============================================================ */
const SUBSTRATE_CFG = {
  speed: 1,
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
} as const;

/* ============================================================
 * CFG — top-level knobs for the director and the post layer.
 * ============================================================ */
const CFG = {
  director: {
    firstRestDuration: 2, // seconds before the first scene on load
    restMin: 5, // minimum substrate-only rest between scenes
    restMax: 12, // maximum substrate-only rest
    transitionMin: 0.8, // shortest scene transition
    transitionMax: 2.5, // longest scene transition
    moodSmooth: 0.92, // EMA smoothing on mood (higher = smoother)
    moodNoiseArousal: 45, // seconds per noise cycle
    moodNoiseCuriosity: 60,
    moodNoiseAttention: 35,
    moodNoiseCalm: 90,
    idleThreshold: 12, // seconds without input before idle drift
    pointerSpeedThreshold: 800, // px/s to count as "fast"
    pointerAttentionGain: 0.15,
    scrollArousalGain: 0.1,
    idleCalmGain: 0.08, // per second
    idleAttentionLoss: 0.05, // per second
  },
  post: {
    vignetteStrength: 0.15, // darken edges by this fraction (0 = off)
    vignettePower: 2.0, // falloff curve
    driftRadius: 1.5, // max camera drift in cells (0 = off)
    driftSpeedX: 0.07,
    driftSpeedY: 0.05,
    breathAmplitude: 0.06, // +/- breathing gain (0 = off)
    breathPeriodMin: 8, // seconds
    breathPeriodMax: 12,
    heartbeatIntensity: 0.03, // very low
    heartbeatPeriod: 1.2, // seconds
    afterimageHalfLife: 0.35, // seconds (0 mix = off)
    afterimageMix: 0.4,
    flickerAmplitude: 0.02,
    flickerMaxHz: 2,
  },
  perf: {
    frameWindow: 60, // frames averaged for adaptive quality
    downshiftThresholdMs: 20, // avg frame ms before stepping quality down
    mobileWidthPx: 768,
    mobileFpsCap: 30,
    desktopFpsCap: 60,
    dprCap: 1.5,
  },
  a11y: {
    reducedSpeed: 0.18, // substrate time multiplier under reduced motion
    reducedBreathAmplitude: 0.03,
  },
} as const;

/* ============================================================
 * SCENE_CFG — per-scene knobs.
 * ============================================================ */
const SCENE_CFG = {
  spark: {
    durationMin: 10, // seconds
    durationMax: 15,
    focalSpread: 0.6, // fraction of viewport where the ignition lives
    primaryCount: 3, // simultaneous primary rings
    primarySpeedMin: 12, // cells/s
    primarySpeedMax: 20,
    ringWidthMin: 2, // cells
    ringWidthMax: 3,
    ringDecay: 0.08, // exponential decay per cell of radius
    secondarySpeedMin: 6, // cells/s
    secondarySpeedMax: 12,
    secondaryIntervalMin: 0.4, // seconds between secondary spawn attempts
    secondaryIntervalMax: 1.0,
    secondaryCap: 12,
    emberRadius: 5, // cells — residual core glow
  },
} as const;

/* ============================================================
 * HUE — semantic palette positions, derived from palette indices.
 * ============================================================ */
const HUE = {
  EMBER: 1 / 12, // deep reds/oranges  → resting
  AMBER: 4 / 12, // mid oranges        → active
  YELLOW: 9 / 12, // yellows            → thought peaks
} as const;

/* ============================================================
 * Small math helpers
 * ============================================================ */
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerpHueCircular = (h0: number, h1: number, t: number): number => {
  let d = h1 - h0;
  if (d > 0.5) d -= 1;
  else if (d < -0.5) d += 1;
  let r = h0 + d * t;
  r -= Math.floor(r);
  return r;
};

/* ============================================================
 * Noise — verbatim from the original file.
 * ============================================================ */
const hash3 = (x: number, y: number, z: number): number => {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
const noise3 = (x: number, y: number, z: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = smoothstep(fx);
  const v = smoothstep(fy);
  const w = smoothstep(fz);
  const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
  const x00 = mix(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);
  const x10 = mix(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);
  const x01 = mix(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);
  const x11 = mix(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);
  return mix(mix(x00, x10, v), mix(x01, x11, v), w);
};
const fbm = (x: number, y: number, z: number): number =>
  0.62 * noise3(x, y, z) + 0.38 * noise3(x * 2.17 + 11.3, y * 2.17 + 7.9, z * 2.17 + 3.1);

/* ============================================================
 * Seeded PRNG (mulberry32)
 * ============================================================ */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ============================================================
 * DEV flag — reads Vite's import.meta.env without `any`.
 * ============================================================ */
const DEV: boolean = (() => {
  const meta = import.meta as unknown as { env?: { DEV?: boolean } };
  return meta.env?.DEV === true;
})();

/* ============================================================
 * Component
 * ============================================================ */
const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx2d = canvas.getContext("2d", { alpha: true });
    if (!ctx2d) return;

    // Offscreen 1-px-per-cell buffer. Scaled up by `drawImage` with smoothing off.
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { alpha: true });
    if (!offCtx) return;

    const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = (): boolean => rmQuery.matches;

    let isMinimal = document.documentElement.dataset.theme === "minimal";

    /* --------------------------------------------------------
     * Build LUT from PALETTE (verbatim from original)
     * -------------------------------------------------------- */
    const stops: [number, number, number][] = PALETTE.map((hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]);
    const lut = new Uint8ClampedArray(512 * 3);
    {
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
    }

    /* --------------------------------------------------------
     * PRNG seed
     * -------------------------------------------------------- */
    const seed = (Date.now() ^ 0x9e3779b9) >>> 0;
    const prng = mulberry32(seed);
    if (DEV) {
      // eslint-disable-next-line no-console
      console.log("[LED] seed:", seed);
    }

    /* --------------------------------------------------------
     * Mutable state
     * -------------------------------------------------------- */
    let raf = 0;
    let last = performance.now();
    let lastFrameTime = last;
    let lastRenderTime = last;
    let realT = 0;
    let hueSpin = 0;
    let lastDt = 1 / 60;
    let running = true;

    let cell = 20;
    let cols = 0;
    let rows = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;

    let baseBright = new Float32Array(0);
    let baseHue = new Float32Array(0);
    let sceneBright = new Float32Array(0);
    let sceneHue = new Float32Array(0);
    let sceneAlpha = new Float32Array(0);
    let trail = new Float32Array(0);
    let vignetteMask = new Float32Array(0);
    let distFromCenter = new Float32Array(0);
    let imageData: ImageData | null = null;

    let substrateFrame = 0;
    let substrateSkipEvery = 1;

    // Adaptive quality
    const frameRing = new Float32Array(CFG.perf.frameWindow);
    let frameRingIdx = 0;
    let frameRingCount = 0;
    let qualityLevel = 0;
    let fpsCap = window.innerWidth <= CFG.perf.mobileWidthPx ? CFG.perf.mobileFpsCap : CFG.perf.desktopFpsCap;
    let trailsEnabled = true;

    // Post layer constants
    const breathPeriod = CFG.post.breathPeriodMin + prng() * (CFG.post.breathPeriodMax - CFG.post.breathPeriodMin);
    const flickerFreq = 0.5 + prng() * 1.5;

    // Pointer/scroll input state
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerT = 0;
    let lastScrollT = 0;

    /* --------------------------------------------------------
     * Scene contract
     * -------------------------------------------------------- */
    interface SceneContext {
      cols: number;
      rows: number;
      cell: number;
      prng: () => number;
    }
    interface FieldBuffers {
      bright: Float32Array;
      hue: Float32Array;
      alpha: Float32Array;
    }
    interface Scene {
      id: string;
      durationMin: number;
      durationMax: number;
      focalX: number;
      focalY: number;
      enter: (ctx: SceneContext) => void;
      update: (dt: number, t: number, ctx: SceneContext) => void;
      render: (field: FieldBuffers, t: number, ctx: SceneContext) => void;
      exit: () => void;
    }

    const sceneCtx: SceneContext = {
      cols: 0,
      rows: 0,
      cell: 20,
      prng,
    };

    /* --------------------------------------------------------
     * Director state
     * -------------------------------------------------------- */
    type DirectorState = "rest" | "transitionIn" | "scene" | "transitionOut";
    type TransitionType = "crossfade" | "iris" | "wipe";

    interface DirectorRuntime {
      state: DirectorState;
      timer: number;
      duration: number;
      currentScene: Scene | null;
      nextScene: Scene | null;
      lastSceneId: string | null;
      transitionType: TransitionType;
      transitionFocalX: number;
      transitionFocalY: number;
      mood: { arousal: number; curiosity: number; attention: number; calm: number };
      idleTime: number;
    }

    const director: DirectorRuntime = {
      state: "rest",
      timer: 0,
      duration: CFG.director.firstRestDuration,
      currentScene: null,
      nextScene: null,
      lastSceneId: null,
      transitionType: "crossfade",
      transitionFocalX: 0,
      transitionFocalY: 0,
      mood: { arousal: 0.3, curiosity: 0.5, attention: 0.4, calm: 0.6 },
      idleTime: 0,
    };

    /* --------------------------------------------------------
     * Spark scene — object pooled, no per-frame allocations.
     * -------------------------------------------------------- */
    interface Ring {
      active: boolean;
      cx: number;
      cy: number;
      radius: number;
      speed: number;
      width: number;
      hue0: number;
      hue1: number;
      brightness: number;
      primary: boolean;
    }

    const RING_POOL_SIZE = SCENE_CFG.spark.primaryCount + SCENE_CFG.spark.secondaryCap + 4;
    const ringPool: Ring[] = new Array(RING_POOL_SIZE);
    for (let i = 0; i < RING_POOL_SIZE; i++) {
      ringPool[i] = {
        active: false,
        cx: 0,
        cy: 0,
        radius: 0,
        speed: 0,
        width: 0,
        hue0: 0,
        hue1: 0,
        brightness: 0,
        primary: false,
      };
    }

    let sparkSpawnTimer = 0;
    let sparkEmberLife = 0;

    const sparkScene: Scene = {
      id: "spark",
      durationMin: SCENE_CFG.spark.durationMin,
      durationMax: SCENE_CFG.spark.durationMax,
      focalX: 0,
      focalY: 0,
      enter: (sc) => {
        for (let i = 0; i < ringPool.length; i++) ringPool[i].active = false;
        const half = (1 - SCENE_CFG.spark.focalSpread) * 0.5;
        const fx = half + prng() * SCENE_CFG.spark.focalSpread;
        const fy = half + prng() * SCENE_CFG.spark.focalSpread;
        sparkScene.focalX = fx * sc.cols;
        sparkScene.focalY = fy * sc.rows;
        sparkSpawnTimer =
          SCENE_CFG.spark.secondaryIntervalMin +
          prng() * (SCENE_CFG.spark.secondaryIntervalMax - SCENE_CFG.spark.secondaryIntervalMin);
        sparkEmberLife = 1;
        for (let i = 0; i < SCENE_CFG.spark.primaryCount; i++) {
          const r = ringPool[i];
          r.active = true;
          r.cx = sparkScene.focalX;
          r.cy = sparkScene.focalY;
          r.radius = i * 1.2;
          r.speed =
            SCENE_CFG.spark.primarySpeedMin +
            prng() * (SCENE_CFG.spark.primarySpeedMax - SCENE_CFG.spark.primarySpeedMin);
          r.width =
            SCENE_CFG.spark.ringWidthMin + prng() * (SCENE_CFG.spark.ringWidthMax - SCENE_CFG.spark.ringWidthMin);
          r.hue0 = HUE.YELLOW;
          r.hue1 = HUE.EMBER;
          r.brightness = 1.0 - i * 0.12;
          r.primary = true;
        }
      },
      update: (dt) => {
        // Advance rings
        for (let i = 0; i < ringPool.length; i++) {
          const r = ringPool[i];
          if (!r.active) continue;
          r.radius += r.speed * dt;
          const fade = Math.exp(-r.radius * SCENE_CFG.spark.ringDecay);
          r.brightness = fade * (r.primary ? 1.0 : 0.6);
          if (r.brightness < 0.01) r.active = false;
        }

        // Spawn secondaries on the front of a random primary
        sparkSpawnTimer -= dt;
        if (sparkSpawnTimer <= 0) {
          sparkSpawnTimer =
            SCENE_CFG.spark.secondaryIntervalMin +
            prng() * (SCENE_CFG.spark.secondaryIntervalMax - SCENE_CFG.spark.secondaryIntervalMin);

          let secondaryCount = 0;
          let freeSlot = -1;
          for (let i = 0; i < ringPool.length; i++) {
            const r = ringPool[i];
            if (r.active && !r.primary) secondaryCount++;
            else if (!r.active && freeSlot === -1) freeSlot = i;
          }
          if (secondaryCount < SCENE_CFG.spark.secondaryCap && freeSlot !== -1) {
            // Reservoir-pick a random active primary
            let picked: Ring | null = null;
            let seen = 0;
            for (let i = 0; i < ringPool.length; i++) {
              const r = ringPool[i];
              if (r.active && r.primary) {
                seen++;
                if (prng() < 1 / seen) picked = r;
              }
            }
            if (picked && picked.radius > 2) {
              const ang = prng() * Math.PI * 2;
              const rad = picked.radius * (0.7 + prng() * 0.3);
              const r = ringPool[freeSlot];
              r.active = true;
              r.cx = picked.cx + Math.cos(ang) * rad;
              r.cy = picked.cy + Math.sin(ang) * rad;
              r.radius = 0;
              r.speed =
                SCENE_CFG.spark.secondarySpeedMin +
                prng() * (SCENE_CFG.spark.secondarySpeedMax - SCENE_CFG.spark.secondarySpeedMin);
              r.width = 1 + prng() * 0.8;
              r.hue0 = HUE.YELLOW;
              r.hue1 = HUE.EMBER;
              r.brightness = 0.55;
              r.primary = false;
            }
          }
        }

        // Ember core slowly dims
        if (sparkEmberLife > 0) {
          sparkEmberLife -= dt * 0.4;
          if (sparkEmberLife < 0) sparkEmberLife = 0;
        }
      },
      render: (field, _t, sc) => {
        // Scene buffers are cleared each frame; scenes write only what they own.
        field.bright.fill(0);
        field.hue.fill(HUE.EMBER);

        // Ember core
        if (sparkEmberLife > 0) {
          const cx = sparkScene.focalX;
          const cy = sparkScene.focalY;
          const R = SCENE_CFG.spark.emberRadius * (0.6 + 0.4 * sparkEmberLife);
          const xMin = Math.max(0, Math.floor(cx - R));
          const xMax = Math.min(sc.cols - 1, Math.ceil(cx + R));
          const yMin = Math.max(0, Math.floor(cy - R));
          const yMax = Math.min(sc.rows - 1, Math.ceil(cy + R));
          const coreAmp = 0.9 * sparkEmberLife;
          for (let row = yMin; row <= yMax; row++) {
            const dy = row - cy;
            const rowOff = row * sc.cols;
            for (let col = xMin; col <= xMax; col++) {
              const dx = col - cx;
              const d2 = dx * dx + dy * dy;
              if (d2 > R * R) continue;
              const d = Math.sqrt(d2);
              const t = 1 - d / R;
              const c = coreAmp * t * t;
              const idx = rowOff + col;
              if (c > field.bright[idx]) {
                field.bright[idx] = c;
                field.hue[idx] = HUE.YELLOW;
              }
            }
          }
        }

        // Rings
        for (let i = 0; i < ringPool.length; i++) {
          const r = ringPool[i];
          if (!r.active) continue;
          const radOuter = r.radius + r.width + 1;
          const xMin = Math.max(0, Math.floor(r.cx - radOuter));
          const xMax = Math.min(sc.cols - 1, Math.ceil(r.cx + radOuter));
          const yMin = Math.max(0, Math.floor(r.cy - radOuter));
          const yMax = Math.min(sc.rows - 1, Math.ceil(r.cy + radOuter));
          const hueT = clamp01(r.radius / 30);
          const hue = lerpHueCircular(r.hue0, r.hue1, hueT);
          const invWidth = 1 / r.width;
          const brightAmp = r.brightness;
          for (let row = yMin; row <= yMax; row++) {
            const dy = row - r.cy;
            const dy2 = dy * dy;
            const rowOff = row * sc.cols;
            for (let col = xMin; col <= xMax; col++) {
              const dx = col - r.cx;
              const d = Math.sqrt(dx * dx + dy2);
              const rel = (d - r.radius) * invWidth;
              if (rel < -1 || rel > 1) continue;
              const falloff = 1 - (rel < 0 ? -rel : rel);
              const c = brightAmp * falloff * falloff;
              const idx = rowOff + col;
              if (c > field.bright[idx]) {
                field.bright[idx] = c;
                field.hue[idx] = hue;
              }
            }
          }
        }
      },
      exit: () => {
        for (let i = 0; i < ringPool.length; i++) ringPool[i].active = false;
        sparkEmberLife = 0;
      },
    };

    /* --------------------------------------------------------
     * Scene registry — extend as new scenes are added.
     * -------------------------------------------------------- */
    const allScenes: Scene[] = [sparkScene];
    const sceneById: Record<string, Scene> = { spark: sparkScene };

    /* --------------------------------------------------------
     * Director helpers
     * -------------------------------------------------------- */
    const randomRestDuration = (): number => {
      // Bias toward the middle (average of two uniforms)
      const r1 = prng();
      const r2 = prng();
      const mid = (r1 + r2) * 0.5;
      return CFG.director.restMin + mid * (CFG.director.restMax - CFG.director.restMin);
    };
    const randomTransitionDuration = (): number =>
      CFG.director.transitionMin + prng() * (CFG.director.transitionMax - CFG.director.transitionMin);
    const pickTransitionType = (): TransitionType => {
      const r = prng();
      if (r < 0.4) return "crossfade";
      if (r < 0.7) return "iris";
      return "wipe";
    };
    const pickNextScene = (): Scene | null => {
      // Phase 1: only Spark exists. Future phases will weight by mood here.
      const candidates: Scene[] = [];
      for (let i = 0; i < allScenes.length; i++) {
        if (allScenes[i].id !== director.lastSceneId) candidates.push(allScenes[i]);
      }
      const pool = candidates.length > 0 ? candidates : allScenes;
      if (pool.length === 0) return null;
      const idx = Math.min(pool.length - 1, Math.floor(prng() * pool.length));
      return pool[idx];
    };

    /* --------------------------------------------------------
     * Scene alpha — filled every frame during transitions and
     * during the scene itself. Crossfade = uniform; iris/wipe =
     * per-cell.
     * -------------------------------------------------------- */
    const updateSceneAlpha = (): void => {
      let t: number;
      if (director.state === "transitionIn") {
        t = smoothstep(director.duration > 0 ? director.timer / director.duration : 1);
      } else if (director.state === "scene") {
        t = 1;
      } else if (director.state === "transitionOut") {
        t = smoothstep(1 - clamp01(director.duration > 0 ? director.timer / director.duration : 1));
      } else {
        t = 0;
      }

      if (t === 0) {
        sceneAlpha.fill(0);
        return;
      }
      if (director.state === "scene") {
        sceneAlpha.fill(1);
        return;
      }

      switch (director.transitionType) {
        case "crossfade": {
          sceneAlpha.fill(t);
          break;
        }
        case "iris": {
          const fx = director.transitionFocalX;
          const fy = director.transitionFocalY;
          const maxR = Math.sqrt(cols * cols + rows * rows) * 0.6;
          const r = maxR * t;
          const invSoft = 1 / 2.5;
          for (let row = 0; row < rows; row++) {
            const dy = row - fy;
            const rowOff = row * cols;
            for (let col = 0; col < cols; col++) {
              const dx = col - fx;
              const d = Math.sqrt(dx * dx + dy * dy);
              sceneAlpha[rowOff + col] = smoothstep(1 - (d - r) * invSoft);
            }
          }
          break;
        }
        case "wipe": {
          const edge = 4;
          const front = t * (cols + edge * 2) - edge;
          const invEdge = 1 / edge;
          for (let row = 0; row < rows; row++) {
            const rowOff = row * cols;
            for (let col = 0; col < cols; col++) {
              sceneAlpha[rowOff + col] = clamp01((front - col) * invEdge);
            }
          }
          break;
        }
      }
    };

    /* --------------------------------------------------------
     * Director update
     * -------------------------------------------------------- */
    const updateDirector = (dt: number): void => {
      const t = realT;

      // Mood drift (slow 1D noise per dimension)
      const ar = 0.3 + (noise3(t / CFG.director.moodNoiseArousal, 100, 0) - 0.5) * 0.3;
      const cu = 0.5 + (noise3(t / CFG.director.moodNoiseCuriosity, 200, 0) - 0.5) * 0.4;
      const at = 0.4 + (noise3(t / CFG.director.moodNoiseAttention, 300, 0) - 0.5) * 0.5;
      const ca = 0.6 + (noise3(t / CFG.director.moodNoiseCalm, 400, 0) - 0.5) * 0.3;

      const sm = CFG.director.moodSmooth;
      const inv = 1 - sm;
      director.mood.arousal = clamp01(director.mood.arousal * sm + ar * inv);
      director.mood.curiosity = clamp01(director.mood.curiosity * sm + cu * inv);
      director.mood.attention = clamp01(director.mood.attention * sm + at * inv);
      director.mood.calm = clamp01(director.mood.calm * sm + ca * inv);

      // Idle drift
      if (director.idleTime > CFG.director.idleThreshold) {
        director.mood.calm = clamp01(director.mood.calm + CFG.director.idleCalmGain * dt);
        director.mood.attention = clamp01(director.mood.attention - CFG.director.idleAttentionLoss * dt);
      }

      director.timer += dt;
      director.idleTime += dt;

      // Reduced motion — substrate + gentle breath only, forever.
      if (reducedMotion()) {
        director.state = "rest";
        sceneAlpha.fill(0);
        return;
      }

      // Dev override
      if (DEV && forcedScene) {
        if (!director.currentScene || director.currentScene.id !== forcedScene.id) {
          if (director.currentScene) director.currentScene.exit();
          forcedScene.enter(sceneCtx);
          director.currentScene = forcedScene;
          director.state = "scene";
          director.timer = 0;
        }
        forcedScene.update(dt, director.timer, sceneCtx);
        sceneAlpha.fill(1);
        return;
      }

      switch (director.state) {
        case "rest": {
          if (director.timer >= director.duration) {
            const next = pickNextScene();
            if (!next) {
              director.timer = 0;
              director.duration = randomRestDuration();
              break;
            }
            next.enter(sceneCtx);
            director.nextScene = next;
            director.transitionType = pickTransitionType();
            director.transitionFocalX = next.focalX;
            director.transitionFocalY = next.focalY;
            director.state = "transitionIn";
            director.timer = 0;
            director.duration = randomTransitionDuration();
          }
          break;
        }
        case "transitionIn": {
          if (director.nextScene) {
            director.nextScene.update(dt, director.timer, sceneCtx);
          }
          if (director.timer >= director.duration) {
            director.currentScene = director.nextScene;
            director.nextScene = null;
            director.state = "scene";
            director.timer = 0;
            director.duration = director.currentScene
              ? director.currentScene.durationMin +
                prng() * (director.currentScene.durationMax - director.currentScene.durationMin)
              : 10;
          }
          break;
        }
        case "scene": {
          if (director.currentScene) {
            director.currentScene.update(dt, director.timer, sceneCtx);
          }
          if (director.timer >= director.duration) {
            director.state = "transitionOut";
            director.timer = 0;
            director.duration = randomTransitionDuration();
            director.transitionType = pickTransitionType();
            if (director.currentScene) {
              director.transitionFocalX = director.currentScene.focalX;
              director.transitionFocalY = director.currentScene.focalY;
            }
          }
          break;
        }
        case "transitionOut": {
          if (director.currentScene) {
            director.currentScene.update(dt, director.timer, sceneCtx);
          }
          if (director.timer >= director.duration) {
            if (director.currentScene) {
              director.lastSceneId = director.currentScene.id;
              director.currentScene.exit();
            }
            director.currentScene = null;
            director.state = "rest";
            director.timer = 0;
            director.duration = randomRestDuration();
          }
          break;
        }
      }

      updateSceneAlpha();
    };

    /* --------------------------------------------------------
     * Substrate — dual FBM (brightness + hue). Verbatim math.
     * The Lissajous camera drift is applied here in noise space
     * so it's smooth without bilinear sampling on the render pass.
     * -------------------------------------------------------- */
    const runSubstrate = (): void => {
      const motion = reducedMotion() ? CFG.a11y.reducedSpeed : 1;
      const wtW = realT * SUBSTRATE_CFG.speed * motion;
      const wtC = realT * SUBSTRATE_CFG.speed * motion;

      // Camera drift in cells → converted to noise space by scale.
      const driftCells = Math.sin(realT * CFG.post.driftSpeedX) * CFG.post.driftRadius;
      const driftCellsY = Math.cos(realT * CFG.post.driftSpeedY) * CFG.post.driftRadius;
      const driftWaveX = driftCells * SUBSTRATE_CFG.waveScale;
      const driftWaveY = driftCellsY * SUBSTRATE_CFG.waveScale;
      const driftColorX = driftCells * SUBSTRATE_CFG.colorScale;
      const driftColorY = driftCellsY * SUBSTRATE_CFG.colorScale;

      const ws = SUBSTRATE_CFG.waveScale;
      const wdx = wtW * SUBSTRATE_CFG.waveDriftX + driftWaveX;
      const wdy = wtW * SUBSTRATE_CFG.waveDriftY + driftWaveY;
      const wev = wtW * SUBSTRATE_CFG.waveEvolve + 47.1;

      const cs = SUBSTRATE_CFG.colorScale;
      const cdx = wtC * SUBSTRATE_CFG.colorDrift + driftColorX;
      const cdy = wtC * SUBSTRATE_CFG.colorDriftY + driftColorY;
      const cev = wtC * SUBSTRATE_CFG.colorEvolve;

      const thr = SUBSTRATE_CFG.threshold;
      const invThr = 1 / (1 - thr);
      const gam = SUBSTRATE_CFG.gamma;
      const flr = SUBSTRATE_CFG.floor;
      const flrRange = 1 - flr;
      const hueCyc = wtC * SUBSTRATE_CFG.hueCycle;
      const sinT = wtC * 0.18 + hueSpin;

      for (let row = 0; row < rows; row++) {
        const rowOff = row * cols;
        const rowWave = row * ws + wdy;
        const rowColor = row * cs + cdy;
        const rowColorSin = row * 0.009;
        for (let col = 0; col < cols; col++) {
          const idx = rowOff + col;

          let brightness = fbm(col * ws + wdx, rowWave, wev);
          brightness = (brightness - thr) * invThr;
          brightness = brightness < 0 ? 0 : Math.pow(brightness, gam);
          brightness = flr + flrRange * clamp01(brightness);
          baseBright[idx] = brightness;

          let colorField = fbm(col * cs + cdx, rowColor, cev);
          colorField += hueCyc;
          colorField -= Math.floor(colorField);
          colorField += Math.sin(sinT + col * 0.017 + rowColorSin) * 0.025;
          colorField -= Math.floor(colorField);
          baseHue[idx] = colorField;
        }
      }
    };

    /* --------------------------------------------------------
     * Composite + post + LUT + blit.
     * -------------------------------------------------------- */
    const render = (): void => {
      if (isMinimal || !imageData) return;
      const data = imageData.data;

      const breathAmp = reducedMotion() ? CFG.a11y.reducedBreathAmplitude : CFG.post.breathAmplitude;
      const breath = 1 + Math.sin((realT * 2 * Math.PI) / breathPeriod) * breathAmp;

      const flicker = reducedMotion() ? 1 : 1 + Math.sin(realT * 2 * Math.PI * flickerFreq) * CFG.post.flickerAmplitude;

      // Heartbeat (lub-dub), only when not reduced motion
      let hbR = -1e6;
      let hbA = 0;
      if (!reducedMotion()) {
        const phase = (realT % CFG.post.heartbeatPeriod) / CFG.post.heartbeatPeriod;
        if (phase < 0.15) {
          hbR = (phase / 0.15) * 30;
          hbA = (1 - phase / 0.15) * CFG.post.heartbeatIntensity;
        } else if (phase > 0.2 && phase < 0.35) {
          hbR = ((phase - 0.2) / 0.15) * 30;
          hbA = 0.7 * (1 - (phase - 0.2) / 0.15) * CFG.post.heartbeatIntensity;
        }
      }

      const trailDecay = trailsEnabled ? Math.pow(0.5, lastDt / CFG.post.afterimageHalfLife) : 0;
      const trailMix = trailsEnabled ? CFG.post.afterimageMix : 0;

      for (let row = 0; row < rows; row++) {
        const rowOff = row * cols;
        for (let col = 0; col < cols; col++) {
          const idx = rowOff + col;

          const a = sceneAlpha[idx];
          const bB = baseBright[idx];
          const bH = baseHue[idx];
          const sB = sceneBright[idx];
          const sH = sceneHue[idx];

          let b = bB * (1 - a) + sB * a;
          const hue = lerpHueCircular(bH, sH, a);

          // Vignette, breath, flicker (multiplicative)
          b *= vignetteMask[idx];
          b *= breath;
          b *= flicker;

          // Heartbeat ring (bounded quadratic falloff ~ Gaussian)
          if (hbA > 0) {
            const d = distFromCenter[idx];
            const rel = (d - hbR) * 0.5;
            const rel2 = rel * rel;
            if (rel2 < 9) b += hbA * (1 - rel2 / 9);
          }

          if (b < 0) b = 0;
          else if (b > 1) b = 1;

          // Afterimage persistence
          if (trailsEnabled) {
            const prev = trail[idx];
            const decayed = prev * trailDecay;
            const next = b > decayed ? b : decayed;
            trail[idx] = next;
            if (next > b) b += (next - b) * trailMix;
          }

          // LUT → ImageData
          const hueIndex = Math.min(511, Math.max(0, (hue * 512) | 0));
          const bIndex = Math.min(63, Math.max(0, (b * 64) | 0));
          const m = (bIndex + 0.5) / 64;
          const o = hueIndex * 3;
          const pIdx = idx * 4;
          data[pIdx] = (lut[o] * m) | 0;
          data[pIdx + 1] = (lut[o + 1] * m) | 0;
          data[pIdx + 2] = (lut[o + 2] * m) | 0;
          data[pIdx + 3] = 255;
        }
      }

      offCtx.putImageData(imageData, 0, 0);
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.imageSmoothingEnabled = false;
      ctx2d.drawImage(offscreen, 0, 0, cols, rows, 0, 0, cols * cell, rows * cell);
    };

    /* --------------------------------------------------------
     * Adaptive quality ladder
     * -------------------------------------------------------- */
    const applyQualityLevel = (): void => {
      switch (qualityLevel) {
        case 0:
          substrateSkipEvery = 1;
          trailsEnabled = true;
          break;
        case 1:
          substrateSkipEvery = 3;
          trailsEnabled = true;
          break;
        case 2:
          substrateSkipEvery = 3;
          trailsEnabled = false;
          break;
        case 3:
        default:
          substrateSkipEvery = 3;
          trailsEnabled = false;
          fpsCap = Math.min(fpsCap, CFG.perf.mobileFpsCap);
          break;
      }
    };

    /* --------------------------------------------------------
     * Resize
     * -------------------------------------------------------- */
    const resize = (): void => {
      if (window.innerWidth <= CFG.perf.mobileWidthPx) cell = 16;
      else if (window.innerWidth <= 900) cell = 18;
      else cell = 20;

      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.ceil(rect.width));
      height = Math.max(1, Math.ceil(rect.height));

      const newCols = Math.ceil(width / cell) + 2;
      const newRows = Math.ceil(height / cell) + 2;

      dpr = Math.min(window.devicePixelRatio || 1, CFG.perf.dprCap);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);

      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.imageSmoothingEnabled = false;

      const sizeChanged = newCols !== cols || newRows !== rows;
      cols = newCols;
      rows = newRows;

      if (sizeChanged) {
        const n = cols * rows;
        baseBright = new Float32Array(n);
        baseHue = new Float32Array(n);
        sceneBright = new Float32Array(n);
        sceneHue = new Float32Array(n);
        sceneAlpha = new Float32Array(n);
        trail = new Float32Array(n);
        vignetteMask = new Float32Array(n);
        distFromCenter = new Float32Array(n);

        offscreen.width = cols;
        offscreen.height = rows;
        imageData = offCtx.createImageData(cols, rows);

        sceneCtx.cols = cols;
        sceneCtx.rows = rows;

        // Precompute vignette mask and distance-from-centre
        const cx = cols * 0.5;
        const cy = rows * 0.5;
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const invMax = 1 / maxDist;
        const vigStr = CFG.post.vignetteStrength;
        const vigPow = CFG.post.vignettePower;
        for (let row = 0; row < rows; row++) {
          const dy = row - cy;
          const rowOff = row * cols;
          for (let col = 0; col < cols; col++) {
            const dx = col - cx;
            const d = Math.sqrt(dx * dx + dy * dy);
            const dn = d * invMax;
            vignetteMask[rowOff + col] = 1 - vigStr * Math.pow(dn, vigPow);
            distFromCenter[rowOff + col] = d;
          }
        }
      }

      sceneCtx.cell = cell;
      document.documentElement.style.setProperty("--cell", `${cell}px`);

      // Prime substrate so the first frame isn't empty
      runSubstrate();
    };

    /* --------------------------------------------------------
     * Tick
     * -------------------------------------------------------- */
    const tick = (now: number): void => {
      if (!running) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      lastDt = dt > 0 ? dt : 1 / 60;
      last = now;

      // Frame-time window for adaptive quality
      const frameMs = now - lastFrameTime;
      lastFrameTime = now;
      if (frameMs > 0 && frameMs < 200) {
        frameRing[frameRingIdx] = frameMs;
        frameRingIdx = (frameRingIdx + 1) % CFG.perf.frameWindow;
        if (frameRingCount < CFG.perf.frameWindow) frameRingCount++;
      }

      // FPS cap
      if (fpsCap < CFG.perf.desktopFpsCap) {
        const interval = 1000 / fpsCap;
        if (now - lastRenderTime < interval - 1) {
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      lastRenderTime = now;

      realT += dt;
      hueSpin += dt * 0.04;

      // Adaptive quality
      if (frameRingCount >= CFG.perf.frameWindow) {
        let sum = 0;
        for (let i = 0; i < CFG.perf.frameWindow; i++) sum += frameRing[i];
        const avg = sum / CFG.perf.frameWindow;
        if (avg > CFG.perf.downshiftThresholdMs && qualityLevel < 3) {
          qualityLevel++;
          applyQualityLevel();
          frameRingIdx = 0;
          frameRingCount = 0;
        }
      }

      updateDirector(dt);

      substrateFrame++;
      if (substrateFrame % substrateSkipEvery === 0) runSubstrate();

      if (director.currentScene) {
        director.currentScene.render(
          { bright: sceneBright, hue: sceneHue, alpha: sceneAlpha },
          director.timer,
          sceneCtx,
        );
      }

      render();

      raf = requestAnimationFrame(tick);
    };

    /* --------------------------------------------------------
     * Event handlers
     * -------------------------------------------------------- */
    const handleResize = (): void => {
      resize();
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        return;
      }
      running = true;
      last = performance.now();
      lastFrameTime = last;
      lastRenderTime = last;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    const handlePointerMove = (e: PointerEvent): void => {
      const now = performance.now();
      if (lastPointerT === 0) {
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerT = now;
        return;
      }
      const dt = (now - lastPointerT) / 1000;
      if (dt > 0 && dt < 0.5) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        if (speed > CFG.director.pointerSpeedThreshold) {
          director.mood.attention = clamp01(director.mood.attention + CFG.director.pointerAttentionGain);
        }
      }
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerT = now;
      director.idleTime = 0;
    };

    const handleScroll = (): void => {
      const now = performance.now();
      if (now - lastScrollT < 50) return;
      lastScrollT = now;
      director.mood.arousal = clamp01(director.mood.arousal + CFG.director.scrollArousalGain);
      director.idleTime = 0;
    };

    const handleThemeMutation = (): void => {
      isMinimal = document.documentElement.dataset.theme === "minimal";
      if (!isMinimal) runSubstrate();
    };

    const observer = new MutationObserver(handleThemeMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    /* --------------------------------------------------------
     * Dev tools
     * -------------------------------------------------------- */
    let forcedScene: Scene | null = null;
    let debugHud: HTMLDivElement | null = null;
    let debugHudTimer = 0;

    if (DEV) {
      const params = new URLSearchParams(window.location.search);
      const sceneParam = params.get("scene");
      if (sceneParam && sceneById[sceneParam]) forcedScene = sceneById[sceneParam];
      if (params.get("debug") === "1") {
        debugHud = document.createElement("div");
        debugHud.style.cssText =
          "position:fixed;top:8px;left:8px;z-index:9999;" +
          "font:11px/1.35 ui-monospace,monospace;color:#fff;" +
          "background:rgba(0,0,0,0.55);padding:6px 8px;border-radius:4px;" +
          "pointer-events:none;white-space:pre;";
        document.body.appendChild(debugHud);
      }
    }

    /* --------------------------------------------------------
     * Boot
     * -------------------------------------------------------- */
    resize();
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    if (DEV && debugHud) {
      debugHudTimer = window.setInterval(() => {
        if (!debugHud) return;
        let sum = 0;
        for (let i = 0; i < CFG.perf.frameWindow; i++) sum += frameRing[i];
        const avg = frameRingCount > 0 ? sum / frameRingCount : 0;
        const fps = avg > 0 ? 1000 / avg : 0;
        const m = director.mood;
        debugHud.textContent =
          `fps ${fps.toFixed(1)}  q${qualityLevel}  ` +
          `scene ${director.currentScene ? director.currentScene.id : "-"}  ` +
          `state ${director.state}\n` +
          `mood a${m.arousal.toFixed(2)} c${m.curiosity.toFixed(2)} ` +
          `at${m.attention.toFixed(2)} cl${m.calm.toFixed(2)}`;
      }, 250);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (debugHudTimer) window.clearInterval(debugHudTimer);
      if (debugHud && debugHud.parentNode) debugHud.parentNode.removeChild(debugHud);

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
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
