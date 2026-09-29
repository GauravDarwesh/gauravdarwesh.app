import { useEffect, useRef } from "react";

/* ============================================================
   LED MIND — single-file procedural short film
   The substrate is intentionally kept byte-for-byte in spirit:
   same CFG, hash, FBM, palette, 512 LUT and 64-level quantizer.
   Everything above it is expressed only as brightness + LUT position.
   ============================================================ */

const CFG = {
  speed: 1, // Existing substrate speed.
  waveScale: 0.1, // Existing luminance field scale.
  waveDriftX: 0.06, // Existing luminance field X drift.
  waveDriftY: 0.025, // Existing luminance field Y drift.
  waveEvolve: 0.09, // Existing luminance field temporal evolution.
  colorScale: 0.05, // Existing color field scale.
  colorDrift: 0.04, // Existing color field X drift.
  colorDriftY: 0.018, // Existing color field Y drift.
  colorEvolve: 0.05, // Existing color field temporal evolution.
  hueCycle: 0.012, // Existing hue motion.
  threshold: 0.02, // Existing brightness threshold.
  gamma: 0.95, // Existing brightness gamma.
  floor: 0.55, // Existing substrate floor.

  maxDpr: 1.5, // Required DPR cap.
  unitScale: 1.6, // Normalized scene unit = min(cols, rows * 1.6).
  sceneSoftCells: 1.05, // Approximate 1-cell SDF edge softness.
  mobileFps: 30, // Mobile starting cap.
  desktopFps: 60, // Desktop starting cap.
  adaptiveWindow: 60, // Frames used for quality adaptation.
  adaptiveBudgetMs: 20, // Reduce quality after sustained slow frames.
  lowQualityFps: 30, // Adaptive low-quality FPS cap.
  minFrameDt: 1 / 8, // Director timestep clamp.
  maxFrameDt: 0.05, // Director timestep clamp.
  trailHalfLife: 0.35, // Afterimage half-life.
  bloomAmount: 0.25, // Bright-cell bloom contribution.
  bloomThreshold: 0.78, // Bloom only the brightest field cells.
  vignetteEdge: 0.16, // Edge luminance loss.
  breathPeriod: 10, // Breathing cycle.
  breathAmount: 0.06, // +/- 6% breathing gain.
  heartbeatAmount: 0.04, // <=4% heartbeat ring.
  safeDamper: 0.65, // About 35% central contrast reduction.
  safeEllipseRx: 0.34, // Central safe-zone horizontal radius.
  safeEllipseRy: 0.24, // Central safe-zone vertical radius.
  safeScrollHz: 4, // Safe-rect recompute throttle.
  heatDecay: 0.965, // Visitor heatmap slow decay.
  heatInputGain: 0.035, // Visitor linger gain.
  flashWindowMs: 1000, // Governor rolling window.
  flashGuardMs: 340, // Conservative >25% flash separation.
  maxFlashArea: 0.25, // Never allow >25% flash area.
  maxGoldArea: 0.078, // Keep scene gold below 7.8% of the grid.
  baselineTolerance: 0.1, // +/-10% substrate baseline requirement.

  episodeMin: 300, // ~5 minutes.
  episodeMax: 480, // ~8 minutes.
  initialRest: 2, // First-load hook.
  restMin: 4, // Thought-rest minimum.
  restMax: 10, // Thought-rest maximum.
  sleepMin: 12, // Sleep beat minimum.
  sleepMax: 20, // Sleep beat maximum.
  interruptEyeMax: 6, // Fast-sweep notice max.
  clickSparkMax: 4, // Click overlay lifetime.

  maxNodes: 72, // Neural graph node pool.
  maxPulses: 60, // Neural edge pulse pool.
  maxSparklets: 24, // Spark secondary pool.
  maxBuildings: 28, // World building pool.
  maxWorldFigures: 3, // World background walker pool.
  maxRain: 34, // World weather pool.
  maxHumanFigures: 3, // Human background figure pool.
  maxSafeRects: 24, // DOM safe-zone pool cap.
  snapshotCount: 30, // Dream ring size.
  snapshotHz: 15, // Dream capture cadence.
  thoughtHold: 2, // Thought hold.
};

const SCENE_CFG = {
  sparkDuration: [10, 16] as const, // Spark scene duration.
  neuralDuration: [18, 30] as const, // Neural scene duration.
  eyeDuration: [16, 24] as const, // Eye scene duration.
  worldDuration: [26, 35] as const, // World centerpiece duration.
  humanDuration: [20, 30] as const, // Human scene duration.
  dreamDuration: [22, 30] as const, // Dream scene duration.
  ideaGoldSeconds: 1.9, // Big-idea gold peak length.
  eyeOpenSeconds: 1.2, // Eye lid open time.
  eyeBlinkMin: 3, // Eye blink minimum.
  eyeBlinkMax: 7, // Eye blink maximum.
  wandererHeightWorld: 0.11, // World wanderer height in normalized units.
  humanHeight: 0.4, // Human figure height in viewport rows.
  humanRim: 0.022, // Human amber rim thickness.
  worldRoadY: 0.79, // World road height.
  cityHorizon: 0.6, // World city horizon.
  cityGrow: 8, // World building grow time.
  dreamSlice: 0.08, // Dream horizontal slice displacement.
  dreamGhostAlpha: 0.18, // Dream ghost trail strength.
};

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

const visitStorageKey = "led-mind-visit";

/* ============================================================
   TYPES
   ============================================================ */

type Mood = {
  arousal: number;
  curiosity: number;
  attention: number;
  calm: number;
};

type Handoff = {
  x: number;
  y: number;
  r: number;
  energy: number;
  hue: number;
};

type DurationRange = readonly [number, number];

type TransitionKind = "crossfade" | "iris" | "scan";

type SceneId = "spark" | "neural" | "eye" | "world" | "human" | "dream";

type SceneContext = {
  cols: number;
  rows: number;
  unit: number;
  dt: number;
  time: number;
  sceneTime: number;
  sceneDuration: number;
  seed: number;
  rng: () => number;
  handoff: Handoff;
  mood: Mood;
  tod: TimeOfDay;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  pointerSpeed: number;
  pointerNear: boolean;
  clickX: number;
  clickY: number;
  clickPulse: number;
  attentionHeat: Float32Array;
  base: Float32Array;
  sceneLum: Float32Array;
  sceneHue: Float32Array;
  sceneAlpha: Float32Array;
  trail: Float32Array;
  finalLum: Float32Array;
  finalHue: Float32Array;
};

type Scene = {
  id: SceneId;
  duration: DurationRange;
  enter: (ctx: SceneContext, handoff: Handoff) => void;
  update: (dt: number, t: number, ctx: SceneContext) => void;
  render: (ctx: SceneContext) => void;
  exit: () => Handoff;
  transition: TransitionKind;
};

type SafeRect = { x: number; y: number; w: number; h: number };

type TimeOfDay = "dawn" | "day" | "dusk" | "night";

type BeatKind = "rest" | "scene" | "sleep" | "idea";

type Beat = {
  kind: BeatKind;
  scene: SceneId | null;
  duration: number;
  variant: number;
};

type Quality = {
  fpsCap: number;
  skipSubstrate: boolean;
  trail: boolean;
  bloom: boolean;
};

/* ============================================================
   UTILITIES
   ============================================================ */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

const smooth = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const easeOut = (t: number): number => {
  const x = clamp01(t);
  const q = 1 - x;
  return 1 - q * q * q;
};

const easeIn = (t: number): number => {
  const x = clamp01(t);
  return x * x * x;
};

const wrap01 = (v: number): number => {
  let x = v - Math.floor(v);
  if (x < 0) x += 1;
  return x;
};

const shortestHue = (a: number, b: number): number => {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
};

const lerpHueCircular = (a: number, b: number, t: number): number => wrap01(a + shortestHue(a, b) * clamp01(t));

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
  const u = smooth(fx);
  const v = smooth(fy);
  const w = smooth(fz);

  const x00 = hash3(xi, yi, zi) + (hash3(xi + 1, yi, zi) - hash3(xi, yi, zi)) * u;
  const x10 = hash3(xi, yi + 1, zi) + (hash3(xi + 1, yi + 1, zi) - hash3(xi, yi + 1, zi)) * u;
  const x01 = hash3(xi, yi, zi + 1) + (hash3(xi + 1, yi, zi + 1) - hash3(xi, yi, zi + 1)) * u;
  const x11 = hash3(xi, yi + 1, zi + 1) + (hash3(xi + 1, yi + 1, zi + 1) - hash3(xi, yi + 1, zi + 1)) * u;
  const a = x00 + (x10 - x00) * v;
  const b = x01 + (x11 - x01) * v;
  return a + (b - a) * w;
};

const fbm = (x: number, y: number, z: number): number =>
  0.62 * noise3(x, y, z) + 0.38 * noise3(x * 2.17 + 11.3, y * 2.17 + 7.9, z * 2.17 + 3.1);

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (value: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const parseSeed = (): number => {
  let seed = (Date.now() >>> 0) ^ ((Date.now() / 0x100000000) | 0);
  try {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      const arr = new Uint32Array(2);
      cryptoObj.getRandomValues(arr);
      seed ^= arr[0] ^ arr[1];
    }
  } catch {
    // Date seed is sufficient fallback.
  }
  return seed >>> 0;
};

const readDevQuery = (): {
  scene: SceneId | null;
  seed: number | null;
  tod: TimeOfDay | null;
  speed: number;
  debug: boolean;
} => {
  let enabled = false;
  try {
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    enabled = meta.env?.DEV === true;
  } catch {
    enabled = false;
  }
  if (!enabled) {
    try {
      const processLike = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process;
      const nodeEnv = processLike?.env?.NODE_ENV;
      enabled = typeof nodeEnv === "string" && nodeEnv !== "production";
    } catch {
      enabled = false;
    }
  }
  if (!enabled || typeof window === "undefined") {
    return { scene: null, seed: null, tod: null, speed: 1, debug: false };
  }

  const params = new URLSearchParams(window.location.search);
  const sceneRaw = params.get("scene");
  const todRaw = params.get("tod");
  const speedRaw = Number(params.get("speed"));
  const seedRaw = Number(params.get("seed"));
  const validScene =
    sceneRaw === "spark" ||
    sceneRaw === "neural" ||
    sceneRaw === "eye" ||
    sceneRaw === "world" ||
    sceneRaw === "human" ||
    sceneRaw === "dream";
  const validTod = todRaw === "dawn" || todRaw === "day" || todRaw === "dusk" || todRaw === "night";
  return {
    scene: validScene ? sceneRaw : null,
    seed: Number.isFinite(seedRaw) ? seedRaw >>> 0 : null,
    tod: validTod ? todRaw : null,
    speed: Number.isFinite(speedRaw) && speedRaw > 0 ? clamp(speedRaw, 0.05, 20) : 1,
    debug: params.get("debug") === "1",
  };
};

const getTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
};

const semanticHuePosition = (indices: readonly number[], paletteLength: number): number => {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const p = indices[i] / paletteLength;
    const a = p * Math.PI * 2;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  let h = Math.atan2(sy, sx) / (Math.PI * 2);
  if (h < 0) h += 1;
  return h;
};

const semanticHueSpan = (indices: readonly number[], paletteLength: number, t: number): number => {
  let start = indices[0] / paletteLength;
  let end = indices[indices.length - 1] / paletteLength;
  if (shortestHue(start, end) < 0) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return lerpHueCircular(start, end, t);
};

const EMBER_HUE = semanticHuePosition([0, 1, 2, 10, 11], palette.length);
const AMBER_HUE = semanticHuePosition([3, 4, 5, 6], palette.length);
const GOLD_HUE = semanticHuePosition([7, 8, 9], palette.length);
const EMBER_WRAP_A = semanticHueSpan([11, 0, 1, 2], palette.length, 0.5);
const GOLD_WRAP = lerpHueCircular(AMBER_HUE, GOLD_HUE, 0.82);
const MOOD_PERIODS = [48, 62, 36, 78] as const;
const MOOD_FIELDS = ["arousal", "curiosity", "attention", "calm"] as const;
const HUMAN_BONES: readonly [number, number, number, number][] = [
  [0, 2, 1.9, 0.62],
  [2, 4, 2.2, 0.56],
  [2, 6, 1.7, 0.46],
  [6, 8, 1.5, 0.4],
  [2, 10, 1.7, 0.46],
  [10, 12, 1.5, 0.4],
  [4, 14, 2.0, 0.5],
  [14, 16, 1.8, 0.45],
  [16, 18, 1.6, 0.39],
  [4, 20, 2.0, 0.5],
  [20, 22, 1.8, 0.45],
  [22, 24, 1.6, 0.39],
];

const hueForSemantic = (semantic: "ember" | "amber" | "gold", t: number): number => {
  if (semantic === "ember") return lerpHueCircular(EMBER_HUE, EMBER_WRAP_A, t);
  if (semantic === "gold") return lerpHueCircular(GOLD_HUE, GOLD_WRAP, t);
  return lerpHueCircular(AMBER_HUE, GOLD_HUE, t * 0.18);
};

const luminanceFromRgb = (r: number, g: number, b: number): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/* ============================================================
   GLYPHS — compact bitmap thoughts
   ============================================================ */

const glyphRows: Record<string, readonly [number, number, number, number, number, number, number]> = {
  a: [0, 6, 9, 9, 15, 9, 9],
  b: [8, 8, 14, 9, 9, 14, 0],
  c: [0, 6, 9, 8, 8, 6, 0],
  d: [1, 1, 7, 9, 9, 7, 0],
  e: [0, 6, 9, 15, 8, 7, 0],
  f: [3, 4, 14, 4, 4, 4, 0],
  g: [0, 7, 9, 9, 7, 1, 14],
  h: [8, 8, 14, 9, 9, 9, 0],
  i: [2, 0, 6, 2, 2, 7, 0],
  j: [1, 0, 3, 1, 9, 9, 6],
  k: [8, 8, 9, 14, 10, 9, 0],
  l: [6, 2, 2, 2, 2, 7, 0],
  m: [0, 26, 21, 21, 17, 17, 0],
  n: [0, 14, 9, 9, 9, 9, 0],
  o: [0, 6, 9, 9, 9, 6, 0],
  p: [0, 14, 9, 14, 8, 8, 0],
  q: [0, 7, 9, 9, 7, 1, 1],
  r: [0, 11, 12, 8, 8, 8, 0],
  s: [0, 7, 8, 6, 1, 14, 0],
  t: [4, 31, 4, 4, 5, 2, 0],
  u: [0, 9, 9, 9, 9, 7, 0],
  v: [0, 9, 9, 9, 9, 6, 0],
  w: [0, 17, 17, 21, 21, 10, 0],
  x: [0, 9, 6, 6, 6, 9, 0],
  y: [0, 9, 9, 7, 1, 6, 0],
  z: [0, 15, 1, 2, 4, 15, 0],
  "0": [0, 6, 9, 11, 13, 6, 0],
  "1": [2, 6, 2, 2, 2, 7, 0],
  "2": [0, 14, 1, 6, 8, 15, 0],
  "3": [0, 14, 1, 6, 1, 14, 0],
  "4": [0, 2, 6, 10, 15, 2, 0],
  "5": [0, 15, 8, 14, 1, 14, 0],
  "6": [0, 7, 8, 14, 9, 6, 0],
  "7": [0, 15, 1, 2, 4, 4, 0],
  "8": [0, 6, 9, 6, 9, 6, 0],
  "9": [0, 6, 9, 7, 1, 14, 0],
  ".": [0, 0, 0, 0, 0, 6, 6],
  ",": [0, 0, 0, 0, 0, 6, 4],
  "!": [4, 4, 4, 4, 0, 4, 0],
  "?": [0, 6, 9, 2, 4, 0, 4],
  "'": [4, 4, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "<": [0, 2, 4, 8, 4, 2, 0],
  ">": [0, 8, 4, 2, 4, 8, 0],
  heart: [0, 10, 31, 31, 14, 4, 0],
};
const glyphLetters = "abcdefghijklmnopqrstuvwxyz0123456789.,!?'-<>";
/* ============================================================
   COMPONENT
   ============================================================ */

const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const pixelCanvas = document.createElement("canvas");
    const pixelCtx = pixelCanvas.getContext("2d", { alpha: false });
    if (!pixelCtx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dev = readDevQuery();

    let raf = 0;
    let last = performance.now();
    let lastRenderAt = performance.now();
    let realT = 0;
    let filmT = 0;
    let running = true;
    let isMinimal = document.documentElement.dataset.theme === "minimal";
    let destroyed = false;

    let cell = 20;
    let cols = 0;
    let rows = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let unit = 1;
    let hueSpin = 0;

    let base = new Float32Array(1);
    let sceneLum = new Float32Array(1);
    let sceneHue = new Float32Array(1);
    let sceneAlpha = new Float32Array(1);
    let trail = new Float32Array(1);
    let finalLum = new Float32Array(1);
    let finalHue = new Float32Array(1);
    let previousLum = new Float32Array(1);
    let baseBlur = new Float32Array(1);
    let bloomTemp = new Float32Array(1);
    let finalIndex = new Uint8Array(1);

    let imageData = new ImageData(1, 1);
    let snapshotSize = 1;
    let snapshots = new Uint8Array(1);
    let snapshotHead = 0;
    let snapshotCount = 0;
    let snapshotClock = 0;

    const attentionHeat = new Float32Array(16 * 9);
    const safeRects: SafeRect[] = [];

    let baselineMean = 0.7;
    let frameMean = 0.7;
    let previousFrameMean = 0.7;
    let goldArea = 0;
    let flashArea = 0;
    let flashTimes = new Float64Array(8);
    let flashCount = 0;
    let lastFlashAt = -Infinity;
    let governor = 1;
    let governorMeanSlew = 0;

    let quality: Quality = {
      fpsCap: window.innerWidth <= 768 ? CFG.mobileFps : CFG.desktopFps,
      skipSubstrate: false,
      trail: true,
      bloom: true,
    };
    let slowFrames = 0;
    let qualitySample = 0;
    let qualityTime = 0;

    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerActive = false;
    let pointerSpeed = 0;
    let lastPointerX = 0.5;
    let lastPointerY = 0.5;
    let lastPointerAt = performance.now();
    let scrollVelocity = 0;
    let lastScrollAt = performance.now();
    let lastScrollY = window.scrollY;
    let clickX = 0.5;
    let clickY = 0.5;
    let clickPulse = 0;
    let lastInputAt = performance.now();
    let hiddenAt = -1;
    let visitorNear = false;
    let noticedThisVisit = false;
    let returnThought = false;
    let fastSweepPending = false;
    let interruptEyeRemaining = 0;
    let clickInterruptRemaining = 0;
    let noticeThought = false;
    let tabLeftPending = false;
    let tabBackPending = false;

    let visitCount = 0;
    try {
      const raw = window.localStorage.getItem(visitStorageKey);
      visitCount = raw ? Math.max(0, Number(JSON.parse(raw)?.count || 0)) : 0;
      if (!Number.isFinite(visitCount)) visitCount = 0;
      returnThought = visitCount > 0;
      window.localStorage.setItem(visitStorageKey, JSON.stringify({ count: visitCount + 1, last: Date.now() }));
    } catch {
      visitCount = 0;
    }

    let seed = dev.seed ?? parseSeed();
    const rng = mulberry32(seed);

    const mood: Mood = { arousal: 0.35, curiosity: 0.58, attention: 0.25, calm: 0.72 };
    const moodPhase = new Float32Array([rng() * 6, rng() * 6, rng() * 6, rng() * 6]);

    let timeOfDay: TimeOfDay = dev.tod ?? getTimeOfDay(new Date().getHours());

    const semanticAt = (baseHue: number, variation: number): number =>
      wrap01(baseHue + shortestHue(baseHue, variation) * 0.25);

    const setColor = (h: number, lum: number, alpha: number, i: number): void => {
      sceneHue[i] = wrap01(h);
      sceneLum[i] = clamp01(lum);
      sceneAlpha[i] = clamp01(alpha);
    };

    const clearScene = (): void => {
      sceneLum.fill(0);
      sceneAlpha.fill(0);
      sceneHue.fill(EMBER_HUE);
    };

    const sceneCtx: SceneContext = {
      cols,
      rows,
      unit,
      dt: 0,
      time: 0,
      sceneTime: 0,
      sceneDuration: 1,
      seed,
      rng,
      handoff: { x: 0.5, y: 0.5, r: 0.08, energy: 1, hue: EMBER_HUE },
      mood,
      tod: timeOfDay,
      pointerX,
      pointerY,
      pointerActive,
      pointerSpeed,
      pointerNear: visitorNear,
      clickX,
      clickY,
      clickPulse,
      attentionHeat,
      base,
      sceneLum,
      sceneHue,
      sceneAlpha,
      trail,
      finalLum,
      finalHue,
    };

    const cellDistance = (ax: number, ay: number, bx: number, by: number): number => {
      const dx = (ax - bx) * cols;
      const dy = (ay - by) * rows;
      return Math.hypot(dx, dy);
    };

    const capsuleDistance = (
      px: number,
      py: number,
      ax: number,
      ay: number,
      bx: number,
      by: number,
      radius: number,
    ): number => {
      const vx = bx - ax;
      const vy = by - ay;
      const wx = px - ax;
      const wy = py - ay;
      const vv = vx * vx + vy * vy;
      const t = vv > 1e-7 ? clamp01((wx * vx + wy * vy) / vv) : 0;
      const qx = ax + vx * t;
      const qy = ay + vy * t;
      return Math.hypot((px - qx) * cols, (py - qy) * rows) - radius;
    };

    const rectSoftSdf = (px: number, py: number, cx: number, cy: number, hw: number, hh: number): number => {
      const dx = Math.abs(px - cx) - hw;
      const dy = Math.abs(py - cy) - hh;
      const ox = Math.max(dx, 0);
      const oy = Math.max(dy, 0);
      return Math.hypot(ox * cols, oy * rows) + Math.min(Math.max(dx, dy), 0) * Math.min(cols, rows);
    };

    const writeBlob = (px: number, py: number, radiusCells: number, lum: number, hue: number, alpha: number): void => {
      const minCol = Math.max(0, Math.floor(px * cols - radiusCells - 1));
      const maxCol = Math.min(cols - 1, Math.ceil(px * cols + radiusCells + 1));
      const minRow = Math.max(0, Math.floor(py * rows - radiusCells - 1));
      const maxRow = Math.min(rows - 1, Math.ceil(py * rows + radiusCells + 1));
      const rr = Math.max(0.1, radiusCells);
      for (let row = minRow; row <= maxRow; row += 1) {
        const ny = (row + 0.5) / rows;
        for (let col = minCol; col <= maxCol; col += 1) {
          const nx = (col + 0.5) / cols;
          const d = cellDistance(nx, ny, px, py);
          const a = clamp01(1 - d / (rr + CFG.sceneSoftCells));
          if (a <= 0) continue;
          const i = row * cols + col;
          if (a * alpha > sceneAlpha[i]) {
            setColor(hue, Math.max(sceneLum[i], lum * a), a * alpha, i);
          }
        }
      }
    };

    const worldHue = (): number => {
      if (timeOfDay === "night") return lerpHueCircular(EMBER_HUE, AMBER_HUE, 0.22);
      if (timeOfDay === "dawn") return lerpHueCircular(EMBER_HUE, AMBER_HUE, 0.55);
      if (timeOfDay === "dusk") return lerpHueCircular(EMBER_HUE, AMBER_HUE, 0.38);
      return lerpHueCircular(AMBER_HUE, EMBER_HUE, 0.08);
    };

    /* ========================================================
       SCENES
       ======================================================== */

    let sparkX = 0.5;
    let sparkY = 0.5;
    let sparkRingSpeed = 16;
    const sparklets = new Float32Array(CFG.maxSparklets * 5);
    let sparkletCount = 0;

    const spark: Scene = {
      id: "spark",
      duration: SCENE_CFG.sparkDuration,
      transition: "iris",
      enter: (ctx, handoff) => {
        sparkX = clamp(handoff.x * 0.7 + 0.15, 0.2, 0.8);
        sparkY = clamp(handoff.y * 0.7 + 0.15, 0.2, 0.8);
        if (!Number.isFinite(sparkX)) sparkX = 0.5;
        if (!Number.isFinite(sparkY)) sparkY = 0.5;
        sparkRingSpeed = 12 + ctx.rng() * 8;
        sparkletCount = 8 + ((ctx.rng() * 10) | 0);
        for (let i = 0; i < sparkletCount; i += 1) {
          const o = i * 5;
          sparklets[o] = (i / sparkletCount) * Math.PI * 2 + ctx.rng() * 0.35;
          sparklets[o + 1] = 4 + ctx.rng() * 11;
          sparklets[o + 2] = 0.7 + ctx.rng() * 0.7;
          sparklets[o + 3] = 0.08 + ctx.rng() * 0.35;
          sparklets[o + 4] = 0;
        }
      },
      update: (_dt, _t, ctx) => {
        const tt = ctx.sceneTime;
        if (ctx.clickPulse > 0 && clickInterruptRemaining > 0) {
          sparkX = ctx.clickX;
          sparkY = ctx.clickY;
        }
        if (tt > ctx.sceneDuration * 0.38 && tt < ctx.sceneDuration * 0.58) {
          sparkRingSpeed += 0.02;
        }
      },
      render: (ctx) => {
        const tt = ctx.sceneTime;
        const appear = easeOut(clamp01(tt / 1.2));
        const decay = 1 - easeInOut(clamp01((tt - ctx.sceneDuration * 0.55) / (ctx.sceneDuration * 0.45)));
        const core = 0.92 * appear * Math.max(0, decay) + 0.2;
        const hue = hueForSemantic("ember", smooth(tt / ctx.sceneDuration));
        clearScene();
        writeBlob(sparkX, sparkY, 1.7, core, hue, 0.95);
        const ringR = tt * sparkRingSpeed;
        const ringSoft = 1.2;
        const minCol = Math.max(0, Math.floor(sparkX * cols - ringR - 4));
        const maxCol = Math.min(cols - 1, Math.ceil(sparkX * cols + ringR + 4));
        const minRow = Math.max(0, Math.floor(sparkY * rows - ringR - 4));
        const maxRow = Math.min(rows - 1, Math.ceil(sparkY * rows + ringR + 4));
        for (let row = minRow; row <= maxRow; row += 1) {
          const y = (row + 0.5) / rows;
          for (let col = minCol; col <= maxCol; col += 1) {
            const x = (col + 0.5) / cols;
            const d = cellDistance(x, y, sparkX, sparkY);
            const wave = Math.exp(-Math.abs(d - ringR) / ringSoft);
            if (wave < 0.02) continue;
            const i = row * cols + col;
            const a = wave * 0.66 * decay;
            sceneAlpha[i] = Math.max(sceneAlpha[i], a);
            sceneLum[i] = Math.max(sceneLum[i], 0.86 * a);
            sceneHue[i] = hue;
          }
        }
        for (let s = 0; s < sparkletCount; s += 1) {
          const o = s * 5;
          const angle = sparklets[o];
          const radius = sparklets[o + 1] + tt * sparklets[o + 2];
          const x = sparkX + ((Math.cos(angle) * radius) / Math.max(1, cols)) * 1.45;
          const y = sparkY + ((Math.sin(angle) * radius) / Math.max(1, rows)) * 1.45;
          const a = sparklets[o + 3] * clamp01(1 - tt / ctx.sceneDuration);
          if (a > 0) writeBlob(x, y, 0.7, 0.7 * a, hue, a);
        }
      },
      exit: () => ({ x: sparkX, y: sparkY, r: 0.035, energy: 0.92, hue: EMBER_HUE }),
    };

    const nodes = new Float32Array(CFG.maxNodes * 4);
    const neighbors = new Int16Array(CFG.maxNodes * 3);
    const neighborCount = new Uint8Array(CFG.maxNodes);
    const nodePulse = new Float32Array(CFG.maxNodes);
    const pulses = new Float32Array(CFG.maxPulses * 5);
    let nodeCount = 0;
    let pulseCount = 0;
    let bigIdeaNode = 0;
    let bigIdeaFired = false;
    let bigIdeaTime = -1;

    const resetPulses = (): void => {
      pulseCount = 0;
      for (let i = 0; i < CFG.maxPulses * 5; i += 1) pulses[i] = 0;
    };

    const seedNeuralGraph = (ctx: SceneContext): void => {
      nodeCount = Math.min(CFG.maxNodes, 40 + Math.floor(((ctx.cols * ctx.rows) / (96 * 54)) * 32));
      if (nodeCount < 18) nodeCount = 18;
      for (let i = 0; i < nodeCount; i += 1) {
        const o = i * 4;
        nodes[o] = 0.1 + ctx.rng() * 0.8;
        nodes[o + 1] = 0.12 + ctx.rng() * 0.76;
        nodes[o + 2] = ctx.rng() * Math.PI * 2;
        nodes[o + 3] = 0.015 + ctx.rng() * 0.03;
        nodePulse[i] = 0;
        neighborCount[i] = 0;
        for (let k = 0; k < 3; k += 1) neighbors[i * 3 + k] = -1;
      }

      for (let i = 0; i < nodeCount; i += 1) {
        let best0 = -1;
        let best1 = -1;
        let best2 = -1;
        let d0 = Infinity;
        let d1 = Infinity;
        let d2 = Infinity;
        const ix = nodes[i * 4];
        const iy = nodes[i * 4 + 1];
        for (let j = 0; j < nodeCount; j += 1) {
          if (j === i) continue;
          const dx = ix - nodes[j * 4];
          const dy = iy - nodes[j * 4 + 1];
          const d = dx * dx + dy * dy;
          if (d < d0) {
            d2 = d1;
            best2 = best1;
            d1 = d0;
            best1 = best0;
            d0 = d;
            best0 = j;
          } else if (d < d1) {
            d2 = d1;
            best2 = best1;
            d1 = d;
            best1 = j;
          } else if (d < d2) {
            d2 = d;
            best2 = j;
          }
        }
        neighbors[i * 3] = best0;
        neighbors[i * 3 + 1] = best1;
        neighbors[i * 3 + 2] = best2;
        neighborCount[i] = best2 >= 0 ? 3 : best1 >= 0 ? 2 : 1;
      }
      resetPulses();
      bigIdeaNode = (ctx.rng() * nodeCount) | 0;
      bigIdeaFired = false;
      bigIdeaTime = -1;
    };

    const firePulse = (from: number, to: number, energy: number, ctx: SceneContext): void => {
      if (pulseCount >= CFG.maxPulses || to < 0) return;
      const o = pulseCount * 5;
      pulses[o] = from;
      pulses[o + 1] = to;
      pulses[o + 2] = 0;
      pulses[o + 3] = clamp01(energy);
      pulses[o + 4] = 0;
      pulseCount += 1;
      ctx.sceneTime += 0;
    };

    const neural: Scene = {
      id: "neural",
      duration: SCENE_CFG.neuralDuration,
      transition: "iris",
      enter: (ctx, handoff) => {
        seedNeuralGraph(ctx);
        const hx = handoff.x;
        const hy = handoff.y;
        let nearest = 0;
        let nearestD = Infinity;
        for (let i = 0; i < nodeCount; i += 1) {
          const dx = nodes[i * 4] - hx;
          const dy = nodes[i * 4 + 1] - hy;
          const d = dx * dx + dy * dy;
          if (d < nearestD) {
            nearestD = d;
            nearest = i;
          }
        }
        bigIdeaNode = nearest;
        if (handoff.energy > 0.6 && neighborCount[nearest] > 0) {
          firePulse(nearest, neighbors[nearest * 3], handoff.energy, ctx);
        }
      },
      update: (dt, _t, ctx) => {
        for (let i = 0; i < nodeCount; i += 1) {
          const o = i * 4;
          nodes[o + 2] += dt * (0.18 + nodes[o + 3]);
          nodePulse[i] *= Math.exp(-dt * 4.2);
        }

        for (let p = 0; p < pulseCount;) {
          const o = p * 5;
          const from = pulses[o] | 0;
          const to = pulses[o + 1] | 0;
          const distance = Math.hypot(
            (nodes[from * 4] - nodes[to * 4]) * cols,
            (nodes[from * 4 + 1] - nodes[to * 4 + 1]) * rows,
          );
          pulses[o + 2] += (dt * (20 + 20 * ctx.mood.arousal)) / Math.max(2, distance);
          pulses[o + 3] *= Math.exp(-dt * 0.65);
          if (pulses[o + 2] >= 1) {
            nodePulse[to] = Math.min(1, nodePulse[to] + pulses[o + 3]);
            if (ctx.rng() < 0.28 + 0.34 * ctx.mood.curiosity && pulses[o + 4] < 0.6) {
              const count = 1 + ((ctx.rng() * Math.min(3, neighborCount[to])) | 0);
              for (let k = 0; k < count; k += 1) firePulse(to, neighbors[to * 3 + k], pulses[o + 3] * 0.76, ctx);
              pulses[o + 4] = 1;
            }
            pulseCount -= 1;
            const last = pulseCount * 5;
            pulses[o] = pulses[last];
            pulses[o + 1] = pulses[last + 1];
            pulses[o + 2] = pulses[last + 2];
            pulses[o + 3] = pulses[last + 3];
            pulses[o + 4] = pulses[last + 4];
            continue;
          }
          p += 1;
        }

        if (
          pulseCount < Math.min(12 + nodeCount, CFG.maxPulses - 2) &&
          ctx.rng() < dt * (1.2 + ctx.mood.attention * 2)
        ) {
          const from = (ctx.rng() * nodeCount) | 0;
          const nc = neighborCount[from];
          if (nc > 0) firePulse(from, neighbors[from * 3 + ((ctx.rng() * nc) | 0)], 0.55 + ctx.rng() * 0.45, ctx);
        }

        if (!bigIdeaFired && ctx.sceneTime > Math.max(8, ctx.sceneDuration - 4.5)) {
          bigIdeaFired = true;
          bigIdeaTime = ctx.sceneTime;
          nodePulse[bigIdeaNode] = 1;
        }
      },
      render: (ctx) => {
        clearScene();
        const sx = Math.sin(ctx.sceneTime * 0.16) * 0.01;
        const sy = Math.sin(ctx.sceneTime * 0.12 + 1.3) * 0.01;
        const graphHue = hueForSemantic("amber", ctx.mood.curiosity);

        for (let i = 0; i < nodeCount; i += 1) {
          const x = nodes[i * 4] + sx * Math.sin(nodes[i * 4 + 2]);
          const y = nodes[i * 4 + 1] + sy * Math.cos(nodes[i * 4 + 2]);
          const nc = neighborCount[i];
          for (let k = 0; k < nc; k += 1) {
            const j = neighbors[i * 3 + k];
            if (j < 0 || j <= i) continue;
            const x2 = nodes[j * 4] + sx * Math.sin(nodes[j * 4 + 2]);
            const y2 = nodes[j * 4 + 1] + sy * Math.cos(nodes[j * 4 + 2]);
            const minCol = Math.max(0, Math.floor(Math.min(x, x2) * cols - 2));
            const maxCol = Math.min(cols - 1, Math.ceil(Math.max(x, x2) * cols + 2));
            const minRow = Math.max(0, Math.floor(Math.min(y, y2) * rows - 2));
            const maxRow = Math.min(rows - 1, Math.ceil(Math.max(y, y2) * rows + 2));
            for (let row = minRow; row <= maxRow; row += 1) {
              const py = (row + 0.5) / rows;
              for (let col = minCol; col <= maxCol; col += 1) {
                const px = (col + 0.5) / cols;
                const d = capsuleDistance(px, py, x, y, x2, y2, 0.55);
                const a = clamp01(1 - d / 1.7);
                if (a <= 0) continue;
                const idx = row * cols + col;
                const val = 0.2 * a;
                if (val > sceneLum[idx]) sceneLum[idx] = val;
                if (a * 0.34 > sceneAlpha[idx]) sceneAlpha[idx] = a * 0.34;
                sceneHue[idx] = graphHue;
              }
            }
          }
        }

        for (let i = 0; i < nodeCount; i += 1) {
          const x = nodes[i * 4] + sx * Math.sin(nodes[i * 4 + 2]);
          const y = nodes[i * 4 + 1] + sy * Math.cos(nodes[i * 4 + 2]);
          const pulse = nodePulse[i];
          const radius = 0.9 + pulse * 0.75;
          writeBlob(x, y, radius, 0.42 + pulse * 0.45, graphHue, 0.55 + pulse * 0.4);
        }

        for (let p = 0; p < pulseCount; p += 1) {
          const o = p * 5;
          const from = pulses[o] | 0;
          const to = pulses[o + 1] | 0;
          const t = easeOut(pulses[o + 2]);
          const e = pulses[o + 3];
          const x = nodes[from * 4] + (nodes[to * 4] - nodes[from * 4]) * t;
          const y = nodes[from * 4 + 1] + (nodes[to * 4 + 1] - nodes[from * 4 + 1]) * t;
          writeBlob(x, y, 0.8, 0.65 * e, graphHue, 0.65 * e);
        }

        if (bigIdeaFired && bigIdeaTime >= 0) {
          const tt = ctx.sceneTime - bigIdeaTime;
          const r = tt * 18;
          const decay = Math.exp(-tt * 1.2);
          const bx = nodes[bigIdeaNode * 4];
          const by = nodes[bigIdeaNode * 4 + 1];
          const minCol = Math.max(0, Math.floor(bx * cols - r - 4));
          const maxCol = Math.min(cols - 1, Math.ceil(bx * cols + r + 4));
          const minRow = Math.max(0, Math.floor(by * rows - r - 4));
          const maxRow = Math.min(rows - 1, Math.ceil(by * rows + r + 4));
          for (let row = minRow; row <= maxRow; row += 1) {
            const py = (row + 0.5) / rows;
            for (let col = minCol; col <= maxCol; col += 1) {
              const px = (col + 0.5) / cols;
              const d = cellDistance(px, py, bx, by);
              const wave = Math.exp(-Math.abs(d - r) / 1.4) * decay;
              if (wave < 0.015) continue;
              const idx = row * cols + col;
              sceneLum[idx] = Math.max(sceneLum[idx], wave * 0.96);
              sceneAlpha[idx] = Math.max(sceneAlpha[idx], wave * 0.58);
              sceneHue[idx] = lerpHueCircular(AMBER_HUE, GOLD_HUE, 0.8);
            }
          }
        }
      },
      exit: () => {
        const o = bigIdeaNode * 4;
        return {
          x: nodes[o],
          y: nodes[o + 1],
          r: 0.03,
          energy: bigIdeaFired ? 1 : 0.74,
          hue: bigIdeaFired ? GOLD_HUE : AMBER_HUE,
        };
      },
    };

    let eyeBlinkAt = 4;
    let eyeBlinkPhase = 0;
    let eyeGazeX = 0.5;
    let eyeGazeY = 0.5;
    let eyeSaccadeX = 0.5;
    let eyeSaccadeY = 0.5;

    const eye: Scene = {
      id: "eye",
      duration: SCENE_CFG.eyeDuration,
      transition: "iris",
      enter: (ctx, handoff) => {
        eyeBlinkAt = 3 + ctx.rng() * 4;
        eyeBlinkPhase = 0;
        eyeGazeX = handoff.x;
        eyeGazeY = handoff.y;
        eyeSaccadeX = handoff.x;
        eyeSaccadeY = handoff.y;
      },
      update: (dt, _t, ctx) => {
        if (ctx.pointerActive) {
          const tx = 0.5 + (ctx.pointerX - 0.5) * 0.2;
          const ty = 0.5 + (ctx.pointerY - 0.5) * 0.16;
          eyeGazeX += (tx - eyeGazeX) * Math.min(1, dt * 4);
          eyeGazeY += (ty - eyeGazeY) * Math.min(1, dt * 4);
        } else {
          if (ctx.sceneTime > eyeSaccadeX + 1000) {
            // No expensive timers: deterministic saccade refresh from scene time.
          }
          let hot = -1;
          let hotV = 0;
          for (let i = 0; i < attentionHeat.length; i += 1) {
            if (attentionHeat[i] > hotV) {
              hotV = attentionHeat[i];
              hot = i;
            }
          }
          if (hot >= 0 && hotV > 0.02) {
            const hx = ((hot % 16) + 0.5) / 16;
            const hy = (Math.floor(hot / 16) + 0.5) / 9;
            eyeSaccadeX += (hx - eyeSaccadeX) * dt * 0.3;
            eyeSaccadeY += (hy - eyeSaccadeY) * dt * 0.3;
          } else {
            eyeSaccadeX = 0.5 + Math.sin(ctx.sceneTime * 0.7) * 0.13;
            eyeSaccadeY = 0.5 + Math.sin(ctx.sceneTime * 0.47 + 1.4) * 0.08;
          }
          eyeGazeX += (eyeSaccadeX - eyeGazeX) * Math.min(1, dt * 1.6);
          eyeGazeY += (eyeSaccadeY - eyeGazeY) * Math.min(1, dt * 1.6);
        }

        if (ctx.pointerSpeed > 1.6 || clickPulse > 0.75) {
          eyeBlinkPhase = Math.min(1, eyeBlinkPhase + dt * 4);
        } else {
          eyeBlinkPhase = Math.max(0, eyeBlinkPhase - dt * 2.5);
        }

        if (ctx.sceneTime >= eyeBlinkAt) {
          const local = ctx.sceneTime - eyeBlinkAt;
          if (local < 0.42) eyeBlinkPhase = easeInOut(local / 0.42);
          else if (local < 0.84) eyeBlinkPhase = 1 - easeInOut((local - 0.42) / 0.42);
          else {
            eyeBlinkAt += 3 + ctx.rng() * 4;
            eyeBlinkPhase = 0;
          }
        }
      },
      render: (ctx) => {
        clearScene();
        const openT = easeOut(clamp01(ctx.sceneTime / SCENE_CFG.eyeOpenSeconds));
        const closeT = easeIn(clamp01((ctx.sceneTime - ctx.sceneDuration * 0.8) / (ctx.sceneDuration * 0.2)));
        const lid = Math.min(openT, 1 - closeT);
        const cx = 0.5;
        const cy = 0.48;
        const a = Math.max(0.22, Math.min(0.34, 0.55 * Math.min(1, Math.min(cols, rows) / 54)));
        const b = a * 0.42;
        const pupilX = cx + clamp((eyeGazeX - 0.5) * 0.11, -0.105, 0.105);
        const pupilY = cy + clamp((eyeGazeY - 0.5) * 0.08, -0.075, 0.075);
        const eyeHue = hueForSemantic("amber", ctx.mood.attention);
        const irisHue = lerpHueCircular(AMBER_HUE, GOLD_HUE, 0.08);

        const minCol = Math.max(0, Math.floor((cx - a - 0.02) * cols));
        const maxCol = Math.min(cols - 1, Math.ceil((cx + a + 0.02) * cols));
        const minRow = Math.max(0, Math.floor((cy - b - 0.02) * rows));
        const maxRow = Math.min(rows - 1, Math.ceil((cy + b + 0.02) * rows));

        for (let row = minRow; row <= maxRow; row += 1) {
          const y = (row + 0.5) / rows;
          for (let col = minCol; col <= maxCol; col += 1) {
            const x = (col + 0.5) / cols;
            const nx = (x - cx) / a;
            const taper = Math.cos(nx * Math.PI * 0.5);
            const hh = b * (0.28 + 0.72 * Math.max(0, taper));
            const q = Math.hypot((x - cx) / a, (y - cy) / Math.max(0.001, hh));
            const d = (q - 1) * Math.min(a * cols, b * rows);
            if (d > CFG.sceneSoftCells) continue;
            const edge = clamp01(1 - d / CFG.sceneSoftCells);
            const lidMask = clamp01(((b * lid - Math.abs(y - cy)) * rows) / 1.5 + 0.1);
            const aa = edge * lidMask;
            const idx = row * cols + col;
            sceneLum[idx] = Math.max(sceneLum[idx], 0.52 * aa);
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.58 * aa);
            sceneHue[idx] = eyeHue;
          }
        }

        const irisR = Math.min(cols, rows) * 0.18;
        const ringW = 2.2;
        const pR = Math.min(cols, rows) * (0.07 + ctx.pointerSpeed * 0.005);
        const coreMinX = Math.max(0, Math.floor(pupilX * cols - irisR - 4));
        const coreMaxX = Math.min(cols - 1, Math.ceil(pupilX * cols + irisR + 4));
        const coreMinY = Math.max(0, Math.floor(pupilY * rows - irisR - 4));
        const coreMaxY = Math.min(rows - 1, Math.ceil(pupilY * rows + irisR + 4));
        for (let row = coreMinY; row <= coreMaxY; row += 1) {
          const y = (row + 0.5) / rows;
          for (let col = coreMinX; col <= coreMaxX; col += 1) {
            const x = (col + 0.5) / cols;
            const d = cellDistance(x, y, pupilX, pupilY);
            const iris = Math.exp(-Math.abs(d - irisR) / ringW);
            const pupil = Math.exp(-d / Math.max(0.5, pR));
            const idx = row * cols + col;
            sceneLum[idx] = Math.max(sceneLum[idx], iris * 0.66 * lid);
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], iris * 0.7 * lid);
            sceneHue[idx] = irisHue;
            sceneLum[idx] = Math.max(sceneLum[idx], pupil * 0.22 * lid);
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], pupil * 0.7 * lid);
          }
        }

        const hx = cx + (ctx.pointerX - 0.5) * 0.18;
        const hy = cy + (ctx.pointerY - 0.5) * 0.12;
        writeBlob(hx, hy, 0.65, 0.9, GOLD_HUE, 0.9 * lid);

        if (ctx.sceneTime > ctx.sceneDuration * 0.82) {
          const wipeT = easeInOut((ctx.sceneTime - ctx.sceneDuration * 0.82) / (ctx.sceneDuration * 0.18));
          for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
              const x = (col + 0.5) / cols;
              const y = (row + 0.5) / rows;
              const d = cellDistance(x, y, pupilX, pupilY);
              if (d < 1 + wipeT * Math.min(cols, rows)) {
                const idx = row * cols + col;
                sceneAlpha[idx] *= 1 - wipeT * 0.5;
              }
            }
          }
        }
      },
      exit: () => ({ x: 0.5, y: 0.48, r: 0.2, energy: 0.88, hue: irisBlinkHue() }),
    };

    const irisBlinkHue = (): number => lerpHueCircular(AMBER_HUE, GOLD_HUE, 0.14);

    const worldBuildings = new Float32Array(CFG.maxBuildings * 6);
    const worldFigures = new Float32Array(CFG.maxWorldFigures * 5);
    const worldRain = new Float32Array(CFG.maxRain * 4);
    let worldBuildingCount = 0;
    let worldFigureCount = 0;
    let worldRainCount = 0;
    let worldVariantNoise = 0;

    const setupWorld = (ctx: SceneContext): void => {
      worldBuildingCount = Math.min(CFG.maxBuildings, 18 + Math.floor(ctx.cols / 3));
      let x = -0.04;
      for (let i = 0; i < worldBuildingCount; i += 1) {
        const o = i * 6;
        const w = 0.02 + ctx.rng() * 0.04;
        const h = 0.07 + ctx.rng() * (0.14 + ctx.mood.curiosity * 0.12);
        worldBuildings[o] = x;
        worldBuildings[o + 1] = w;
        worldBuildings[o + 2] = h;
        worldBuildings[o + 3] = 1.5 + ctx.rng() * 20;
        worldBuildings[o + 4] = ctx.rng();
        worldBuildings[o + 5] = 0;
        x += w + 0.006 + ctx.rng() * 0.015;
      }
      worldFigureCount = Math.min(CFG.maxWorldFigures, Math.floor(ctx.mood.curiosity * 3));
      for (let i = 0; i < worldFigureCount; i += 1) {
        const o = i * 5;
        worldFigures[o] = 0.12 + ctx.rng() * 0.76;
        worldFigures[o + 1] = -1;
        worldFigures[o + 2] = 0.16 + ctx.rng() * 0.18;
        worldFigures[o + 3] = 0.002 + ctx.rng() * 0.003;
        worldFigures[o + 4] = 0.6 + ctx.rng() * 0.8;
      }
      worldRainCount =
        timeOfDay === "night"
          ? Math.min(CFG.maxRain, 16 + ((ctx.rng() * 14) | 0))
          : Math.min(CFG.maxRain, 8 + ((ctx.rng() * 14) | 0));
      for (let i = 0; i < worldRainCount; i += 1) {
        const o = i * 4;
        worldRain[o] = ctx.rng();
        worldRain[o + 1] = ctx.rng();
        worldRain[o + 2] = 0.04 + ctx.rng() * 0.1;
        worldRain[o + 3] = 0.5 + ctx.rng() * 1.2;
      }
      worldVariantNoise = ctx.rng();
    };

    const world: Scene = {
      id: "world",
      duration: SCENE_CFG.worldDuration,
      transition: "scan",
      enter: (ctx, handoff) => {
        setupWorld(ctx);
        if (handoff.r > 0.08) worldVariantNoise += handoff.r;
      },
      update: (dt, _t, ctx) => {
        for (let i = 0; i < worldFigureCount; i += 1) {
          const o = i * 5;
          worldFigures[o] += dt * worldFigures[o + 3] * worldFigures[o + 4];
          if (worldFigures[o] > 1.02) worldFigures[o] = -0.04;
        }
        for (let i = 0; i < worldRainCount; i += 1) {
          const o = i * 4;
          worldRain[o + 1] += dt * worldRain[o + 3] * 0.04;
          if (worldRain[o + 1] > 1.05) worldRain[o + 1] = -0.05;
        }
      },
      render: (ctx) => {
        clearScene();
        const skyHue = worldHue();
        const dusk = timeOfDay === "dusk" ? 0.11 : 0;
        const night = timeOfDay === "night" ? 0.18 : 0;
        const horizon = SCENE_CFG.cityHorizon;
        const sunArc = easeInOut((ctx.sceneTime % ctx.sceneDuration) / ctx.sceneDuration);
        const sunX = 0.18 + sunArc * 0.64;
        const sunBaseY = timeOfDay === "night" ? 0.28 : 0.44;
        const sunY = sunBaseY - Math.sin(sunArc * Math.PI) * 0.2;
        const sunLum = timeOfDay === "night" ? 0.35 : 0.84;
        writeBlob(
          sunX,
          sunY,
          timeOfDay === "night" ? 3.4 : 4.6,
          sunLum,
          lerpHueCircular(skyHue, GOLD_HUE, timeOfDay === "night" ? 0.0 : 0.75),
          timeOfDay === "night" ? 0.46 : 0.72,
        );

        for (let row = Math.floor(horizon * rows); row < rows; row += 1) {
          const y = (row + 0.5) / rows;
          const ridge1 =
            horizon + 0.11 + fbm(y * 2.2 + worldVariantNoise, 0.4, seed * 0.0001 + ctx.sceneTime * 0.015) * 0.09;
          const ridge2 = horizon + 0.15 + fbm(y * 1.4 + 3.3, 0.7, seed * 0.00013 + ctx.sceneTime * 0.01) * 0.1;
          for (let col = 0; col < cols; col += 1) {
            const x = (col + 0.5) / cols;
            const drift1 = Math.sin(x * 5 + ctx.sceneTime * 0.035) * 0.017;
            const drift2 = Math.sin(x * 3.7 - ctx.sceneTime * 0.022) * 0.025;
            const idx = row * cols + col;
            let land = 0;
            if (y > ridge1 + drift1) land = 0.2;
            if (y > ridge2 + drift2) land = Math.max(land, 0.26);
            sceneLum[idx] = Math.max(sceneLum[idx], land * (1 - night * 0.6));
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], land > 0 ? 0.55 : 0);
            sceneHue[idx] = lerpHueCircular(skyHue, EMBER_HUE, 0.65);
          }
        }

        const growT = easeOut(clamp01(ctx.sceneTime / SCENE_CFG.cityGrow));
        const unmakeT = easeIn(clamp01((ctx.sceneTime - Math.max(0, ctx.sceneDuration - 5)) / 5));
        const buildingHue = lerpHueCircular(skyHue, EMBER_HUE, 0.34 + dusk);
        for (let b = 0; b < worldBuildingCount; b += 1) {
          const o = b * 6;
          const bx = worldBuildings[o];
          const bw = worldBuildings[o + 1];
          const bh = worldBuildings[o + 2];
          const start = worldBuildings[o + 3];
          const grow = clamp01((ctx.sceneTime - start * 0.15) / SCENE_CFG.cityGrow) * growT;
          const h = bh * easeOut(grow) * (1 - unmakeT);
          if (h <= 0) continue;
          const baseY = horizon + 0.14;
          const topY = baseY - h;
          const minCol = Math.max(0, Math.floor(bx * cols));
          const maxCol = Math.min(cols - 1, Math.ceil((bx + bw) * cols));
          const minRow = Math.max(0, Math.floor(topY * rows));
          const maxRow = Math.min(rows - 1, Math.ceil(baseY * rows));
          for (let row = minRow; row <= maxRow; row += 1) {
            const y = (row + 0.5) / rows;
            for (let col = minCol; col <= maxCol; col += 1) {
              const x = (col + 0.5) / cols;
              const d = rectSoftSdf(x, y, bx + bw * 0.5, baseY - h * 0.5, bw * 0.5, h * 0.5);
              const edge = clamp01(1 - d / CFG.sceneSoftCells);
              const idx = row * cols + col;
              if (edge > sceneAlpha[idx]) sceneAlpha[idx] = edge * 0.66;
              sceneLum[idx] = Math.max(sceneLum[idx], 0.3 * edge);
              sceneHue[idx] = buildingHue;
            }
          }

          const windowChance = 0.11 + ctx.mood.attention * 0.1;
          const columns = Math.max(1, Math.floor((bw * cols) / 2.7));
          const windowRows = Math.max(2, Math.floor((h * rows) / 4.8));
          for (let wy = 0; wy < windowRows; wy += 1) {
            for (let wx = 0; wx < columns; wx += 1) {
              const hash = hash3(b * 31 + wx, wy, seed);
              const on = hash < windowChance + 0.03 * Math.sin(ctx.sceneTime * 0.7 + hash * 12);
              if (!on) continue;
              const px = bx + ((wx + 0.5) * bw) / columns;
              const py = topY + ((wy + 0.5) * h) / windowRows;
              const flick = 0.45 + 0.25 * Math.sin(ctx.sceneTime * (0.8 + hash) + hash * 20);
              writeBlob(
                px,
                py,
                0.42,
                flick * (timeOfDay === "night" ? 0.86 : 0.58),
                timeOfDay === "night" ? AMBER_HUE : GOLD_HUE,
                0.44,
              );
            }
          }
        }

        const roadY = SCENE_CFG.worldRoadY;
        for (let col = 0; col < cols; col += 1) {
          const x = (col + 0.5) / cols;
          const roadDist = Math.abs(x - 0.5) * 0.025;
          for (
            let row = Math.floor((roadY - 0.025) * rows);
            row < Math.min(rows, Math.ceil((roadY + 0.025) * rows));
            row += 1
          ) {
            const idx = row * cols + col;
            sceneLum[idx] = Math.max(sceneLum[idx], 0.24 - roadDist);
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.5);
            sceneHue[idx] = emberRoadHue();
          }
        }

        const wx = 0.16 + easeInOut(clamp01(ctx.sceneTime / ctx.sceneDuration)) * 0.67;
        const wy = roadY - SCENE_CFG.wandererHeightWorld;
        drawMiniWanderer(ctx, wx, wy, 1, 0.7);

        for (let i = 0; i < worldFigureCount; i += 1) {
          const o = i * 5;
          const fx = worldFigures[o];
          const fy = roadY - 0.055;
          drawMiniWanderer(ctx, fx, fy, 0.58, 0.35);
        }

        if (timeOfDay === "night") {
          for (let i = 0; i < 14; i += 1) {
            const sx = wrap01(hash3(i + 13, 7, seed) * 1.2);
            const sy = 0.08 + hash3(i + 19, 3, seed) * 0.34;
            if (Math.sin(ctx.sceneTime * 0.45 + i * 1.7) < -0.82) continue;
            writeBlob(sx, sy, 0.4, 0.42, GOLD_HUE, 0.28);
          }
        } else if (timeOfDay === "dawn") {
          for (let i = 0; i < worldRainCount; i += 1) {
            const o = i * 4;
            const x = worldRain[o];
            const y = worldRain[o + 1];
            writeBlob(x, y, 0.35, 0.26, AMBER_HUE, 0.22);
          }
        } else {
          for (let i = 0; i < Math.min(18, worldRainCount); i += 1) {
            const o = i * 4;
            const x = worldRain[o];
            const y = worldRain[o + 1];
            writeBlob(x, y, 0.32, 0.2, AMBER_HUE, 0.2);
          }
        }
      },
      exit: () => ({ x: 0.78, y: SCENE_CFG.worldRoadY - 0.05, r: 0.03, energy: 0.72, hue: AMBER_HUE }),
    };

    const emberRoadHue = (): number => lerpHueCircular(EMBER_HUE, AMBER_HUE, 0.24);

    const drawMiniWanderer = (ctx: SceneContext, x: number, y: number, scale: number, strength: number): void => {
      const h = SCENE_CFG.wandererHeightWorld * scale;
      const phase = ctx.sceneTime * (2.2 + ctx.mood.arousal * 0.6) + x * 18;
      const stride = Math.sin(phase) * 0.009;
      writeBlob(x, y - h * 0.82, Math.max(0.38, scale * 0.55), 0.48 * strength, AMBER_HUE, 0.5 * strength);
      drawCapsuleLimited(
        ctx,
        x,
        y - h * 0.73,
        x + stride,
        y - h * 0.38,
        0.85 * scale,
        0.38 * strength,
        EMBER_HUE,
        0.66 * strength,
      );
      drawCapsuleLimited(
        ctx,
        x + stride,
        y - h * 0.39,
        x - stride,
        y,
        0.75 * scale,
        0.4 * strength,
        EMBER_HUE,
        0.64 * strength,
      );
    };

    const drawCapsuleLimited = (
      ctx: SceneContext,
      ax: number,
      ay: number,
      bx: number,
      by: number,
      radius: number,
      lum: number,
      hue: number,
      alpha: number,
    ): void => {
      const minCol = Math.max(0, Math.floor(Math.min(ax, bx) * cols - radius - 1));
      const maxCol = Math.min(cols - 1, Math.ceil(Math.max(ax, bx) * cols + radius + 1));
      const minRow = Math.max(0, Math.floor(Math.min(ay, by) * rows - radius - 1));
      const maxRow = Math.min(rows - 1, Math.ceil(Math.max(ay, by) * rows + radius + 1));
      for (let row = minRow; row <= maxRow; row += 1) {
        const py = (row + 0.5) / rows;
        for (let col = minCol; col <= maxCol; col += 1) {
          const px = (col + 0.5) / cols;
          const d = capsuleDistance(px, py, ax, ay, bx, by, radius);
          const a = clamp01(1 - d / (CFG.sceneSoftCells + 1.6));
          if (a <= 0) continue;
          const idx = row * cols + col;
          sceneLum[idx] = Math.max(sceneLum[idx], lum * a);
          sceneAlpha[idx] = Math.max(sceneAlpha[idx], alpha * a);
          sceneHue[idx] = hue;
        }
      }
    };

    const humanJoint = new Float32Array(13 * 2); // head, neck, pelvis, two arms, two legs.
    const backgroundHuman = new Float32Array(CFG.maxHumanFigures * 4);
    let humanState = 0;
    let humanStateTime = 0;
    let humanPhase = 0;
    let humanNoticed = false;
    let thinkingStarted = false;

    const configureHumanState = (ctx: SceneContext): void => {
      const r = ctx.rng();
      if (ctx.mood.arousal > 0.7) humanState = r < 0.52 ? 1 : 0;
      else if (ctx.mood.calm > 0.72) humanState = r < 0.35 ? 3 : r < 0.65 ? 4 : 2;
      else humanState = r < 0.2 ? 2 : r < 0.38 ? 3 : r < 0.56 ? 4 : r < 0.74 ? 5 : r < 0.9 ? 6 : 0;
      humanPhase = r * Math.PI * 2;
      humanStateTime = 0;
      humanNoticed = false;
      thinkingStarted = false;
      for (let i = 0; i < backgroundHuman.length; i += 4) backgroundHuman[i] = 0;
      const bgCount = Math.min(CFG.maxHumanFigures - 1, Math.floor(ctx.mood.arousal * 3));
      for (let i = 0; i < bgCount; i += 1) {
        const o = i * 4;
        backgroundHuman[o] = 0.12 + ctx.rng() * 0.76;
        backgroundHuman[o + 1] = 0.008 + ctx.rng() * 0.012;
        backgroundHuman[o + 2] = ctx.rng() < 0.5 ? -1 : 1;
        backgroundHuman[o + 3] = 0.12 + ctx.rng() * 0.08;
      }
    };

    const buildHumanSkeleton = (
      ctx: SceneContext,
      x: number,
      baseY: number,
      scale: number,
      state: number,
      phase: number,
    ): void => {
      const H = SCENE_CFG.humanHeight * scale;
      const bob = state === 0 ? Math.sin(phase * 2) * H * 0.02 : state === 1 ? Math.sin(phase * 1.7) * H * 0.035 : 0;
      const torsoLean = state === 6 ? -0.12 : state === 2 ? 0.05 : 0;
      const jump = state === 6 ? Math.max(0, Math.sin(phase)) * H * 0.1 : 0;
      const headY = baseY - H + bob - jump;
      humanJoint[0] = x;
      humanJoint[1] = headY;
      if (state === 2 && humanNoticed) humanJoint[0] += clamp((pointerX - x) * 0.1, -0.06, 0.06);
      humanJoint[2] = x + torsoLean * H;
      humanJoint[3] = headY + H * 0.16;
      humanJoint[4] = x + torsoLean * H * 0.75;
      humanJoint[5] = headY + H * 0.52;

      const arm = H * 0.23;
      const leg = H * 0.36;
      const gait = Math.sin(phase);
      const gait2 = Math.sin(phase + Math.PI);
      const wave = state === 2 ? 1 : 0;

      humanJoint[6] = x - H * 0.12 - arm * (0.35 + 0.25 * gait);
      humanJoint[7] = humanJoint[3] + arm * (0.55 + 0.2 * Math.abs(gait));
      humanJoint[8] = x - H * 0.12 - arm * (0.82 + 0.25 * gait) + wave * H * 0.08;
      humanJoint[9] = humanJoint[3] + arm * (1.04 + wave * 0.16);

      humanJoint[10] = x + H * 0.12 + arm * (0.35 + 0.25 * gait2);
      humanJoint[11] = humanJoint[3] + arm * (0.55 + 0.16 * Math.abs(gait2));
      humanJoint[12] = x + H * 0.12 + arm * (0.82 + 0.25 * gait2);
      humanJoint[13] = humanJoint[3] + arm * (1.03 + wave * 0.06);
      if (state === 6) {
        humanJoint[6] -= H * 0.05;
        humanJoint[7] -= arm * 0.48;
        humanJoint[8] -= H * 0.09;
        humanJoint[9] -= arm * 0.9;
        humanJoint[10] += H * 0.05;
        humanJoint[11] -= arm * 0.48;
        humanJoint[12] += H * 0.09;
        humanJoint[13] -= arm * 0.9;
      }

      const hipY = headY + H * 0.52;
      humanJoint[14] = x - H * 0.08;
      humanJoint[15] = hipY;
      humanJoint[16] = x - H * 0.08 + leg * 0.35 * gait;
      humanJoint[17] = hipY + leg * (0.52 + 0.08 * Math.abs(gait));
      humanJoint[18] = x - H * 0.08 - leg * 0.15 * gait;
      humanJoint[19] = baseY;
      humanJoint[20] = x + H * 0.08;
      humanJoint[21] = hipY;
      humanJoint[22] = x + H * 0.08 + leg * 0.35 * gait2;
      humanJoint[23] = hipY + leg * (0.52 + 0.08 * Math.abs(gait2));
      humanJoint[24] = x + H * 0.08 - leg * 0.15 * gait2;
      humanJoint[25] = baseY;

      if (state === 3) {
        humanJoint[16] = x - H * 0.15;
        humanJoint[17] = hipY + leg * 0.68;
        humanJoint[18] = x - H * 0.03;
        humanJoint[19] = baseY;
        humanJoint[22] = x + H * 0.15;
        humanJoint[23] = hipY + leg * 0.68;
        humanJoint[24] = x + H * 0.03;
        humanJoint[25] = baseY;
      }
    };

    const renderHumanFigure = (
      ctx: SceneContext,
      scale: number,
      x: number,
      baseY: number,
      state: number,
      phase: number,
      strength: number,
    ): void => {
      buildHumanSkeleton(ctx, x, baseY, scale, state, phase);
      const bodyHue = EMBER_HUE;
      const rimHue = AMBER_HUE;
      for (let i = 0; i < HUMAN_BONES.length; i += 1) {
        const b = HUMAN_BONES[i];
        const aIdx = b[0];
        const bIdx = b[1];
        const radCells = Math.max(0.65, b[2]);
        drawCapsuleLimited(
          ctx,
          humanJoint[aIdx],
          humanJoint[aIdx + 1],
          humanJoint[bIdx],
          humanJoint[bIdx + 1],
          radCells,
          b[3] * strength,
          bodyHue,
          0.74 * strength,
        );
        drawCapsuleLimited(
          ctx,
          humanJoint[aIdx],
          humanJoint[aIdx + 1],
          humanJoint[bIdx],
          humanJoint[bIdx + 1],
          Math.max(0.65, SCENE_CFG.humanRim * cols),
          b[3] * 0.9 * strength,
          rimHue,
          0.2 * strength,
        );
      }
      writeBlob(humanJoint[0], humanJoint[1], 2.0 * strength, 0.22 * strength, bodyHue, 0.8 * strength);
      writeBlob(
        humanJoint[0],
        humanJoint[1],
        Math.max(0.7, SCENE_CFG.humanRim * cols),
        0.75 * strength,
        rimHue,
        0.36 * strength,
      );

      if (state === 4) {
        const lx = humanJoint[8];
        const ly = humanJoint[9];
        for (let i = 0; i < 3; i += 1) writeBlob(lx + (i - 1) * 0.008, ly + 0.008, 0.55, 0.82, GOLD_HUE, 0.58);
      }
    };

    const human: Scene = {
      id: "human",
      duration: SCENE_CFG.humanDuration,
      transition: "crossfade",
      enter: (ctx, _handoff) => configureHumanState(ctx),
      update: (dt, _t, ctx) => {
        humanStateTime += dt;
        humanPhase += dt * (humanState === 1 ? 3.1 : humanState === 0 ? 2.1 : 1.3);
        for (let i = 0; i < backgroundHuman.length; i += 4) {
          const speed = backgroundHuman[i + 1];
          const dir = backgroundHuman[i + 2];
          if (speed === 0) continue;
          backgroundHuman[i] += dir * speed * dt;
          if (backgroundHuman[i] > 1.05) backgroundHuman[i] = -0.05;
          if (backgroundHuman[i] < -0.05) backgroundHuman[i] = 1.05;
        }

        if (!humanNoticed && noticedThisVisit && ctx.pointerSpeed > 1.3 && ctx.pointerNear) {
          humanNoticed = true;
          humanState = 2;
          humanStateTime = 0;
        }

        if (humanStateTime > ctx.sceneDuration * 0.5 && !thinkingStarted) {
          thinkingStarted = true;
          if (ctx.mood.curiosity > 0.5) humanState = 5;
        }
      },
      render: (ctx) => {
        clearScene();
        if (humanState === 5) {
          const x = 0.55;
          const y = 0.84;
          renderHumanFigure(ctx, 1, x, y, 0, 0.1, 0.86);
          for (let i = 0; i < 14; i += 1) {
            const a = i * 0.57 + ctx.sceneTime * 0.4;
            const r = 0.04 + (i % 3) * 0.02;
            const sx = x + Math.cos(a) * r;
            const sy = y - SCENE_CFG.humanHeight * 0.4 - Math.abs(Math.sin(a)) * 0.11;
            writeBlob(sx, sy, 0.58, 0.58, AMBER_HUE, 0.46);
          }
        } else {
          renderHumanFigure(ctx, 1, 0.54, 0.86, humanState, humanPhase, 1);
        }

        for (let i = 0; i < CFG.maxHumanFigures - 1; i += 1) {
          const o = i * 4;
          if (backgroundHuman[o + 1] <= 0) continue;
          renderHumanFigure(ctx, 0.45, backgroundHuman[o], 0.86, 0, humanPhase * 0.55 + i, backgroundHuman[o + 3]);
        }

        if (humanState === 6) {
          const deskX = 0.67;
          const deskY = 0.72;
          for (let i = 0; i < 4; i += 1) writeBlob(deskX + i * 0.013, deskY, 0.38, 0.76, GOLD_HUE, 0.54);
        }
      },
      exit: () => ({ x: 0.55, y: 0.46, r: 0.04, energy: 0.85, hue: humanState === 5 ? AMBER_HUE : EMBER_HUE }),
    };

    let dreamThought = "hello.";
    let dreamThoughtStart = -1;
    let dreamReplayOffset = 0;
    let dreamReverse = false;

    const thoughts: Record<string, readonly string[]> = {
      ambient: ["hello.", "still thinking...", "oh.", "slow down."],
      reactive: ["you're here", "you left.", "slow down.", "oh."],
      "welcome-back": ["hello.", "you're here", "oh."],
    };

    const pickThought = (ctx: SceneContext): string => {
      let category = "ambient";
      if (returnThought) category = "welcome-back";
      else if (noticeThought || ctx.clickPulse > 0.1 || scrollVelocity > 1.2) category = "reactive";
      const items = thoughts[category];
      const selected = items[(ctx.rng() * items.length) | 0];
      return selected;
    };

    const glyphWidth5 = 5;
    const glyphWidth3 = 3;

    const drawThought = (ctx: SceneContext, textValue: string, progress: number): void => {
      const compact = cols < 34;
      const scale = compact ? 1 : 1;
      const charW = compact ? glyphWidth3 : glyphWidth5;
      const gap = compact ? 1 : 1;
      const maxCols = Math.floor(cols * 0.7);
      let charsPerLine = Math.max(1, Math.floor((maxCols + gap) / (charW + gap)));
      if (charsPerLine < 2 && textValue.length > 1) {
        writeBlob(0.5, 0.5, 2.0, 0.72, AMBER_HUE, 0.5);
        return;
      }
      const lineCount = Math.ceil(textValue.length / charsPerLine);
      if (lineCount > 2) {
        writeBlob(0.5, 0.5, 2.4, 0.52, AMBER_HUE, 0.4);
        return;
      }
      const visibleChars = Math.min(textValue.length, Math.max(1, Math.floor(progress * textValue.length + 1e-6)));
      const blockW = Math.min(maxCols, charsPerLine * (charW + gap) - gap);
      const startX = Math.max(0, Math.floor((cols - blockW) * 0.5));
      const startY = Math.floor((rows - lineCount * 7) * 0.5);
      for (let i = 0; i < visibleChars; i += 1) {
        const ch = textValue[i].toLowerCase();
        const code = glyphLetters.indexOf(ch);
        const line = Math.floor(i / charsPerLine);
        const place = i % charsPerLine;
        const gx = startX + place * (charW + gap);
        const gy = startY + line * 7;
        if (code < 0) continue;
        if (!compact) {
          const src = glyphRows[ch];
          if (!src) continue;
          for (let row = 0; row < 7; row += 1) {
            const bits = src[row];
            for (let bit = 0; bit < 5; bit += 1) {
              if ((bits & (1 << (4 - bit))) === 0) continue;
              const x = gx + bit;
              const y = gy + row;
              if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
              const idx = y * cols + x;
              sceneLum[idx] = Math.max(sceneLum[idx], 0.66);
              sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.66);
              sceneHue[idx] = semanticAt(AMBER_HUE, EMBER_HUE);
            }
          }
        } else {
          const src = glyphRows[ch];
          if (!src) continue;
          for (let row = 0; row < 5; row += 1) {
            const sourceBits = src[row + 1] || 0;
            for (let bit = 0; bit < 3; bit += 1) {
              const sourceBit = 4 - bit;
              if ((sourceBits & (1 << sourceBit)) === 0) continue;
              const x = gx + bit;
              const y = gy + row + 1;
              if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
              const idx = y * cols + x;
              sceneLum[idx] = Math.max(sceneLum[idx], 0.62);
              sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.62);
              sceneHue[idx] = EMBER_HUE;
            }
          }
        }
      }
    };

    const dream: Scene = {
      id: "dream",
      duration: SCENE_CFG.dreamDuration,
      transition: "scan",
      enter: (ctx, _handoff) => {
        if (tabLeftPending) {
          dreamThought = "you left.";
          tabLeftPending = false;
        } else if (tabBackPending) {
          dreamThought = "you're here";
          tabBackPending = false;
        } else dreamThought = pickThought(ctx);
        dreamThoughtStart = ctx.sceneTime;
        dreamReplayOffset = ctx.rng() * 0.7;
        dreamReverse = ctx.rng() < 0.35;
        returnThought = false;
        noticeThought = false;
      },
      update: (dt, _t, ctx) => {
        dreamReplayOffset += dt * (dreamReverse ? -0.18 : 0.22 + ctx.mood.calm * 0.08);
        if (ctx.sceneTime > SCENE_CFG.dreamDuration[0] * 0.45 && dreamThought.length > 0) {
          dreamThoughtStart = Math.min(dreamThoughtStart, ctx.sceneTime - 0.8);
        }
      },
      render: (ctx) => {
        clearScene();
        if (snapshotCount > 0 && snapshotSize === cols * rows) {
          const age = easeInOut(clamp01(ctx.sceneTime / ctx.sceneDuration));
          for (let row = 0; row < rows; row += 1) {
            const slice = Math.floor((row / Math.max(1, rows)) * 7);
            const shift = Math.sin(ctx.sceneTime * 1.3 + slice * 0.8) * SCENE_CFG.dreamSlice;
            const srcIndex = Math.max(
              0,
              Math.min(snapshotCount - 1, Math.floor(Math.abs(Math.sin(dreamReplayOffset + slice)) * snapshotCount)),
            );
            const actual = dreamReverse
              ? (snapshotHead - 1 - srcIndex + CFG.snapshotCount) % CFG.snapshotCount
              : (snapshotHead - 1 - srcIndex + CFG.snapshotCount) % CFG.snapshotCount;
            const srcBase = actual * snapshotSize;
            for (let col = 0; col < cols; col += 1) {
              const shiftedX = col + Math.round(shift * cols);
              const srcCol = ((shiftedX % cols) + cols) % cols;
              const idx = row * cols + col;
              const q = snapshots[srcBase + row * cols + srcCol] / 63;
              const ghost = q * (0.38 + 0.22 * (1 - age));
              sceneLum[idx] = Math.min(0.85, ghost);
              sceneAlpha[idx] = clamp01(0.32 + q * 0.38);
              sceneHue[idx] = lerpHueCircular(EMBER_HUE, AMBER_HUE, 0.12 + 0.15 * q);
            }
          }
        }

        for (let i = 0; i < attentionHeat.length; i += 1) {
          const v = attentionHeat[i];
          if (v < 0.035) continue;
          const hx = ((i % 16) + 0.5) / 16;
          const hy = (Math.floor(i / 16) + 0.5) / 9;
          writeBlob(hx, hy, 1.0 + v * 1.5, 0.24 * v, EMBER_HUE, 0.2 * v);
        }

        const thoughtAge = ctx.sceneTime - dreamThoughtStart;
        if (thoughtAge >= 0 && thoughtAge < dreamThought.length * 0.42 + CFG.thoughtHold + 1) {
          const writeStart = dreamThought.length * 0.42;
          const progress = thoughtAge < writeStart ? easeInOut(thoughtAge / Math.max(0.1, writeStart)) : 1;
          const hold = thoughtAge > writeStart && thoughtAge < writeStart + CFG.thoughtHold;
          const fade = hold
            ? 1
            : thoughtAge >= writeStart + CFG.thoughtHold
              ? 1 - easeInOut((thoughtAge - writeStart - CFG.thoughtHold) / 1.3)
              : 1;
          if (fade > 0) {
            drawThought(ctx, dreamThought, progress);
            if (fade < 1) {
              for (let i = 0; i < sceneAlpha.length; i += 1) sceneAlpha[i] *= fade;
            }
          }
        }
      },
      exit: () => ({ x: 0.5, y: 0.5, r: 0.14, energy: 0.4, hue: EMBER_HUE }),
    };

    const scenes: Scene[] = [spark, neural, eye, world, human, dream];

    const sceneById = (id: SceneId): Scene => {
      if (id === "spark") return spark;
      if (id === "neural") return neural;
      if (id === "eye") return eye;
      if (id === "world") return world;
      if (id === "human") return human;
      return dream;
    };

    /* ========================================================
       DIRECTOR
       ======================================================== */

    let episode = 1;
    let beatIndex = -1;
    let beatElapsed = 0;
    let currentScene: Scene | null = null;
    let currentSceneDuration = 0;
    let previousSceneId: SceneId | null = null;
    let previousHandoff: Handoff = { x: 0.5, y: 0.5, r: 0.08, energy: 0.65, hue: EMBER_HUE };
    let beats: Beat[] = [];
    let lastEpisodeSignature = "";

    const randomDuration = (range: DurationRange): number => range[0] + rng() * (range[1] - range[0]);

    const pushBeat = (kind: BeatKind, sceneId: SceneId | null, duration: number, variant: number): void => {
      beats.push({ kind, scene: sceneId, duration, variant });
    };

    const addRest = (): void => pushBeat("rest", null, CFG.restMin + rng() * (CFG.restMax - CFG.restMin), 0);

    const buildEpisode = (): void => {
      beats = [];
      pushBeat("sleep", null, CFG.sleepMin + rng() * (CFG.sleepMax - CFG.sleepMin), 0);
      pushBeat("scene", "spark", randomDuration(SCENE_CFG.sparkDuration), rng());
      addRest();
      pushBeat("scene", "neural", randomDuration(SCENE_CFG.neuralDuration), rng());
      addRest();

      const candidates: SceneId[] = ["eye", "world", "human", "dream", "world", "human"];
      if (mood.curiosity > 0.62) {
        candidates[0] = "eye";
        candidates[1] = "world";
        candidates[2] = "world";
      } else if (mood.arousal > 0.68) {
        candidates[0] = "human";
        candidates[1] = "neural";
        candidates[2] = "human";
      } else if (mood.calm > 0.74) {
        candidates[0] = "dream";
        candidates[1] = "world";
        candidates[2] = "dream";
      }

      let last: SceneId | null = "neural";
      const middleCount = 4 + ((rng() * 3) | 0);
      for (let i = 0; i < middleCount; i += 1) {
        let pick = candidates[(rng() * candidates.length) | 0];
        if (pick === last) pick = pick === "world" ? "human" : "world";
        const range = sceneById(pick).duration;
        pushBeat("scene", pick, randomDuration(range), rng());
        last = pick;
        addRest();
      }

      pushBeat("idea", "neural", Math.max(20, randomDuration(SCENE_CFG.neuralDuration)), rng());
      addRest();
      pushBeat("scene", "dream", randomDuration(SCENE_CFG.dreamDuration), rng());
      if (mood.curiosity > 0.58 || mood.calm > 0.7) {
        addRest();
        pushBeat("scene", "world", randomDuration(SCENE_CFG.worldDuration), rng());
      }
      addRest();
      pushBeat("sleep", null, CFG.sleepMin + rng() * (CFG.sleepMax - CFG.sleepMin), 0);

      let total = 0;
      for (let i = 0; i < beats.length; i += 1) total += beats[i].duration;
      const target = CFG.episodeMin + rng() * (CFG.episodeMax - CFG.episodeMin);
      if (total < target) {
        const delta = target - total;
        const end = beats.length - 1;
        beats[end].duration += delta;
      }
      let signature = "";
      for (let i = 0; i < beats.length; i += 1)
        signature += `${beats[i].scene || beats[i].kind}-${Math.round(beats[i].variant * 9)}|`;
      if (signature === lastEpisodeSignature) {
        const swapIndex = Math.min(5, Math.max(2, beats.length - 4));
        if (beats[swapIndex].kind === "scene") beats[swapIndex].variant += 0.17;
      }
      lastEpisodeSignature = signature;
    };

    const beginScene = (id: SceneId, duration: number): void => {
      currentScene = sceneById(id);
      currentSceneDuration = duration;
      sceneCtx.sceneDuration = duration;
      sceneCtx.sceneTime = 0;
      sceneCtx.handoff = previousHandoff;
      currentScene.enter(sceneCtx, previousHandoff);
    };

    const beginNextBeat = (): void => {
      beatIndex += 1;
      beatElapsed = 0;
      if (beatIndex >= beats.length) {
        episode += 1;
        seed = (seed ^ ((episode * 0x9e3779b9) >>> 0)) >>> 0;
        sceneCtx.seed = seed;
        buildEpisode();
        beatIndex = 0;
      }
      const beat = beats[beatIndex];
      if (beat.kind === "scene" || beat.kind === "idea") {
        if (beat.scene !== null) beginScene(beat.scene, beat.duration);
      } else {
        currentScene = null;
        currentSceneDuration = 0;
      }
    };

    buildEpisode();
    if (dev.scene) {
      beats = [{ kind: "scene", scene: dev.scene, duration: 9999, variant: 0.5 }];
      beatIndex = -1;
    } else {
      beatIndex = -1;
    }
    beginNextBeat();
    if (dev.scene === null) {
      // Honor the requested two-second opening rest regardless of generated sleep length.
      beats[0].duration = CFG.initialRest;
      beatElapsed = 0;
    }

    /* ========================================================
       SUBSTRATE / BUFFERS
       ======================================================== */

    const stops = new Array(palette.length) as Array<[number, number, number]>;
    for (let i = 0; i < palette.length; i += 1) {
      const hex = palette[i];
      stops[i] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    const lut = new Uint8ClampedArray(512 * 3);
    const fillLUT = (): void => {
      const n = stops.length;
      for (let k = 0; k < 512; k += 1) {
        const s = (k / 512) * n;
        const i0 = Math.floor(s);
        let f = s - i0;
        f = f * f * (3 - 2 * f);
        const a = stops[i0 % n];
        const b = stops[(i0 + 1) % n];
        for (let c = 0; c < 3; c += 1) {
          lut[k * 3 + c] = Math.sqrt(a[c] * a[c] * (1 - f) + b[c] * b[c] * f);
        }
      }
    };
    fillLUT();

    const resize = (): void => {
      if (window.innerWidth <= 768) cell = 16;
      else if (window.innerWidth <= 900) cell = 18;
      else cell = 20;

      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.ceil(rect.width));
      height = Math.max(1, Math.ceil(rect.height));
      cols = Math.ceil(width / cell) + 2;
      rows = Math.ceil(height / cell) + 2;
      dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      pixelCanvas.width = cols;
      pixelCanvas.height = rows;
      pixelCtx.imageSmoothingEnabled = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      unit = Math.max(1, Math.min(cols, rows * CFG.unitScale));

      const size = cols * rows;
      base = new Float32Array(size);
      sceneLum = new Float32Array(size);
      sceneHue = new Float32Array(size);
      sceneAlpha = new Float32Array(size);
      trail = new Float32Array(size);
      finalLum = new Float32Array(size);
      finalHue = new Float32Array(size);
      previousLum = new Float32Array(size);
      baseBlur = new Float32Array(size);
      bloomTemp = new Float32Array(size);
      finalIndex = new Uint8Array(size);
      imageData = new ImageData(cols, rows);
      snapshotSize = size;
      snapshots = new Uint8Array(CFG.snapshotCount * snapshotSize);
      snapshotHead = 0;
      snapshotCount = 0;
      snapshotClock = 0;
      sceneCtx.cols = cols;
      sceneCtx.rows = rows;
      sceneCtx.unit = unit;
      sceneCtx.base = base;
      sceneCtx.sceneLum = sceneLum;
      sceneCtx.sceneHue = sceneHue;
      sceneCtx.sceneAlpha = sceneAlpha;
      sceneCtx.trail = trail;
      sceneCtx.finalLum = finalLum;
      sceneCtx.finalHue = finalHue;
      document.documentElement.style.setProperty("--cell", `${cell}px`);
      recomputeSafeRects();
    };

    const recomputeSafeRects = (): void => {
      safeRects.length = 0;
      const nodes = document.querySelectorAll<HTMLElement>("[data-led-safe]");
      for (let i = 0; i < nodes.length && i < CFG.maxSafeRects; i += 1) {
        const rect = nodes[i].getBoundingClientRect();
        safeRects.push({
          x: rect.left / Math.max(1, width),
          y: rect.top / Math.max(1, height),
          w: rect.width / Math.max(1, width),
          h: rect.height / Math.max(1, height),
        });
      }
    };

    let lastSafeRectUpdate = -Infinity;
    const maybeRefreshSafeRects = (now: number): void => {
      if (now - lastSafeRectUpdate < 1000 / CFG.safeScrollHz) return;
      lastSafeRectUpdate = now;
      recomputeSafeRects();
    };

    const insideSafeZone = (x: number, y: number): boolean => {
      const ex = (x - 0.5) / CFG.safeEllipseRx;
      const ey = (y - 0.5) / CFG.safeEllipseRy;
      if (ex * ex + ey * ey <= 1) return true;
      for (let i = 0; i < safeRects.length; i += 1) {
        const r = safeRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
      }
      return false;
    };

    const applySubstrate = (t: number, allowSkip: boolean): void => {
      const motion = reducedMotionQuery.matches ? 0.18 : 1;
      const wtW = t * CFG.speed * motion;
      const wtC = t * CFG.speed * motion;
      let sum = 0;
      if (allowSkip) return;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const i = row * cols + col;
          let brightness = fbm(
            col * CFG.waveScale + wtW * CFG.waveDriftX,
            row * CFG.waveScale + wtW * CFG.waveDriftY,
            wtW * CFG.waveEvolve + 47.1,
          );
          brightness = (brightness - CFG.threshold) / (1 - CFG.threshold);
          brightness = brightness < 0 ? 0 : Math.pow(brightness, CFG.gamma);
          brightness = CFG.floor + (1 - CFG.floor) * clamp01(brightness);
          base[i] = brightness;
          sum += brightness;

          let colorField = fbm(
            col * CFG.colorScale + wtC * CFG.colorDrift,
            row * CFG.colorScale + wtC * CFG.colorDriftY,
            wtC * CFG.colorEvolve,
          );
          colorField += wtC * CFG.hueCycle;
          colorField -= Math.floor(colorField);
          colorField += Math.sin(wtC * 0.18 + col * 0.017 + row * 0.009 + hueSpin) * 0.025;
          colorField -= Math.floor(colorField);
          finalHue[i] = colorField;
        }
      }
      baselineMean = sum / Math.max(1, cols * rows);
    };

    const blurBase3x3 = (source: Float32Array, target: Float32Array): void => {
      for (let row = 0; row < rows; row += 1) {
        const r0 = Math.max(0, row - 1);
        const r1 = Math.min(rows - 1, row + 1);
        for (let col = 0; col < cols; col += 1) {
          const c0 = Math.max(0, col - 1);
          const c1 = Math.min(cols - 1, col + 1);
          const idx = row * cols + col;
          let s = 0;
          let n = 0;
          for (let rr = r0; rr <= r1; rr += 1) {
            for (let cc = c0; cc <= c1; cc += 1) {
              s += source[rr * cols + cc];
              n += 1;
            }
          }
          target[idx] = s / n;
        }
      }
    };

    const renderScenesIntoFinal = (): void => {
      const sceneActive = currentScene !== null;
      const rackFocus = sceneActive && (currentScene?.id === "world" || currentScene?.id === "human");
      if (quality.skipSubstrate && currentScene !== null) {
        for (let i = 0; i < base.length; i += 1) base[i] = baselineMean;
      }
      if (rackFocus) blurBase3x3(base, baseBlur);

      for (let i = 0; i < base.length; i += 1) {
        const b = rackFocus ? baseBlur[i] : base[i];
        let lum = b;
        let hue = finalHue[i];
        if (sceneActive) {
          const a = sceneAlpha[i] * governor;
          const sceneMix = a * 0.52;
          lum = b + (sceneLum[i] - b) * sceneMix;
          hue = lerpHueCircular(hue, sceneHue[i], a);
        }
        finalLum[i] = clamp01(lum);
        finalHue[i] = hue;
      }
    };

    const applyPost = (t: number): void => {
      const sceneActive = currentScene !== null;
      const reduced = reducedMotionQuery.matches;
      const breath = reduced
        ? 1 + Math.sin(((t * 0.18) / CFG.breathPeriod) * Math.PI * 2) * CFG.breathAmount
        : sceneActive
          ? 1 + Math.sin((t / CFG.breathPeriod) * Math.PI * 2) * CFG.breathAmount
          : 1;
      const beat = !reduced && sceneActive ? heartbeat(t) : 0;
      const eyeId = currentScene?.id === "eye";
      const worldHuman = currentScene?.id === "world" || currentScene?.id === "human";
      const vignetteGain = sceneActive ? 1 : 1;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const idx = row * cols + col;
          let lum = finalLum[idx] * breath * vignetteGain;
          const x = (col + 0.5) / cols;
          const y = (row + 0.5) / rows;
          const dx = Math.abs(x - 0.5) * 2;
          const dy = Math.abs(y - 0.5) * 2;
          const edge = clamp01(Math.max(dx, dy));
          if (sceneActive) lum *= 1 - CFG.vignetteEdge * edge * edge;

          if (!eyeId && beat > 0) {
            const d = cellDistance(x, y, 0.5, 0.5);
            const ring = Math.exp(-Math.abs(d - (5 + beat * 13)) / 1.8) * beat;
            lum += ring * CFG.heartbeatAmount * (worldHuman ? 0.65 : 1);
          }

          if (trail && quality.trail && !reduced) {
            const dec = Math.exp((-Math.log(2) * sceneCtx.dt) / CFG.trailHalfLife);
            trail[idx] *= dec;
            if (lum > trail[idx]) trail[idx] = lum;
            lum += trail[idx] * 0.038;
          }
          finalLum[idx] = clamp01(lum);
        }
      }

      if (quality.bloom && !reduced && currentScene !== null) {
        for (let i = 0; i < base.length; i += 1) bloomTemp[i] = finalLum[i] > CFG.bloomThreshold ? finalLum[i] : 0;
        blurBase3x3(bloomTemp, baseBlur);
        for (let i = 0; i < finalLum.length; i += 1)
          finalLum[i] = clamp01(finalLum[i] + baseBlur[i] * CFG.bloomAmount * 0.1);
      }
    };

    const heartbeat = (t: number): number => {
      const local = (t * 0.68) % 1;
      if (local < 0.1) return easeOut(local / 0.1);
      if (local < 0.18) return 1 - easeIn((local - 0.1) / 0.08);
      if (local < 0.3) return easeOut((local - 0.18) / 0.12) * 0.72;
      if (local < 0.38) return 0.72 * (1 - easeIn((local - 0.3) / 0.08));
      return 0;
    };

    const enforceGoldBudget = (): void => {
      let count = 0;
      const total = Math.max(1, finalLum.length);
      for (let i = 0; i < finalHue.length; i += 1) {
        const d = Math.abs(shortestHue(AMBER_HUE, finalHue[i]));
        const isSceneGold = sceneAlpha[i] > 0.08 && Math.abs(shortestHue(GOLD_HUE, sceneHue[i])) < 0.065;
        if (isSceneGold && finalLum[i] > 0.12) count += 1;
        if (d < 0.07 && !isSceneGold && finalLum[i] > 0.78) finalLum[i] *= 0.86;
      }
      goldArea = count / total;
      if (goldArea > CFG.maxGoldArea) {
        const ratio = CFG.maxGoldArea / goldArea;
        for (let i = 0; i < finalHue.length; i += 1) {
          if (sceneAlpha[i] > 0.08 && Math.abs(shortestHue(GOLD_HUE, sceneHue[i])) < 0.065) finalLum[i] *= ratio;
        }
        goldArea = CFG.maxGoldArea;
      }
    };

    const applySafeZone = (): void => {
      for (let row = 0; row < rows; row += 1) {
        const y = (row + 0.5) / rows;
        for (let col = 0; col < cols; col += 1) {
          const x = (col + 0.5) / cols;
          if (!insideSafeZone(x, y)) continue;
          const idx = row * cols + col;
          finalLum[idx] *= CFG.safeDamper;
          if (Math.abs(shortestHue(GOLD_HUE, finalHue[idx])) < 0.08) {
            finalLum[idx] *= 0.85;
            finalHue[idx] = EMBER_HUE;
          }
        }
      }
    };

    const applyLuminanceGovernor = (): void => {
      const total = Math.max(1, finalLum.length);
      const priorMean = previousFrameMean;
      const governorTolerance = CFG.baselineTolerance * 0.9;
      const lower = baselineMean * (1 - governorTolerance);
      const upper = baselineMean * (1 + governorTolerance);
      let mean = 0;
      let flashes = 0;
      let flashMass = 0;

      for (let i = 0; i < finalLum.length; i += 1) {
        mean += finalLum[i];
        const delta = finalLum[i] - previousLum[i];
        if (delta > 0.24) flashes += 1;
        if (delta > 0.18) flashMass += delta;
      }
      mean /= total;

      // Luminance slew target: bounded by the previous frame, but never outside the baseline envelope.
      const maxMeanStep = Math.max(0.012, baselineMean * 0.095);
      const slewTarget = clamp(mean, priorMean - maxMeanStep, priorMean + maxMeanStep);
      const target = clamp(slewTarget, lower, upper);
      if (mean > 0.001 && Math.abs(target - mean) > 0.0005) {
        const gain = target / mean;
        for (let i = 0; i < finalLum.length; i += 1) finalLum[i] = clamp01(finalLum[i] * gain);
        mean = target;
      }

      let flashAreaNow = flashes / total;
      if (flashAreaNow > CFG.maxFlashArea || flashMass / total > 0.06) {
        const flashBlend = clamp((CFG.maxFlashArea / Math.max(CFG.maxFlashArea, flashAreaNow)) * 0.16, 0.025, 0.16);
        for (let i = 0; i < finalLum.length; i += 1) {
          const delta = finalLum[i] - previousLum[i];
          if (delta > 0) finalLum[i] = previousLum[i] + delta * flashBlend;
        }
      }

      mean = 0;
      flashes = 0;
      for (let i = 0; i < finalLum.length; i += 1) {
        mean += finalLum[i];
        if (finalLum[i] - previousLum[i] > 0.24) flashes += 1;
      }
      mean /= total;
      flashAreaNow = flashes / total;

      // Recover the frame envelope using a uniform brightness offset. This preserves hue and avoids a large
      // multiplicative jump that could turn a calm scene into a flash.
      if (mean < lower || mean > upper) {
        const offset = clamp(clamp(mean, lower, upper) - mean, -0.12, 0.12);
        for (let i = 0; i < finalLum.length; i += 1) finalLum[i] = clamp01(finalLum[i] + offset);
        mean += offset;
      }

      // If too much of the frame would flash, freeze those cells to their previous luminance first.
      flashes = 0;
      for (let i = 0; i < finalLum.length; i += 1) {
        if (finalLum[i] - previousLum[i] > 0.24) flashes += 1;
      }
      flashAreaNow = flashes / total;
      if (flashAreaNow > CFG.maxFlashArea) {
        for (let i = 0; i < finalLum.length; i += 1) {
          if (finalLum[i] - previousLum[i] > 0.24) finalLum[i] = previousLum[i];
        }
      }

      // Recompute after clipping and nudge up to three times; this keeps the frame inside the envelope.
      for (let pass = 0; pass < 3; pass += 1) {
        mean = 0;
        for (let i = 0; i < finalLum.length; i += 1) mean += finalLum[i];
        mean /= total;
        if (mean >= lower && mean <= upper) break;
        const offset = mean < lower ? lower - mean : mean - upper;
        const signedOffset = mean < lower ? offset : -offset;
        for (let i = 0; i < finalLum.length; i += 1) finalLum[i] = clamp01(finalLum[i] + signedOffset);
      }

      mean = 0;
      for (let i = 0; i < finalLum.length; i += 1) mean += finalLum[i];
      mean /= total;
      if (mean < lower || mean > upper) {
        let capacity = 0;
        if (mean < lower) {
          for (let i = 0; i < finalLum.length; i += 1) capacity += 1 - finalLum[i];
        } else {
          for (let i = 0; i < finalLum.length; i += 1) capacity += finalLum[i];
        }
        const needed = Math.abs((mean < lower ? lower : upper) - mean) * total;
        const amount = Math.min(needed, capacity);
        if (capacity > 0.000001 && amount > 0.000001) {
          const ratio = amount / capacity;
          if (mean < lower) {
            for (let i = 0; i < finalLum.length; i += 1) finalLum[i] += (1 - finalLum[i]) * ratio;
          } else {
            for (let i = 0; i < finalLum.length; i += 1) finalLum[i] -= finalLum[i] * ratio;
          }
        }
      }

      mean = 0;
      for (let i = 0; i < finalLum.length; i += 1) mean += finalLum[i];
      mean /= total;

      flashes = 0;
      for (let i = 0; i < finalLum.length; i += 1) {
        if (finalLum[i] - previousLum[i] > 0.24) flashes += 1;
      }
      flashArea = flashes / total;
      const now = performance.now();
      if (flashArea > CFG.maxFlashArea) {
        if (now - lastFlashAt > CFG.flashGuardMs) {
          flashTimes[flashCount % flashTimes.length] = now;
          flashCount += 1;
          lastFlashAt = now;
        }
        governor = Math.max(0.45, governor * 0.64);
      } else {
        governor += (1 - governor) * 0.035;
      }
      let recent = 0;
      for (let i = 0; i < flashTimes.length; i += 1) {
        if (now - flashTimes[i] <= CFG.flashWindowMs) recent += 1;
      }
      if (recent >= 3) governor = Math.min(governor, 0.62);
      previousFrameMean = mean;
      frameMean = mean;
      governorMeanSlew = Math.abs(mean - priorMean);
      for (let i = 0; i < finalLum.length; i += 1) previousLum[i] = finalLum[i];
    };

    const compositeToCanvas = (cameraX: number, cameraY: number): void => {
      const data = imageData.data;
      for (let i = 0; i < finalLum.length; i += 1) {
        const b = Math.min(63, Math.max(0, (finalLum[i] * 64) | 0));
        const h = Math.min(511, Math.max(0, (finalHue[i] * 512) | 0));
        finalIndex[i] = b;
        const lutBase = h * 3;
        const m = (b + 0.5) / 64;
        const o = i * 4;
        data[o] = lut[lutBase] * m;
        data[o + 1] = lut[lutBase + 1] * m;
        data[o + 2] = lut[lutBase + 2] * m;
        data[o + 3] = 255;
      }
      pixelCtx.putImageData(imageData, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      const zoomT =
        currentScene && !reducedMotionQuery.matches
          ? easeInOut(sceneCtx.sceneTime / Math.max(1, sceneCtx.sceneDuration))
          : 0;
      const zoom = 1 + 0.06 * zoomT;
      const dw = cols * cell * zoom;
      const dh = rows * cell * zoom;
      const dx = cameraX - cell - (dw - cols * cell) * 0.5;
      const dy = cameraY - cell - (dh - rows * cell) * 0.5;
      ctx.drawImage(pixelCanvas, dx, dy, dw, dh);
    };

    const captureSnapshot = (): void => {
      const baseIndex = snapshotHead * snapshotSize;
      for (let i = 0; i < finalIndex.length; i += 1) snapshots[baseIndex + i] = finalIndex[i];
      snapshotHead = (snapshotHead + 1) % CFG.snapshotCount;
      if (snapshotCount < CFG.snapshotCount) snapshotCount += 1;
    };

    const updateMood = (dt: number): void => {
      const idle = performance.now() - lastInputAt > 12000 ? 1 : 0;
      for (let i = 0; i < 4; i += 1) {
        const phase = moodPhase[i] + filmT * ((Math.PI * 2) / MOOD_PERIODS[i]);
        const noiseDrift =
          0.5 + 0.5 * noise3(Math.sin(phase) * 0.9 + i * 3.17, i * 0.7, seed * 0.000001 + filmT * 0.005);
        const target = noiseDrift;
        const key = MOOD_FIELDS[i];
        const response = dt / (i === 3 ? 9 : 7);
        mood[key] += (target - mood[key]) * response;
      }
      mood.attention = clamp01(mood.attention + clamp01(pointerSpeed / 2.5) * 0.12 * dt);
      mood.arousal = clamp01(mood.arousal + clamp01(scrollVelocity / 2.5) * 0.1 * dt);
      mood.calm = clamp01(mood.calm + idle * dt * 0.004 - mood.arousal * dt * 0.002);
      if (reducedMotionQuery.matches) mood.calm = clamp01(mood.calm + dt * 0.004);
    };

    const updateAttentionHeat = (dt: number): void => {
      for (let i = 0; i < attentionHeat.length; i += 1) attentionHeat[i] *= Math.pow(CFG.heatDecay, dt * 15);
      if (!pointerActive) return;
      const hx = clamp((pointerX * 16) | 0, 0, 15);
      const hy = clamp((pointerY * 9) | 0, 0, 8);
      const idx = hy * 16 + hx;
      attentionHeat[idx] = clamp01(attentionHeat[idx] + dt * CFG.heatInputGain);
      visitorNear = cellDistance(pointerX, pointerY, 0.5, 0.5) < Math.min(cols, rows) * 0.22;
    };

    let cameraX = 0;
    let cameraY = 0;
    const updateCamera = (): void => {
      if (reducedMotionQuery.matches || !currentScene) {
        cameraX = 0;
        cameraY = 0;
        return;
      }
      const scenePhase = sceneCtx.sceneTime / Math.max(1, sceneCtx.sceneDuration);
      const push = 1 - 1 / (1 + 0.06 * easeInOut(scenePhase));
      cameraX = Math.sin(sceneCtx.sceneTime * 0.09 + seed * 0.00001) * 1.5 * push;
      cameraY = Math.sin(sceneCtx.sceneTime * 0.07 + seed * 0.000013) * 1.2 * push;
    };

    const applyTransitionAlpha = (): void => {
      if (!currentScene) return;
      const t = sceneCtx.sceneTime;
      const dur = sceneCtx.sceneDuration;
      const enter = easeOut(clamp01(t / 1.2));
      const exit = 1 - easeIn(clamp01((t - Math.max(0, dur - 1.9)) / 1.9));
      const alphaScale = Math.min(enter, exit);
      const kind = currentScene.transition;
      if (alphaScale >= 0.999 && kind === "crossfade") return;

      let focalX = sceneCtx.handoff.x;
      let focalY = sceneCtx.handoff.y;
      if (currentScene.id === "eye") {
        focalX = 0.5;
        focalY = 0.48;
      } else if (currentScene.id === "world") {
        focalX = 0.5;
        focalY = 0.44;
      }

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const idx = row * cols + col;
          if (alphaScale <= 0) {
            sceneAlpha[idx] = 0;
            continue;
          }
          let local = alphaScale;
          const x = (col + 0.5) / cols;
          const y = (row + 0.5) / rows;
          if (kind === "iris") {
            const d = cellDistance(x, y, focalX, focalY);
            const radius = Math.max(1, d);
            local *= clamp01((sceneCtx.sceneTime * 10 - radius) / 8);
          } else if (kind === "scan") {
            const edge = easeInOut(clamp01(t / 1.4));
            const scanX = kind === "scan" ? edge : 1;
            local *= x < scanX ? 1 : 0.12;
          }
          sceneAlpha[idx] *= local;
        }
      }
    };

    const directorUpdate = (dt: number): void => {
      if (currentScene) {
        sceneCtx.sceneTime += dt * dev.speed;
        currentScene.update(dt * dev.speed, filmT, sceneCtx);
        currentScene.render(sceneCtx);
        applyTransitionAlpha();
      }
      beatElapsed += dt * dev.speed;
      const beat = beats[beatIndex];
      if (beat && beatElapsed >= beat.duration) {
        if (currentScene) previousHandoff = currentScene.exit();
        previousSceneId = currentScene?.id ?? previousSceneId;
        currentScene = null;
        sceneCtx.sceneTime = 0;
        beginNextBeat();
      }
    };

    /* ========================================================
       EVENTS / LIFECYCLE
       ======================================================== */

    const startLoop = (): void => {
      if (destroyed || document.hidden || isMinimal) return;
      if (raf !== 0) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const stopLoop = (): void => {
      running = false;
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const handleResize = (): void => {
      resize();
      maybeRefreshSafeRects(performance.now());
    };

    let scrollRaf = 0;
    const handleScroll = (): void => {
      const now = performance.now();
      const dy = window.scrollY - lastScrollY;
      const elapsed = Math.max(16, now - lastScrollAt);
      scrollVelocity = clamp((dy / elapsed) * 16, -5, 5);
      lastScrollY = window.scrollY;
      lastScrollAt = now;
      maybeRefreshSafeRects(now);
      if (scrollRaf === 0)
        scrollRaf = window.setTimeout(() => {
          scrollRaf = 0;
          maybeRefreshSafeRects(performance.now());
        }, 250) as unknown as number;
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const nx = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
      const ny = clamp01((event.clientY - rect.top) / Math.max(1, rect.height));
      const now = performance.now();
      const elapsed = Math.max(8, now - lastPointerAt);
      const speed = Math.hypot(nx - lastPointerX, ny - lastPointerY) / (elapsed / 1000);
      pointerSpeed = pointerSpeed * 0.78 + speed * 0.22;
      if (speed > 1.35) {
        fastSweepPending = true;
        if (!noticedThisVisit && human && currentScene?.id === "human") {
          noticedThisVisit = true;
        }
      }
      pointerX = nx;
      pointerY = ny;
      lastPointerX = nx;
      lastPointerY = ny;
      lastPointerAt = now;
      pointerActive = true;
      lastInputAt = now;
      visitorNear = cellDistance(nx, ny, 0.5, 0.5) < Math.min(cols, rows) * 0.22;
    };

    const handlePointerLeave = (): void => {
      pointerActive = false;
      pointerSpeed *= 0.5;
    };

    const handlePointerDown = (event: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      clickX = clamp01((event.clientX - rect.left) / Math.max(1, rect.width));
      clickY = clamp01((event.clientY - rect.top) / Math.max(1, rect.height));
      clickPulse = 1;
      clickInterruptRemaining = CFG.clickSparkMax;
      lastInputAt = performance.now();
      noticeThought = true;
      if (currentScene?.id === "world") {
        worldVariantNoise += 0.03;
        writeBlob(clickX, clickY, 0.7, 0.75, AMBER_HUE, 0.75);
      }
    };

    const handleVisibility = (): void => {
      if (document.hidden) {
        hiddenAt = performance.now();
        tabLeftPending = true;
        stopLoop();
        return;
      }
      if (hiddenAt >= 0 && performance.now() - hiddenAt > 800) {
        returnThought = true;
        tabBackPending = true;
        noticeThought = true;
        mood.attention = 0.1;
      }
      hiddenAt = -1;
      startLoop();
    };

    const handleThemeMutation = (): void => {
      const nextMinimal = document.documentElement.dataset.theme === "minimal";
      if (nextMinimal === isMinimal) return;
      isMinimal = nextMinimal;
      if (isMinimal) {
        stopLoop();
      } else {
        resize();
        startLoop();
      }
    };

    const handleReducedMotion = (): void => {
      if (reducedMotionQuery.matches) {
        currentScene = null;
        quality = { fpsCap: 30, skipSubstrate: false, trail: false, bloom: false };
      } else {
        quality = {
          fpsCap: window.innerWidth <= 768 ? CFG.mobileFps : CFG.desktopFps,
          skipSubstrate: false,
          trail: true,
          bloom: true,
        };
      }
      stopLoop();
      if (!isMinimal && !document.hidden) startLoop();
    };

    const observer = new MutationObserver(handleThemeMutation);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const tick = (now: number): void => {
      raf = 0;
      if (!running || destroyed || document.hidden || isMinimal) return;

      const frameStart = performance.now();
      const frameGap = 1000 / Math.max(1, quality.fpsCap);
      if (now - lastRenderAt < frameGap - 0.25) {
        raf = requestAnimationFrame(tick);
        return;
      }
      let dt = (now - last) / 1000;
      if (!Number.isFinite(dt)) dt = 0;
      dt = clamp(dt, 0, CFG.maxFrameDt);
      last = now;
      lastRenderAt = now;
      realT += dt;
      filmT += dt;
      hueSpin += dt * 0.04;
      pointerSpeed *= Math.exp(-dt * 2.8);
      scrollVelocity *= Math.exp(-dt * 3.0);
      clickPulse = Math.max(0, clickPulse - dt * 1.8);
      clickInterruptRemaining = Math.max(0, clickInterruptRemaining - dt);
      interruptEyeRemaining = Math.max(0, interruptEyeRemaining - dt);

      updateMood(dt);
      updateAttentionHeat(dt);

      if (fastSweepPending && currentScene === null && interruptEyeRemaining <= 0) {
        fastSweepPending = false;
        interruptEyeRemaining = CFG.interruptEyeMax;
        previousHandoff = { x: pointerX, y: pointerY, r: 0.1, energy: 0.9, hue: AMBER_HUE };
        beatElapsed = 0;
        beginScene("eye", CFG.interruptEyeMax);
      } else if (interruptEyeRemaining <= 0 && currentScene?.id === "eye" && beatIndex >= 0) {
        // The director keeps the eye as a short attention overlay; once its timer ends the normal beat resumes.
      }

      sceneCtx.dt = dt;
      sceneCtx.time = filmT;
      sceneCtx.pointerX = pointerX;
      sceneCtx.pointerY = pointerY;
      sceneCtx.pointerActive = pointerActive;
      sceneCtx.pointerSpeed = pointerSpeed;
      sceneCtx.pointerNear = visitorNear;
      sceneCtx.clickX = clickX;
      sceneCtx.clickY = clickY;
      sceneCtx.clickPulse = clickPulse;
      sceneCtx.tod = timeOfDay;

      const dueToDprOrResize = qualitySample === 0 || qualitySample % 8 === 0;
      applySubstrate(filmT, quality.skipSubstrate && !dueToDprOrResize && currentScene !== null);
      clearScene();
      if (!reducedMotionQuery.matches) directorUpdate(dt);

      if (clickPulse > 0 && currentScene === null && clickInterruptRemaining > 0) {
        writeBlob(clickX, clickY, 1.1 + clickPulse * 1.7, 0.86 * clickPulse, AMBER_HUE, 0.74 * clickPulse);
      } else if (clickPulse > 0 && currentScene !== null && currentScene.id === "world") {
        writeBlob(clickX, clickY, 0.9 + clickPulse * 1.4, 0.82 * clickPulse, AMBER_HUE, 0.56 * clickPulse);
        writeBlob(clickX - 0.01, clickY - 0.018, 0.55, 0.62 * clickPulse, AMBER_HUE, 0.42 * clickPulse);
        writeBlob(clickX + 0.01, clickY - 0.018, 0.55, 0.62 * clickPulse, AMBER_HUE, 0.42 * clickPulse);
      } else if (clickPulse > 0 && currentScene !== null && currentScene.id !== "spark") {
        writeBlob(clickX, clickY, 0.9 + clickPulse * 1.4, 0.82 * clickPulse, AMBER_HUE, 0.56 * clickPulse);
      }

      snapshotClock += dt;
      if (snapshotClock >= 1 / CFG.snapshotHz) {
        snapshotClock -= 1 / CFG.snapshotHz;
        renderScenesIntoFinal();
        applyPost(filmT);
        enforceGoldBudget();
        applySafeZone();
        applyLuminanceGovernor();
        updateCamera();
        compositeToCanvas(cameraX, cameraY);
        captureSnapshot();
      } else {
        renderScenesIntoFinal();
        applyPost(filmT);
        enforceGoldBudget();
        applySafeZone();
        applyLuminanceGovernor();
        updateCamera();
        compositeToCanvas(cameraX, cameraY);
      }

      const frameMs = performance.now() - frameStart;
      qualityTime += frameMs;
      qualitySample += 1;
      if (qualitySample >= CFG.adaptiveWindow) {
        const avg = qualityTime / qualitySample;
        if (avg > CFG.adaptiveBudgetMs) slowFrames += 1;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames >= 1) {
          quality = { fpsCap: CFG.lowQualityFps, skipSubstrate: true, trail: false, bloom: false };
        }
        if (avg < 12 && slowFrames === 0) {
          quality = {
            fpsCap: window.innerWidth <= 768 ? CFG.mobileFps : CFG.desktopFps,
            skipSubstrate: false,
            trail: true,
            bloom: true,
          };
        }
        qualitySample = 0;
        qualityTime = 0;
      }

      if (dev.debug) drawDebugHud();

      raf = requestAnimationFrame(tick);
    };

    const drawDebugHud = (): void => {
      const fps = sceneCtx.dt > 0 ? Math.min(999, 1 / sceneCtx.dt) : 0;
      const beatName = beats[beatIndex]?.scene ?? beats[beatIndex]?.kind ?? "rest";
      const text = `LED MIND  ${fps.toFixed(0)}fps  ${currentScene?.id ?? "sleep"}  beat:${beatName}  ep:${episode}\nA ${mood.arousal.toFixed(2)}  C ${mood.curiosity.toFixed(2)}  T ${mood.attention.toFixed(2)}  S ${mood.calm.toFixed(2)}\nL ${frameMean.toFixed(4)} / ${baselineMean.toFixed(4)}  gold ${(goldArea * 100).toFixed(1)}%  flash ${(flashArea * 100).toFixed(1)}%`;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "10px monospace";
      ctx.textBaseline = "top";
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = "black";
      ctx.fillText(text.replace(/\n/g, " "), 10, 10);
      ctx.restore();
    };

    /* Initial state and listeners. */
    resize();
    if (!isMinimal) {
      applySubstrate(0, false);
      clearScene();
      renderScenesIntoFinal();
      applyPost(0);
      enforceGoldBudget();
      applySafeZone();
      compositeToCanvas(0, 0);
      for (let i = 0; i < finalLum.length; i += 1) previousLum[i] = finalLum[i];
    }

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotionQuery.addEventListener("change", handleReducedMotion);

    if (!isMinimal && !document.hidden) startLoop();

    return () => {
      destroyed = true;
      running = false;
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
      if (scrollRaf !== 0) window.clearTimeout(scrollRaf);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotionQuery.removeEventListener("change", handleReducedMotion);
    };
  }, []);

  return (
    <div aria-hidden="true" className="site-background orange-bg">
      <canvas ref={canvasRef} className="led-wallpaper-canvas" />
    </div>
  );
};

export default AnimatedLedBackground;

/* ============================================================
   10 MOST USEFUL KNOBS
   1. CFG.episodeMin / episodeMax — overall film length.
   2. CFG.safeEllipseRx / safeEllipseRy — white-text breathing room.
   3. CFG.safeDamper — contrast reduction under content.
   4. SCENE_CFG.worldDuration — centerpiece linger.
   5. SCENE_CFG.neuralDuration — thought density.
   6. SCENE_CFG.eyeDuration — curiosity / gaze linger.
   7. SCENE_CFG.humanDuration — life-on-screen linger.
   8. CFG.trailHalfLife — memory smear persistence.
   9. CFG.bloomAmount — cinematic glow restraint.
   10. CFG.maxGoldArea — insight peak budget.
   ============================================================ */
