import { useEffect, useRef } from "react";

/* ============================================================
   LED MIND — procedural short film
   The substrate below is intentionally the original substrate:
   same CFG, palette, 512 LUT, hash, FBM and 64-level quantizer.
   ============================================================ */

const CFG = {
  speed: 1, // Original substrate temporal speed.
  waveScale: 0.1, // Original luminance field scale.
  waveDriftX: 0.06, // Original luminance X drift.
  waveDriftY: 0.025, // Original luminance Y drift.
  waveEvolve: 0.09, // Original luminance temporal evolution.
  colorScale: 0.05, // Original color field scale.
  colorDrift: 0.04, // Original color X drift.
  colorDriftY: 0.018, // Original color Y drift.
  colorEvolve: 0.05, // Original color temporal evolution.
  hueCycle: 0.012, // Original hue motion.
  threshold: 0.02, // Original brightness threshold.
  gamma: 0.95, // Original brightness gamma.
  floor: 0.55, // Original substrate floor.

  maxDpr: 1.5, // Required DPR cap.
  unitScale: 1.6, // Normalized scene unit uses min(cols, rows * 1.6).
  sceneSoftCells: 1.0, // SDF edge softness in cells.
  mobileFps: 30, // Starting cap for narrow layouts.
  desktopFps: 60, // Starting cap for desktop.
  adaptiveWindow: 60, // Performance sampling window.
  adaptiveBudgetMs: 20, // Slow-frame threshold.
  lowQualityFps: 30, // Reduced quality frame cap.
  trailHalfLife: 0.35, // Afterimage half-life.
  bloomAmount: 0.25, // Bright-cell bloom contribution.
  bloomThreshold: 0.78, // Bloom source threshold.
  vignetteEdge: 0.15, // Edge luminance reduction.
  breathPeriod: 10, // Global breathing period.
  breathAmount: 0.06, // Global breathing amplitude.
  heartbeatAmount: 0.04, // Center heartbeat amplitude.
  safeDamper: 0.65, // Central safe-zone contrast factor.
  safeEllipseRx: 0.34, // Central safe-zone horizontal radius.
  safeEllipseRy: 0.25, // Central safe-zone vertical radius.
  safeScrollHz: 4, // Safe-rect recompute limit.
  heatDecay: 0.984, // Visitor heatmap decay.
  heatInputGain: 0.025, // Visitor heatmap input gain.
  flashThreshold: 0.24, // Luminance change considered a flash.
  maxFlashArea: 0.25, // Maximum flashing screen area.
  maxGoldArea: 0.078, // Gold cells remain below 8%.
  baselineTolerance: 0.1, // Baseline mean-luminance envelope.

  initialRest: 2, // First load substrate-only rest.
  restMin: 4, // Thought rest minimum.
  restMax: 10, // Thought rest maximum.
  sleepMin: 14, // End-of-episode sleep minimum.
  sleepMax: 20, // End-of-episode sleep maximum.
  noticeMax: 6, // Pointer-notice interrupt maximum.
  snapshotHz: 15, // Dream capture rate.
  snapshotCount: 30, // Dream ring capacity.
  thoughtHold: 2, // Thought text hold duration.
  maxNodes: 70, // Neural node pool.
  maxPulses: 60, // Neural active pulse pool.
  maxBuildings: 28, // World building pool.
  maxWorldFigures: 3, // World background figure pool.
  maxRain: 34, // World weather pool.
  maxSafeRects: 24, // DOM safe-zone pool.
};

const SCENE_CFG = {
  sparkDuration: [10, 14] as const, // Spark awakening duration.
  neuralDuration: [18, 28] as const, // Neural thought duration.
  eyeDuration: [16, 22] as const, // Eye attention duration.
  worldDuration: [28, 35] as const, // World centerpiece duration.
  humanDuration: [24, 30] as const, // Human doing duration.
  dreamDuration: [28, 36] as const, // Dream memory duration.
  ridgeCount: 3, // World ridge count.
  cityGround: 0.76, // World city ground height.
  worldRoadY: 0.84, // World road baseline.
  wandererHeight: 0.16, // World wanderer height.
  humanHeight: 0.42, // Human figure height.
  humanRim: 0.012, // Human rim width.
  eyeWidth: 0.68, // Eye almond width.
  eyeHeight: 0.38, // Eye almond height.
  eyeIris: 0.13, // Eye iris radius.
  eyePupil: 0.055, // Eye pupil radius.
  neuralPulseSpeed: 0.32, // Neural edge pulse normalized speed.
  worldCityGrow: 8, // Seconds used to imagine buildings.
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
] as const;

const CELL_PROPERTY = "--cell";
const LOCAL_KEY = "gd-led-mind-visit";
const TAU = Math.PI * 2;

type TimeOfDay = "dawn" | "day" | "dusk" | "night";
type Transition = "crossfade" | "radial" | "scan";
type SceneId = "spark" | "neural" | "eye" | "world" | "human" | "dream";

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

type SceneContext = {
  dt: number;
  time: number;
  sceneTime: number;
  sceneDuration: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  unit: number;
  pointerX: number;
  pointerY: number;
  pointerSpeed: number;
  pointerNear: boolean;
  pointerActive: boolean;
  mood: Mood;
  timeOfDay: TimeOfDay;
  seed: number;
  rng: () => number;
  handoff: Handoff;
};

type Scene = {
  id: SceneId;
  transition: Transition;
  duration: readonly [number, number];
  enter: (ctx: SceneContext, handoff: Handoff) => void;
  update: (dt: number, t: number, ctx: SceneContext) => void;
  render: (ctx: SceneContext) => void;
  exit: () => Handoff;
};

type Beat = {
  kind: "rest" | SceneId | "sleep";
  duration: number;
};

/* Semantic hues are derived from palette positions, never from RGB literals. */
const hueFromIndex = (index: number): number => index / palette.length;
const circularMean = (indices: readonly number[]): number => {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < indices.length; i += 1) {
    const a = hueFromIndex(indices[i]) * TAU;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  let h = Math.atan2(sy, sx) / TAU;
  if (h < 0) h += 1;
  return h;
};
const EMBER_HUE = circularMean([11, 0, 1, 2, 10]);
const AMBER_HUE = circularMean([3, 4, 5, 6]);
const GOLD_HUE = circularMean([7, 8, 9]);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number): number => clamp(v, 0, 1);
const smooth = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const easeInOut = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t: number): number => Math.pow(clamp01(t), 3);
const shortestHue = (a: number, b: number): number => {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
};
const lerpHue = (a: number, b: number, t: number): number => {
  let v = a + shortestHue(a, b) * clamp01(t);
  if (v < 0) v += 1;
  if (v >= 1) v -= 1;
  return v;
};
const wrap01 = (v: number): number => ((v % 1) + 1) % 1;

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

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
  const x00 = hash3(xi, yi, zi) * (1 - u) + hash3(xi + 1, yi, zi) * u;
  const x10 = hash3(xi, yi + 1, zi) * (1 - u) + hash3(xi + 1, yi + 1, zi) * u;
  const x01 = hash3(xi, yi, zi + 1) * (1 - u) + hash3(xi + 1, yi, zi + 1) * u;
  const x11 = hash3(xi, yi + 1, zi + 1) * (1 - u) + hash3(xi + 1, yi + 1, zi + 1) * u;
  const a = x00 * (1 - v) + x10 * v;
  const b = x01 * (1 - v) + x11 * v;
  return a * (1 - w) + b * w;
};

const fbm = (x: number, y: number, z: number): number =>
  0.62 * noise3(x, y, z) + 0.38 * noise3(x * 2.17 + 11.3, y * 2.17 + 7.9, z * 2.17 + 3.1);

const parseHex = (hex: string): readonly [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const stops = palette.map(parseHex);
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

const randomSeed = (): number => {
  const now = Date.now() >>> 0;
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : null;
  if (cryptoApi?.getRandomValues) {
    const bag = new Uint32Array(2);
    cryptoApi.getRandomValues(bag);
    return (now ^ bag[0] ^ bag[1]) >>> 0;
  }
  return (now ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0;
};

const queryNumber = (name: string, fallback: number): number => {
  try {
    const value = new URLSearchParams(window.location.search).get(name);
    if (value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const queryString = (name: string): string | null => {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
};

const isDevBuild = (): boolean => {
  try {
    const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
    if (typeof meta.env?.DEV === "boolean") return meta.env.DEV;
  } catch {
    /* Production bundles may not expose import.meta.env. */
  }
  const runtime = globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } };
  if (runtime.process?.env?.NODE_ENV) return runtime.process.env.NODE_ENV !== "production";
  return false;
};

const glyphs: Record<string, readonly string[]> = {
  a: ["01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10110", "11001", "10001", "11110"],
  c: ["01111", "10000", "10000", "10000", "01111"],
  d: ["00001", "01101", "10011", "10001", "01111"],
  e: ["01110", "10001", "11111", "10000", "01110"],
  f: ["00111", "00100", "01110", "00100", "00100"],
  g: ["01111", "10001", "01111", "00001", "11110"],
  h: ["10000", "10000", "11110", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "01110"],
  j: ["00010", "00000", "00010", "10010", "01100"],
  k: ["10000", "10010", "10100", "11010", "10001"],
  l: ["01100", "00100", "00100", "00100", "01110"],
  m: ["11011", "10101", "10101", "10001", "10001"],
  n: ["11110", "10001", "10001", "10001", "10001"],
  o: ["01110", "10001", "10001", "10001", "01110"],
  p: ["11110", "10001", "11110", "10000", "10000"],
  q: ["01110", "10001", "10001", "01111", "00001"],
  r: ["11110", "10001", "11110", "10100", "10010"],
  s: ["01111", "10000", "01110", "00001", "11110"],
  t: ["11111", "00100", "00100", "00100", "00011"],
  u: ["10001", "10001", "10001", "10011", "01101"],
  v: ["10001", "10001", "10001", "01010", "00100"],
  w: ["10001", "10001", "10101", "10101", "01010"],
  x: ["10001", "01010", "00100", "01010", "10001"],
  y: ["10001", "01010", "00100", "00100", "11000"],
  z: ["11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10011", "10101", "11001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00010", "00100", "11111"],
  "3": ["11110", "00001", "00110", "00001", "11110"],
  "4": ["00010", "00110", "01010", "11111", "00010"],
  "5": ["11111", "10000", "11110", "00001", "11110"],
  "6": ["01110", "10000", "11110", "10001", "01110"],
  "7": ["11111", "00010", "00100", "01000", "01000"],
  "8": ["01110", "10001", "01110", "10001", "01110"],
  "9": ["01110", "10001", "01111", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00100", "00100"],
  ",": ["00000", "00000", "00000", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00010", "00100", "00100"],
  "-": ["00000", "00000", "11111", "00000", "00000"],
  "'": ["00100", "00100", "00000", "00000", "00000"],
};

const AnimatedLedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dev = isDevBuild();
    const forcedScene = dev ? queryString("scene") : null;
    const forcedSeedValue = dev ? queryNumber("seed", NaN) : NaN;
    const forcedSpeed = dev ? queryNumber("speed", 1) : 1;
    const forcedTod = dev ? queryString("tod") : null;
    const debug = dev && queryString("debug") === "1";

    let raf = 0;
    let lastNow = performance.now();
    let logicalTime = 0;
    let running = true;
    let minimal = document.documentElement.dataset.theme === "minimal";
    let width = 1;
    let height = 1;
    let dpr = 1;
    let cell = 20;
    let cols = 2;
    let rows = 2;
    let unit = 2;
    let frameCap = 60;
    let lastRenderAt = 0;
    let hueSpin = 0;
    let averageFrameMs = 0;
    let qualityLow = false;
    let skipSubstrate = false;
    let trailEnabled = true;
    let bloomEnabled = true;
    let baselineMean = 0;
    let meanLuminance = 0;
    let goldPercent = 0;
    let flashPercent = 0;
    let flashesRecent = 0;
    let lastFlashSecond = -1;
    let frameIndex = 0;
    let snapshotAccumulator = 0;
    let snapshotHead = 0;
    let snapshotValid = 0;
    let noticePending = false;
    let clickX = 0.5;
    let clickY = 0.5;
    let clickAge = 999;
    let returnThought = false;
    let welcomeThought = false;
    let visitCount = 1;
    let lastPointerTime = performance.now();
    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerVX = 0;
    let pointerVY = 0;
    let pointerSpeed = 0;
    let pointerActive = false;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();
    let scrollVelocity = 0;
    let safeRectsDirty = true;
    let safeRectTimer: number | null = null;
    let hiddenBefore = false;
    let firstLoad = true;

    const seed = Number.isFinite(forcedSeedValue) ? forcedSeedValue >>> 0 : randomSeed();
    const masterRng = mulberry32(seed);

    const mood: Mood = {
      arousal: 0.3 + masterRng() * 0.2,
      curiosity: 0.52 + masterRng() * 0.2,
      attention: 0.24,
      calm: 0.72,
    };
    const moodPhase = new Float32Array(4);
    const moodTarget = new Float32Array(4);
    const moodPeriod = new Float32Array([
      43 + masterRng() * 34,
      35 + masterRng() * 42,
      29 + masterRng() * 34,
      51 + masterRng() * 35,
    ]);
    for (let i = 0; i < 4; i += 1) moodPhase[i] = masterRng() * TAU;

    let base = new Float32Array(1);
    let baseHue = new Float32Array(1);
    let sceneLum = new Float32Array(1);
    let sceneHue = new Float32Array(1);
    let sceneAlpha = new Float32Array(1);
    let trail = new Float32Array(1);
    let finalLum = new Float32Array(1);
    let finalHue = new Float32Array(1);
    let previousLum = new Float32Array(1);
    let blur = new Float32Array(1);
    let bloom = new Float32Array(1);
    const heat = new Float32Array(16 * 9);
    const safeRects = new Float32Array(CFG.maxSafeRects * 4);
    let snapshotStore = new Uint8Array(30);
    let image = new ImageData(1, 1);
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { alpha: false });

    const resize = (): void => {
      if (window.innerWidth <= 768) cell = 16;
      else if (window.innerWidth <= 900) cell = 18;
      else cell = 20;
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.ceil(rect.width));
      height = Math.max(1, Math.ceil(rect.height));
      cols = Math.ceil(width / cell) + 2;
      rows = Math.ceil(height / cell) + 2;
      unit = Math.max(1, Math.min(cols, rows * CFG.unitScale));
      dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
      frameCap = width <= 768 ? CFG.mobileFps : CFG.desktopFps;
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      document.documentElement.style.setProperty(CELL_PROPERTY, `${cell}px`);
      const size = cols * rows;
      if (base.length !== size) base = new Float32Array(size);
      if (baseHue.length !== size) baseHue = new Float32Array(size);
      if (sceneLum.length !== size) sceneLum = new Float32Array(size);
      if (sceneHue.length !== size) sceneHue = new Float32Array(size);
      if (sceneAlpha.length !== size) sceneAlpha = new Float32Array(size);
      if (trail.length !== size) trail = new Float32Array(size);
      if (finalLum.length !== size) finalLum = new Float32Array(size);
      if (finalHue.length !== size) finalHue = new Float32Array(size);
      if (previousLum.length !== size) previousLum = new Float32Array(size);
      if (blur.length !== size) blur = new Float32Array(size);
      if (bloom.length !== size) bloom = new Float32Array(size);
      snapshotStore = new Uint8Array(CFG.snapshotCount * cols * rows);
      offscreen.width = cols;
      offscreen.height = rows;
      if (offCtx) image = new ImageData(cols, rows);
      safeRectsDirty = true;
    };

    const clearScene = (): void => {
      sceneLum.fill(0);
      sceneAlpha.fill(0);
      sceneHue.fill(EMBER_HUE);
    };

    const addCell = (x: number, y: number, radiusCells: number, lum: number, hue: number, alpha: number): void => {
      const minCol = Math.max(0, Math.floor(x * cols - radiusCells - 1));
      const maxCol = Math.min(cols - 1, Math.ceil(x * cols + radiusCells + 1));
      const minRow = Math.max(0, Math.floor(y * rows - radiusCells - 1));
      const maxRow = Math.min(rows - 1, Math.ceil(y * rows + radiusCells + 1));
      const rr = Math.max(0.5, radiusCells / Math.max(cols, rows));
      for (let row = minRow; row <= maxRow; row += 1) {
        const py = (row + 0.5) / rows;
        for (let col = minCol; col <= maxCol; col += 1) {
          const px = (col + 0.5) / cols;
          const dx = (px - x) / rr;
          const dy = (py - y) / rr;
          const d = Math.sqrt(dx * dx + dy * dy);
          const a = smooth(clamp01(1 - d));
          if (a <= 0) continue;
          const idx = row * cols + col;
          sceneLum[idx] = Math.max(sceneLum[idx], lum * a);
          sceneAlpha[idx] = Math.max(sceneAlpha[idx], alpha * a);
          sceneHue[idx] = lerpHue(sceneHue[idx], hue, a);
        }
      }
    };

    const ellipseSdf = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): number => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      return Math.sqrt(dx * dx + dy * dy) - 1;
    };

    const capsuleSdf = (
      x: number,
      y: number,
      ax: number,
      ay: number,
      bx: number,
      by: number,
      radius: number,
    ): number => {
      const pax = x - ax;
      const pay = y - ay;
      const bax = bx - ax;
      const bay = by - ay;
      const h = clamp01((pax * bax + pay * bay) / Math.max(0.000001, bax * bax + bay * bay));
      const dx = pax - bax * h;
      const dy = pay - bay * h;
      return Math.sqrt(dx * dx + dy * dy) - radius;
    };

    const paintSdf = (sdf: number, softness: number, lum: number, hue: number, alpha: number, idx: number): void => {
      const a = smooth(clamp01(1 - sdf / Math.max(0.001, softness)));
      if (a <= 0) return;
      sceneLum[idx] = Math.max(sceneLum[idx], lum * a);
      sceneAlpha[idx] = Math.max(sceneAlpha[idx], alpha * a);
      sceneHue[idx] = lerpHue(sceneHue[idx], hue, a);
    };

    const drawEllipse = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      lum: number,
      hue: number,
      alpha: number,
    ): void => {
      const minCol = Math.max(0, Math.floor((cx - rx) * cols - 1));
      const maxCol = Math.min(cols - 1, Math.ceil((cx + rx) * cols + 1));
      const minRow = Math.max(0, Math.floor((cy - ry) * rows - 1));
      const maxRow = Math.min(rows - 1, Math.ceil((cy + ry) * rows + 1));
      const softness = CFG.sceneSoftCells / Math.max(cols, rows);
      for (let row = minRow; row <= maxRow; row += 1) {
        const py = (row + 0.5) / rows;
        for (let col = minCol; col <= maxCol; col += 1) {
          const px = (col + 0.5) / cols;
          const idx = row * cols + col;
          paintSdf(ellipseSdf(px, py, cx, cy, rx, ry), softness, lum, hue, alpha, idx);
        }
      }
    };

    const drawCapsule = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      radius: number,
      lum: number,
      hue: number,
      alpha: number,
    ): void => {
      const minCol = Math.max(0, Math.floor(Math.min(ax, bx) * cols - radius * cols - 2));
      const maxCol = Math.min(cols - 1, Math.ceil(Math.max(ax, bx) * cols + radius * cols + 2));
      const minRow = Math.max(0, Math.floor(Math.min(ay, by) * rows - radius * rows - 2));
      const maxRow = Math.min(rows - 1, Math.ceil(Math.max(ay, by) * rows + radius * rows + 2));
      const softness = CFG.sceneSoftCells / Math.max(cols, rows);
      for (let row = minRow; row <= maxRow; row += 1) {
        const py = (row + 0.5) / rows;
        for (let col = minCol; col <= maxCol; col += 1) {
          const px = (col + 0.5) / cols;
          const idx = row * cols + col;
          paintSdf(capsuleSdf(px, py, ax, ay, bx, by, radius), softness, lum, hue, alpha, idx);
        }
      }
    };

    const drawLine = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      lum: number,
      hue: number,
      alpha: number,
      thickness = 0.012,
    ): void => {
      drawCapsule(x0, y0, x1, y1, thickness, lum, hue, alpha);
    };

    const buildSubstrate = (t: number): void => {
      if (skipSubstrate && frameIndex % 2 !== 0) return;
      const motion = reducedMotionQuery.matches ? 0.18 : 1;
      const wtW = t * CFG.speed * motion;
      const wtC = t * CFG.speed * motion;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const idx = row * cols + col;
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
          colorField = wrap01(colorField);
          colorField += Math.sin(wtC * 0.18 + col * 0.017 + row * 0.009 + hueSpin) * 0.025;
          colorField = wrap01(colorField);
          base[idx] = brightness;
          baseHue[idx] = colorField;
        }
      }
    };

    const updateMood = (dt: number): void => {
      for (let i = 0; i < 4; i += 1) {
        const wave = 0.5 + 0.5 * Math.sin((logicalTime / moodPeriod[i]) * TAU + moodPhase[i]);
        moodTarget[i] = clamp01(0.22 + wave * 0.58);
      }
      mood.arousal += (moodTarget[0] - mood.arousal) * clamp01(dt / 12);
      mood.curiosity += (moodTarget[1] - mood.curiosity) * clamp01(dt / 16);
      mood.attention += (moodTarget[2] - mood.attention) * clamp01(dt / 8);
      mood.calm += (moodTarget[3] - mood.calm) * clamp01(dt / 14);
      mood.attention = clamp01(mood.attention + pointerSpeed * 0.012);
      mood.arousal = clamp01(mood.arousal + Math.min(1, Math.abs(scrollVelocity) * 0.00045));
      if (performance.now() - lastPointerTime > 12000) mood.calm = clamp01(mood.calm + dt * 0.015);
      if (scrollVelocity !== 0) scrollVelocity *= Math.exp(-dt * 4);
    };

    const updateHeat = (dt: number): void => {
      const decay = Math.pow(CFG.heatDecay, Math.max(0.25, dt * 30));
      for (let i = 0; i < heat.length; i += 1) heat[i] *= decay;
      if (!pointerActive) return;
      const hx = clamp(Math.floor(pointerX * 16), 0, 15);
      const hy = clamp(Math.floor(pointerY * 9), 0, 8);
      heat[hy * 16 + hx] = clamp01(heat[hy * 16 + hx] + pointerSpeed * CFG.heatInputGain + 0.001);
    };

    let hotspotX = 0.5;
    let hotspotY = 0.5;

    const attentionHotspot = (): void => {
      let best = 0;
      let bx = 8;
      let by = 4;
      for (let y = 0; y < 9; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          const v = heat[y * 16 + x];
          if (v > best) {
            best = v;
            bx = x;
            by = y;
          }
        }
      }
      hotspotX = (bx + 0.5) / 16;
      hotspotY = (by + 0.5) / 9;
    };

    const deriveTimeOfDay = (): TimeOfDay => {
      if (forcedTod === "dawn" || forcedTod === "day" || forcedTod === "dusk" || forcedTod === "night")
        return forcedTod;
      const h = new Date().getHours();
      if (h >= 5 && h < 8) return "dawn";
      if (h >= 8 && h < 17) return "day";
      if (h >= 17 && h < 20) return "dusk";
      return "night";
    };

    const readVisitMemory = (): void => {
      try {
        const raw = window.localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { count?: number; last?: number };
          if (typeof parsed.count === "number") visitCount = Math.max(1, parsed.count + 1);
          if (typeof parsed.last === "number" && Date.now() - parsed.last > 15000) returnThought = true;
        }
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify({ count: visitCount, last: Date.now() }));
      } catch {
        visitCount = 1;
      }
      welcomeThought = visitCount > 1;
    };

    readVisitMemory();

    const pointerSpeedPx = (dx: number, dy: number, dtMs: number): number => {
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist / Math.max(1, dtMs);
    };

    const onPointerMove = (event: PointerEvent): void => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      const nx = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const ny = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      const dtMs = now - lastPointerTime;
      const dx = nx - pointerX;
      const dy = ny - pointerY;
      const speed = pointerSpeedPx(dx, dy, dtMs);
      pointerVX += (dx - pointerVX) * 0.28;
      pointerVY += (dy - pointerVY) * 0.28;
      pointerSpeed += (speed - pointerSpeed) * 0.28;
      pointerX = nx;
      pointerY = ny;
      pointerActive = true;
      lastPointerTime = now;
      if (speed > 1.2 && Math.abs(dx) + Math.abs(dy) > 0.1) noticePending = true;
    };

    const onPointerLeave = (): void => {
      pointerActive = false;
    };

    const onClick = (event: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect();
      clickX = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      clickY = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      clickAge = 0;
      if (currentSceneId === "world") {
        worldTinyTreeAge = 0;
        worldTinyTreeX = clickX;
        worldTinyTreeY = clamp(clickY, 0.5, 0.82);
      }
    };

    const onScroll = (): void => {
      const now = performance.now();
      const dy = window.scrollY - lastScrollY;
      const dtMs = Math.max(1, now - lastScrollTime);
      scrollVelocity = dy / dtMs;
      lastScrollY = window.scrollY;
      lastScrollTime = now;
      safeRectsDirty = true;
      if (safeRectTimer === null) {
        safeRectTimer = window.setTimeout(() => {
          safeRectTimer = null;
          recomputeSafeRects();
        }, 250);
      }
    };

    const recomputeSafeRects = (): void => {
      safeRects.fill(-1);
      const elements = document.querySelectorAll<HTMLElement>("[data-led-safe]");
      let count = 0;
      for (let i = 0; i < elements.length && count < CFG.maxSafeRects; i += 1) {
        const r = elements[i].getBoundingClientRect();
        const x = clamp(r.left / Math.max(1, width), 0, 1);
        const y = clamp(r.top / Math.max(1, height), 0, 1);
        const w = clamp(r.width / Math.max(1, width), 0, 1);
        const h = clamp(r.height / Math.max(1, height), 0, 1);
        const o = count * 4;
        safeRects[o] = x;
        safeRects[o + 1] = y;
        safeRects[o + 2] = x + w;
        safeRects[o + 3] = y + h;
        count += 1;
      }
      safeRectsDirty = false;
    };

    const insideSafe = (x: number, y: number): boolean => {
      const dx = (x - 0.5) / CFG.safeEllipseRx;
      const dy = (y - 0.5) / CFG.safeEllipseRy;
      if (dx * dx + dy * dy <= 1) return true;
      for (let i = 0; i < safeRects.length; i += 4) {
        if (safeRects[i] < 0) break;
        if (x >= safeRects[i] && x <= safeRects[i + 2] && y >= safeRects[i + 1] && y <= safeRects[i + 3]) return true;
      }
      return false;
    };

    const heartbeat = (t: number): number => {
      const phase = (t * 0.72) % 1;
      if (phase < 0.09) return easeOut(phase / 0.09);
      if (phase < 0.17) return 1 - easeIn((phase - 0.09) / 0.08);
      if (phase < 0.29) return 0.72 * easeOut((phase - 0.17) / 0.12);
      if (phase < 0.37) return 0.72 * (1 - easeIn((phase - 0.29) / 0.08));
      return 0;
    };

    let preparedThoughtFirst = "";
    let preparedThoughtSecond = "";
    let preparedThoughtLength = 0;

    const prepareThought = (text: string): void => {
      const normalized = text.toLowerCase();
      const charsPerLine = Math.max(4, Math.floor((cols * 0.7) / 6));
      if (normalized.length <= charsPerLine) {
        preparedThoughtFirst = normalized;
        preparedThoughtSecond = "";
      } else {
        const cut = normalized.lastIndexOf(" ", charsPerLine);
        preparedThoughtFirst = cut > 0 ? normalized.slice(0, cut) : "";
        preparedThoughtSecond = cut > 0 ? normalized.slice(cut + 1) : "";
      }
      preparedThoughtLength = preparedThoughtFirst.length + preparedThoughtSecond.length;
    };

    const drawGlyphLine = (line: string, y: number, shown: number, lum: number, scale: number): void => {
      const totalW = Math.max(1, line.length * 6 - 1);
      const x0 = 0.5 - (totalW * scale) / (2 * cols);
      for (let c = 0; c < shown; c += 1) {
        const glyph = glyphs[line[c]];
        if (!glyph) continue;
        for (let gy = 0; gy < 5; gy += 1) {
          for (let gx = 0; gx < 5; gx += 1) {
            if (glyph[gy][gx] !== "1") continue;
            addCell(x0 + ((c * 6 + gx) * scale) / cols, y + (gy * scale) / rows, 0.48, lum, EMBER_HUE, 0.56);
          }
        }
      }
    };

    const writeThought = (progress: number, lum: number): void => {
      if (preparedThoughtLength === 0) return;
      const scale = cols < 30 ? 1 : 1.1;
      if (preparedThoughtLength > Math.floor((cols * 0.72) / Math.max(1, scale))) return;
      const shown = Math.min(preparedThoughtLength, Math.floor(progress));
      const firstShown = Math.min(preparedThoughtFirst.length, shown);
      const secondShown = Math.max(0, Math.min(preparedThoughtSecond.length, shown - preparedThoughtFirst.length));
      drawGlyphLine(preparedThoughtFirst, preparedThoughtSecond.length > 0 ? 0.4 : 0.46, firstShown, lum, scale);
      if (preparedThoughtSecond) drawGlyphLine(preparedThoughtSecond, 0.52, secondShown, lum, scale);
    };

    let currentSceneId: SceneId | null = null;
    let sceneTime = 0;
    let sceneDuration = 0;
    let sceneHandoff: Handoff = { x: 0.5, y: 0.5, r: 0.03, energy: 0.5, hue: EMBER_HUE };
    let beatIndex = 0;
    let episodeNumber = 1;
    let episodeElapsed = 0;
    let resting = true;
    let restRemaining = CFG.initialRest;
    let thoughtText = "";
    let thoughtAge = 99;
    let worldTinyTreeAge = 99;
    let worldTinyTreeX = 0.5;
    let worldTinyTreeY = 0.7;
    let worldWorldSeed = masterRng() * 10000;
    let worldSunX = 0.26;
    let worldSunY = 0.28;
    let worldVariant: TimeOfDay = deriveTimeOfDay();
    let worldWandererX = 0.25;
    let worldWandererDir = 1;
    let eyeBlink = 0;
    let eyeSaccadeX = 0.5;
    let eyeSaccadeY = 0.5;
    let eyeTargetX = 0.5;
    let eyeTargetY = 0.5;
    let neuralPulse = 0;
    let humanState = 0;
    let humanPhase = 0;
    let humanNoticed = false;
    let thinking = false;

    const neuralX = new Float32Array(CFG.maxNodes);
    const neuralY = new Float32Array(CFG.maxNodes);
    const neuralAlive = new Uint8Array(CFG.maxNodes);
    const neuralLinkA = new Int16Array(CFG.maxNodes * 3);
    const neuralLinkB = new Int16Array(CFG.maxNodes * 3);
    const neuralLinkCount = new Uint8Array(CFG.maxNodes);
    const pulseFrom = new Uint8Array(CFG.maxPulses);
    const pulseTo = new Uint8Array(CFG.maxPulses);
    const pulseAge = new Float32Array(CFG.maxPulses);
    const pulseLife = new Float32Array(CFG.maxPulses);
    const worldBuildings = new Float32Array(SCENE_CFG.worldDuration[1] * 7);
    const humanJoints = new Float32Array(26);
    const dreamOffsets = new Float32Array(4);

    const nearestNeighbors = (nodeCount: number): void => {
      neuralLinkCount.fill(0);
      neuralLinkA.fill(-1);
      neuralLinkB.fill(-1);
      for (let i = 0; i < nodeCount; i += 1) {
        let bestA = -1;
        let bestB = -1;
        let distA = 99;
        let distB = 99;
        for (let j = 0; j < nodeCount; j += 1) {
          if (i === j) continue;
          const dx = neuralX[i] - neuralX[j];
          const dy = neuralY[i] - neuralY[j];
          const d = dx * dx + dy * dy;
          if (d < distA) {
            distB = distA;
            bestB = bestA;
            distA = d;
            bestA = j;
          } else if (d < distB) {
            distB = d;
            bestB = j;
          }
        }
        if (bestA >= 0) {
          neuralLinkA[i * 3] = i;
          neuralLinkB[i * 3] = bestA;
          neuralLinkCount[i] = 1;
        }
        if (bestB >= 0) {
          neuralLinkA[i * 3 + 1] = i;
          neuralLinkB[i * 3 + 1] = bestB;
          neuralLinkCount[i] = 2;
        }
      }
    };

    const initNeural = (): void => {
      const r = mulberry32((seed ^ (episodeNumber * 0x9e3779b9)) >>> 0);
      const count = clamp(Math.round(40 + ((cols * rows) / 5000) * 25), 40, CFG.maxNodes);
      neuralAlive.fill(0);
      for (let i = 0; i < count; i += 1) {
        neuralAlive[i] = 1;
        neuralX[i] = 0.14 + r() * 0.72;
        neuralY[i] = 0.16 + r() * 0.68;
      }
      nearestNeighbors(count);
      neuralPulse = 0;
      for (let i = 0; i < CFG.maxPulses; i += 1) pulseLife[i] = 0;
    };

    const firePulse = (from: number, to: number): void => {
      for (let i = 0; i < CFG.maxPulses; i += 1) {
        if (pulseLife[i] > 0) continue;
        pulseFrom[i] = from;
        pulseTo[i] = to;
        pulseAge[i] = 0;
        pulseLife[i] = 0.7;
        return;
      }
    };

    const initWorld = (ctx: SceneContext, variant: TimeOfDay): void => {
      const r = mulberry32((seed ^ (episodeNumber * 1337)) >>> 0);
      worldWorldSeed = r() * 10000;
      worldVariant = variant;
      worldSunX = variant === "night" ? 0.72 : 0.22;
      worldSunY = variant === "night" ? 0.25 : variant === "dusk" ? 0.36 : 0.28;
      worldWandererX = 0.18 + r() * 0.2;
      worldWandererDir = 1;
      for (let i = 0; i < worldBuildings.length; i += 7) {
        worldBuildings[i] = 0;
        worldBuildings[i + 1] = 0;
        worldBuildings[i + 2] = 0;
        worldBuildings[i + 3] = 0;
        worldBuildings[i + 4] = 0;
        worldBuildings[i + 5] = 0;
        worldBuildings[i + 6] = 0;
      }
      const count = clamp(11 + Math.round(mood.curiosity * 12), 11, 26);
      for (let i = 0; i < count; i += 1) {
        const o = i * 7;
        worldBuildings[o] = 0.07 + i * (0.83 / count);
        worldBuildings[o + 1] = 0.05 + r() * 0.11;
        worldBuildings[o + 2] = 0.08 + r() * 0.18;
        worldBuildings[o + 3] = r();
        worldBuildings[o + 4] = 0.2 + r() * 0.55;
        worldBuildings[o + 5] = Math.floor(2 + r() * 6);
        worldBuildings[o + 6] = r() > 0.55 ? 1 : -1;
      }
      worldTinyTreeAge = 99;
    };

    const renderNeural = (ctx: SceneContext, dense: boolean): void => {
      const wave = easeOut(clamp01(ctx.sceneTime / Math.max(0.01, ctx.sceneDuration)));
      for (let i = 0; i < neuralX.length; i += 1) {
        if (!neuralAlive[i]) continue;
        const wobble = Math.sin(ctx.time * 0.8 + i * 1.71) * 0.004;
        const x = neuralX[i] + wobble;
        const y = neuralY[i] + Math.cos(ctx.time * 0.65 + i * 1.37) * 0.004;
        for (let k = 0; k < neuralLinkCount[i]; k += 1) {
          const o = i * 3 + k;
          const to = neuralLinkB[o];
          if (to < 0 || !neuralAlive[to]) continue;
          drawLine(x, y, neuralX[to], neuralY[to], 0.14, AMBER_HUE, 0.22, 0.006);
        }
        addCell(x, y, 0.9, dense ? 0.7 : 0.56, AMBER_HUE, 0.6);
      }
      for (let i = 0; i < CFG.maxPulses; i += 1) {
        if (pulseLife[i] <= 0) continue;
        const from = pulseFrom[i];
        const to = pulseTo[i];
        const p = easeInOut(clamp01(pulseAge[i] / pulseLife[i]));
        const px = neuralX[from] + (neuralX[to] - neuralX[from]) * p;
        const py = neuralY[from] + (neuralY[to] - neuralY[from]) * p;
        addCell(px, py, 1.1, 0.96, AMBER_HUE, 0.82);
      }
      if (dense && ctx.sceneTime > ctx.sceneDuration * 0.7) {
        const cx = 0.5;
        const cy = 0.48;
        const r = 0.08 + easeOut(clamp01((ctx.sceneTime - ctx.sceneDuration * 0.7) / 2.2)) * 0.22;
        const ringWidth = 0.016;
        for (let row = 0; row < rows; row += 1) {
          const y = (row + 0.5) / rows;
          for (let col = 0; col < cols; col += 1) {
            const x = (col + 0.5) / cols;
            const d = Math.abs(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r);
            const a = smooth(clamp01(1 - d / ringWidth));
            if (a <= 0) continue;
            const idx = row * cols + col;
            sceneLum[idx] = Math.max(sceneLum[idx], 0.98 * a);
            sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.9 * a);
            sceneHue[idx] = GOLD_HUE;
          }
        }
      }
      void wave;
    };

    const spark: Scene = {
      id: "spark",
      transition: "radial",
      duration: SCENE_CFG.sparkDuration,
      enter: (_ctx, handoff) => {
        sceneHandoff = handoff;
        clickAge = 999;
      },
      update: (dt) => {
        clickAge += dt;
      },
      render: (ctx) => {
        clearScene();
        const cx = sceneHandoff.x;
        const cy = sceneHandoff.y;
        const progress = clamp01(ctx.sceneTime / Math.max(0.01, ctx.sceneDuration));
        const pulse = Math.sin(progress * Math.PI * 0.7);
        addCell(cx, cy, 1.0 + pulse * 1.7, 0.98, EMBER_HUE, 0.92);
        for (let ring = 0; ring < 3; ring += 1) {
          const radius = (ctx.sceneTime * (0.045 + ring * 0.012)) % 0.55;
          const fade = Math.exp(-ctx.sceneTime * (0.17 + ring * 0.07));
          for (let row = 0; row < rows; row += 1) {
            const y = (row + 0.5) / rows;
            for (let col = 0; col < cols; col += 1) {
              const x = (col + 0.5) / cols;
              const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
              const ringD = Math.abs(d - radius);
              if (ringD > 0.018) continue;
              const a = fade * smooth(clamp01(1 - ringD / 0.018));
              const idx = row * cols + col;
              sceneLum[idx] = Math.max(sceneLum[idx], 0.72 * a);
              sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.55 * a);
              sceneHue[idx] = EMBER_HUE;
            }
          }
        }
        if (ctx.sceneTime > 1.1 && ctx.sceneTime < ctx.sceneDuration * 0.65) {
          const count = 3 + Math.floor(ctx.sceneTime * 0.8);
          for (let i = 0; i < count; i += 1) {
            const a = hash3(i, episodeNumber, seed) * TAU + ctx.sceneTime * (0.18 + i * 0.01);
            const r = 0.07 + ((i * 17) % 9) * 0.012;
            addCell(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.65, 0.48, EMBER_HUE, 0.48);
          }
        }
      },
      exit: () => ({ x: sceneHandoff.x, y: sceneHandoff.y, r: 0.025, energy: 0.72, hue: EMBER_HUE }),
    };

    const neural: Scene = {
      id: "neural",
      transition: "crossfade",
      duration: SCENE_CFG.neuralDuration,
      enter: (_ctx, handoff) => {
        sceneHandoff = handoff;
        initNeural();
      },
      update: (dt, _t, ctx) => {
        neuralPulse += dt;
        for (let i = 0; i < CFG.maxPulses; i += 1) {
          if (pulseLife[i] <= 0) continue;
          pulseAge[i] += dt;
          if (pulseAge[i] >= pulseLife[i]) {
            const to = pulseTo[i];
            pulseLife[i] = 0;
            if (ctx.mood.curiosity > 0.35 && masterRng() < 0.18) {
              for (let k = 0; k < neuralLinkCount[to] && k < 2; k += 1) {
                const o = to * 3 + k;
                if (neuralLinkB[o] >= 0 && masterRng() < 0.65) firePulse(to, neuralLinkB[o]);
              }
            }
          }
        }
        if (neuralPulse > 0.55) {
          neuralPulse = 0;
          const node = Math.floor(masterRng() * CFG.maxNodes);
          if (neuralAlive[node]) {
            for (let k = 0; k < neuralLinkCount[node] && k < 2; k += 1) {
              const o = node * 3 + k;
              if (neuralLinkB[o] >= 0 && masterRng() < 0.8) firePulse(node, neuralLinkB[o]);
            }
          }
        }
      },
      render: (ctx) => {
        clearScene();
        renderNeural(ctx, false);
        if (ctx.sceneTime < 1.8) {
          addCell(sceneHandoff.x, sceneHandoff.y, 1.1, 0.88, EMBER_HUE, 0.9);
        }
      },
      exit: () => {
        let nearest = 0;
        let best = Infinity;
        for (let i = 0; i < CFG.maxNodes; i += 1) {
          if (!neuralAlive[i]) continue;
          const dx = neuralX[i] - 0.5;
          const dy = neuralY[i] - 0.5;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            nearest = i;
          }
        }
        return { x: neuralX[nearest], y: neuralY[nearest], r: 0.04, energy: 0.78, hue: AMBER_HUE };
      },
    };

    const eye: Scene = {
      id: "eye",
      transition: "radial",
      duration: SCENE_CFG.eyeDuration,
      enter: (_ctx, handoff) => {
        sceneHandoff = handoff;
        eyeBlink = 1.2;
        eyeSaccadeX = 0.5;
        eyeSaccadeY = 0.5;
        if (!pointerActive) attentionHotspot();
        eyeTargetX = pointerActive ? pointerX : hotspotX;
        eyeTargetY = pointerActive ? pointerY : hotspotY;
      },
      update: (dt, _t, ctx) => {
        eyeBlink = Math.max(0, eyeBlink - dt);
        if (eyeBlink <= 0 && Math.sin(ctx.sceneTime * 1.1) > 0.995) eyeBlink = 0.9;
        if (pointerActive) {
          eyeTargetX = pointerX;
          eyeTargetY = pointerY;
        } else if (Math.floor(ctx.sceneTime / 3) % 2 === 0) {
          attentionHotspot();
          eyeTargetX = hotspotX;
          eyeTargetY = hotspotY;
        } else {
          eyeTargetX = 0.5 + Math.sin(ctx.sceneTime * 0.33) * 0.12;
          eyeTargetY = 0.5 + Math.cos(ctx.sceneTime * 0.41) * 0.08;
        }
        eyeSaccadeX += (eyeTargetX - eyeSaccadeX) * clamp01(dt * 2.4);
        eyeSaccadeY += (eyeTargetY - eyeSaccadeY) * clamp01(dt * 2.4);
      },
      render: (ctx) => {
        clearScene();
        const open = easeOut(clamp01((1.2 - eyeBlink) / 1.2));
        const cx = 0.5;
        const cy = 0.5;
        const rx = SCENE_CFG.eyeWidth * 0.5;
        const ry = SCENE_CFG.eyeHeight * 0.5 * Math.max(0.03, open);
        drawEllipse(cx, cy, rx, ry, 0.14, EMBER_HUE, 0.7);
        drawEllipse(cx, cy, rx * 0.84, ry * 0.58, 0.24, AMBER_HUE, 0.58);
        const px = cx + clamp((eyeSaccadeX - 0.5) * 0.18, -0.09, 0.09);
        const py = cy + clamp((eyeSaccadeY - 0.5) * 0.12, -0.055, 0.055);
        drawEllipse(px, py, SCENE_CFG.eyeIris, SCENE_CFG.eyeIris, 0.72, AMBER_HUE, 0.82);
        drawEllipse(px, py, SCENE_CFG.eyePupil, SCENE_CFG.eyePupil, 0.12, EMBER_HUE, 0.94);
        addCell(pointerActive ? pointerX : px, pointerActive ? pointerY : py, 0.45, 0.92, AMBER_HUE, 0.82);
        const blinkMask = open < 0.25 ? 1 - open / 0.25 : 0;
        if (blinkMask > 0) {
          drawLine(0.22, 0.5, 0.78, 0.5, 0.22 * blinkMask, EMBER_HUE, 0.9 * blinkMask, 0.018);
        }
        if (ctx.sceneTime > ctx.sceneDuration - 2.5) {
          const wipe = easeInOut(clamp01((ctx.sceneTime - (ctx.sceneDuration - 2.5)) / 2.5));
          const wipeX = 0.5 + (wipe - 0.5) * 1.4;
          addCell(wipeX, 0.5, 2.0, 0.9, AMBER_HUE, 0.42);
        }
      },
      exit: () => ({ x: 0.5, y: 0.5, r: 0.18, energy: 0.86, hue: AMBER_HUE }),
    };

    const renderWorldRidge = (baseY: number, amp: number, phase: number, hue: number, alpha: number): void => {
      for (let col = 0; col < cols; col += 1) {
        const x = (col + 0.5) / cols;
        const y = baseY + Math.sin(x * 6.5 + phase) * amp + Math.sin(x * 16 + phase * 0.6) * amp * 0.35;
        drawCapsule(x, y, x + 1 / cols, 0.98, 0.009, 0.2, hue, alpha);
      }
    };

    const world: Scene = {
      id: "world",
      transition: "radial",
      duration: SCENE_CFG.worldDuration,
      enter: (ctx, handoff) => {
        sceneHandoff = handoff;
        worldVariant = deriveTimeOfDay();
        initWorld(ctx, worldVariant);
        if (handoff.r > 0.1) {
          worldSunX = handoff.x;
          worldSunY = handoff.y;
        }
      },
      update: (dt, _t, ctx) => {
        worldWandererX += worldWandererDir * dt * (0.01 + ctx.mood.arousal * 0.006);
        if (worldWandererX > 0.82) worldWandererDir = -1;
        if (worldWandererX < 0.18) worldWandererDir = 1;
        worldTinyTreeAge += dt;
      },
      render: (ctx) => {
        clearScene();
        const dusk = worldVariant === "dusk";
        const night = worldVariant === "night";
        const dawn = worldVariant === "dawn";
        const skyHue = night ? EMBER_HUE : lerpHue(AMBER_HUE, EMBER_HUE, dusk ? 0.45 : dawn ? 0.18 : 0.08);
        drawEllipse(
          worldSunX,
          worldSunY,
          night ? 0.046 : 0.055,
          night ? 0.046 : 0.055,
          night ? 0.54 : 0.74,
          night ? AMBER_HUE : GOLD_HUE,
          0.72,
        );
        renderWorldRidge(0.67, 0.055, worldWorldSeed * 0.01, skyHue, 0.32);
        renderWorldRidge(0.73, 0.045, worldWorldSeed * 0.013 + 2.1, EMBER_HUE, 0.42);
        renderWorldRidge(0.79, 0.03, worldWorldSeed * 0.017 + 3.2, EMBER_HUE, 0.5);

        const reveal = easeOut(clamp01(ctx.sceneTime / SCENE_CFG.worldCityGrow));
        const buildingCount = Math.min(28, Math.floor(worldBuildings.length / 7));
        for (let i = 0; i < buildingCount; i += 1) {
          const o = i * 7;
          const bx = worldBuildings[o];
          const bw = worldBuildings[o + 1];
          const bh = worldBuildings[o + 2] * reveal;
          const windows = Math.floor(worldBuildings[o + 5]);
          const x0 = bx;
          const x1 = bx + bw;
          const top = SCENE_CFG.cityGround - bh;
          drawLine(x0, SCENE_CFG.cityGround, x0, top, 0.26, AMBER_HUE, 0.46, 0.008);
          drawLine(x1, SCENE_CFG.cityGround, x1, top, 0.26, AMBER_HUE, 0.46, 0.008);
          drawLine(x0, top, x1, top, 0.26, AMBER_HUE, 0.4, 0.008);
          for (let w = 0; w < windows; w += 1) {
            const yy = top + 0.012 + (w / Math.max(1, windows)) * Math.max(0.012, bh - 0.03);
            const side = 0.5 + Math.sin(i * 12.7 + w * 3.1 + ctx.sceneTime * 0.18) * 0.4;
            addCell(
              x0 + bw * (0.28 + side * 0.42),
              yy,
              0.48,
              0.48 + 0.18 * Math.sin(w + i),
              night || dusk ? GOLD_HUE : AMBER_HUE,
              0.34,
            );
          }
        }

        drawLine(0.08, SCENE_CFG.worldRoadY, 0.92, SCENE_CFG.worldRoadY, 0.16, EMBER_HUE, 0.55, 0.014);
        drawLine(0.08, SCENE_CFG.worldRoadY + 0.018, 0.92, SCENE_CFG.worldRoadY + 0.018, 0.1, EMBER_HUE, 0.35, 0.008);
        const wy = SCENE_CFG.worldRoadY;
        const wh = SCENE_CFG.wandererHeight;
        addCell(worldWandererX, wy - wh * 0.82, 0.4, 0.55, AMBER_HUE, 0.66);
        drawCapsule(worldWandererX, wy - wh * 0.66, worldWandererX, wy - wh * 0.3, 0.008, 0.4, EMBER_HUE, 0.68);
        drawCapsule(
          worldWandererX,
          wy - wh * 0.3,
          worldWandererX + worldWandererDir * 0.018,
          wy,
          0.007,
          0.34,
          EMBER_HUE,
          0.62,
        );
        drawCapsule(
          worldWandererX,
          wy - wh * 0.3,
          worldWandererX - worldWandererDir * 0.018,
          wy,
          0.007,
          0.34,
          EMBER_HUE,
          0.62,
        );
        if (!night) addCell(worldWandererX + worldWandererDir * 0.02, wy - wh * 0.82, 0.38, 0.34, AMBER_HUE, 0.34);

        for (let i = 0; i < 2; i += 1) {
          const fx = wrap01(0.12 + i * 0.37 + ctx.sceneTime * (i === 0 ? 0.003 : -0.002));
          const fy = 0.72 + i * 0.04;
          addCell(fx, fy, 0.35, 0.26, AMBER_HUE, 0.26);
        }

        if (night) {
          for (let i = 0; i < 11; i += 1) {
            if (Math.sin(ctx.sceneTime * 0.45 + i * 1.7) < -0.75) continue;
            const sx = 0.08 + hash3(i + 13, 7, seed) * 0.84;
            const sy = 0.07 + hash3(i + 19, 3, seed) * 0.34;
            addCell(sx, sy, 0.28, 0.38, GOLD_HUE, 0.28);
          }
        } else if (dawn || dusk) {
          for (let i = 0; i < 14; i += 1) {
            const sx = wrap01(i * 0.083 + ctx.sceneTime * 0.004);
            const sy = 0.1 + hash3(i, 4, seed) * 0.45;
            addCell(sx, sy, 0.25, 0.22, AMBER_HUE, 0.22);
          }
        }

        if (worldTinyTreeAge < 2.5) {
          const grow = easeOut(clamp01(worldTinyTreeAge / 1.7));
          drawCapsule(
            worldTinyTreeX,
            worldTinyTreeY,
            worldTinyTreeX,
            worldTinyTreeY - 0.07 * grow,
            0.006,
            0.42,
            AMBER_HUE,
            0.46,
          );
          addCell(worldTinyTreeX, worldTinyTreeY - 0.08 * grow, 0.95 * grow, 0.54, AMBER_HUE, 0.46);
        }
      },
      exit: () => ({ x: worldWandererX, y: SCENE_CFG.worldRoadY - 0.07, r: 0.03, energy: 0.78, hue: AMBER_HUE }),
    };

    const setHumanJoints = (x: number, y: number, scale: number, state: number, phase: number): void => {
      const h = SCENE_CFG.humanHeight * scale;
      const bob = state === 0 ? Math.sin(phase * 2) * h * 0.018 : state === 1 ? Math.sin(phase * 1.7) * h * 0.032 : 0;
      const jump = state === 5 ? Math.max(0, Math.sin(phase)) * h * 0.1 : 0;
      const headX = x;
      const headY = y - h + bob - jump;
      humanJoints[0] = headX;
      humanJoints[1] = headY;
      humanJoints[2] = x;
      humanJoints[3] = headY + h * 0.16;
      humanJoints[4] = x;
      humanJoints[5] = headY + h * 0.48;
      const a = h * 0.2;
      const l = h * 0.34;
      const g = Math.sin(phase);
      humanJoints[6] = x - h * 0.1;
      humanJoints[7] = humanJoints[3] + a * 0.48;
      humanJoints[8] = x - h * 0.1 - a * (0.75 + 0.22 * g);
      humanJoints[9] = humanJoints[7] + a * 0.52;
      humanJoints[10] = x + h * 0.1;
      humanJoints[11] = humanJoints[3] + a * 0.48;
      humanJoints[12] = x + h * 0.1 + a * (0.75 - 0.22 * g);
      humanJoints[13] = humanJoints[11] + a * 0.52;
      humanJoints[14] = x - h * 0.07;
      humanJoints[15] = humanJoints[5];
      humanJoints[16] = x - h * 0.07 + l * 0.34 * g;
      humanJoints[17] = humanJoints[15] + l * 0.5;
      humanJoints[18] = x - h * 0.07 - l * 0.12 * g;
      humanJoints[19] = y;
      humanJoints[20] = x + h * 0.07;
      humanJoints[21] = humanJoints[5];
      humanJoints[22] = x + h * 0.07 - l * 0.34 * g;
      humanJoints[23] = humanJoints[21] + l * 0.5;
      humanJoints[24] = x + h * 0.07 + l * 0.12 * g;
      humanJoints[25] = y;
      if (state === 2) {
        humanJoints[8] = x + h * 0.08;
        humanJoints[9] = headY + h * 0.01;
        humanJoints[12] = x + h * 0.2;
        humanJoints[13] = headY - h * 0.05;
      }
      if (state === 3) {
        humanJoints[14] -= h * 0.08;
        humanJoints[16] -= h * 0.08;
        humanJoints[18] -= h * 0.02;
        humanJoints[20] += h * 0.08;
        humanJoints[22] += h * 0.08;
        humanJoints[24] += h * 0.02;
      }
    };

    const drawHumanBone = (a: number, b: number, radius: number, lum: number, strength: number): void => {
      drawCapsule(
        humanJoints[a],
        humanJoints[a + 1],
        humanJoints[b],
        humanJoints[b + 1],
        radius,
        lum,
        EMBER_HUE,
        0.72 * strength,
      );
      drawCapsule(
        humanJoints[a],
        humanJoints[a + 1],
        humanJoints[b],
        humanJoints[b + 1],
        radius + SCENE_CFG.humanRim,
        lum * 0.92,
        AMBER_HUE,
        0.24 * strength,
      );
    };

    const renderHumanFigure = (
      x: number,
      y: number,
      scale: number,
      state: number,
      phase: number,
      strength: number,
    ): void => {
      setHumanJoints(x, y, scale, state, phase);
      drawHumanBone(0, 2, 0.013, 0.34 * strength, strength);
      drawHumanBone(2, 4, 0.014, 0.4 * strength, strength);
      drawHumanBone(4, 6, 0.009, 0.32 * strength, strength);
      drawHumanBone(6, 8, 0.008, 0.36 * strength, strength);
      drawHumanBone(10, 12, 0.009, 0.32 * strength, strength);
      drawHumanBone(12, 14, 0.008, 0.36 * strength, strength);
      drawHumanBone(4, 14, 0.01, 0.32 * strength, strength);
      drawHumanBone(14, 16, 0.008, 0.34 * strength, strength);
      drawHumanBone(16, 18, 0.007, 0.3 * strength, strength);
      drawHumanBone(20, 22, 0.008, 0.34 * strength, strength);
      drawHumanBone(22, 24, 0.007, 0.3 * strength, strength);
      addCell(humanJoints[0], humanJoints[1], 1.5 * strength, 0.38 * strength, EMBER_HUE, 0.7 * strength);
      addCell(humanJoints[0], humanJoints[1], 0.62 * strength, 0.72 * strength, AMBER_HUE, 0.42 * strength);
      if (state === 3) {
        for (let i = 0; i < 3; i += 1)
          addCell(x + 0.022 + i * 0.01, y - SCENE_CFG.humanHeight * 0.31, 0.42, 0.92, GOLD_HUE, 0.42);
      }
    };

    const human: Scene = {
      id: "human",
      transition: "crossfade",
      duration: SCENE_CFG.humanDuration,
      enter: (_ctx, handoff) => {
        sceneHandoff = handoff;
        const r = masterRng();
        humanState = mood.arousal > 0.72 ? (r > 0.5 ? 1 : 0) : mood.calm > 0.72 ? (r > 0.5 ? 3 : 0) : r > 0.84 ? 4 : 0;
        humanPhase = r * TAU;
        humanNoticed = false;
        thinking = false;
      },
      update: (dt, _t, ctx) => {
        humanPhase += dt * (humanState === 1 ? 2.8 : 1.7);
        if (!humanNoticed && ctx.pointerSpeed > 1.2 && ctx.pointerNear && noticePending) {
          humanNoticed = true;
          noticePending = false;
          humanState = 2;
        }
        if (!thinking && ctx.sceneTime > ctx.sceneDuration * 0.54) {
          thinking = true;
          humanState = 3;
        }
      },
      render: (ctx) => {
        clearScene();
        const x = 0.54;
        const y = 0.86;
        renderHumanFigure(x, y, 1, humanState, humanPhase, 1);
        for (let i = 0; i < 2; i += 1) {
          const bx = wrap01(0.14 + i * 0.52 - ctx.sceneTime * 0.004);
          renderHumanFigure(bx, 0.88, 0.56, 0, humanPhase * 0.65 + i, 0.28);
        }
        if (thinking) {
          for (let i = 0; i < 12; i += 1) {
            const a = i * 0.52 + ctx.sceneTime * 0.22;
            const r = 0.025 + (i % 4) * 0.015;
            const sx = x + Math.cos(a) * r;
            const sy = y - SCENE_CFG.humanHeight * 0.72 - Math.abs(Math.sin(a)) * 0.12;
            addCell(sx, sy, 0.5, 0.55, AMBER_HUE, 0.48);
          }
          if (ctx.sceneTime > ctx.sceneDuration - 2.8) {
            const wave = easeInOut(clamp01((ctx.sceneTime - (ctx.sceneDuration - 2.8)) / 2.8));
            for (let row = 0; row < rows; row += 1) {
              for (let col = 0; col < cols; col += 1) {
                const px = (col + 0.5) / cols;
                const py = (row + 0.5) / rows;
                const d = Math.sqrt((px - x) ** 2 + (py - (y - 0.3)) ** 2);
                const ring = Math.abs(d - wave * 0.3);
                if (ring > 0.016) continue;
                const a = smooth(clamp01(1 - ring / 0.016));
                const idx = row * cols + col;
                sceneLum[idx] = Math.max(sceneLum[idx], 0.96 * a);
                sceneAlpha[idx] = Math.max(sceneAlpha[idx], 0.92 * a);
                sceneHue[idx] = GOLD_HUE;
              }
            }
          }
        }
      },
      exit: () => ({ x: 0.54, y: 0.48, r: 0.05, energy: 0.86, hue: AMBER_HUE }),
    };

    const thoughtQueue: readonly string[] = [
      "hello.",
      "still thinking...",
      "you're here",
      "you left.",
      "slow down.",
      "oh.",
    ];
    let dreamThoughtIndex = 0;

    const captureSnapshot = (): void => {
      const size = cols * rows;
      const baseOffset = snapshotHead * size;
      for (let i = 0; i < size; i += 1) {
        snapshotStore[baseOffset + i] = Math.round(clamp01(finalLum[i]) * 255);
      }
      snapshotHead = (snapshotHead + 1) % CFG.snapshotCount;
      snapshotValid = Math.min(CFG.snapshotCount, snapshotValid + 1);
    };

    const renderDream = (ctx: SceneContext): void => {
      clearScene();
      const size = cols * rows;
      const replayT = ctx.sceneTime * 0.42;
      const reverse = Math.floor(ctx.sceneTime / 5) % 2 === 1;
      const phase = Math.floor(replayT * CFG.snapshotHz);
      if (snapshotValid > 0) {
        const age = reverse
          ? (snapshotHead - 1 - (phase % snapshotValid) + CFG.snapshotCount) % CFG.snapshotCount
          : (snapshotHead - 1 + phase) % CFG.snapshotCount;
        const source = snapshotStore.subarray(age * size, age * size + size);
        const sliceShift = Math.sin(ctx.sceneTime * 0.8) * 0.045;
        for (let row = 0; row < rows; row += 1) {
          const displacement = Math.sin(row * 0.55 + ctx.sceneTime * 1.2) * sliceShift;
          const shift = Math.round(displacement * cols);
          for (let col = 0; col < cols; col += 1) {
            const srcCol = (col + shift + cols) % cols;
            const v = source[row * cols + srcCol] / 255;
            if (v < 0.08) continue;
            const idx = row * cols + col;
            sceneLum[idx] = Math.min(0.85, v * 0.68);
            sceneAlpha[idx] = Math.min(0.78, v * 0.62);
            sceneHue[idx] = lerpHue(EMBER_HUE, AMBER_HUE, 0.35 + v * 0.35);
          }
        }
      }
      attentionHotspot();
      addCell(
        hotspotX + Math.sin(ctx.sceneTime * 0.4) * 0.02,
        hotspotY + Math.cos(ctx.sceneTime * 0.32) * 0.02,
        1.0,
        0.3,
        EMBER_HUE,
        0.22,
      );
      if (ctx.sceneTime > ctx.sceneDuration * 0.35 && ctx.sceneTime < ctx.sceneDuration * 0.72) {
        const text = thoughtQueue[dreamThoughtIndex % thoughtQueue.length];
        const progress = Math.min(text.length, Math.max(0, (ctx.sceneTime - ctx.sceneDuration * 0.35) * 3.5));
        writeThought(progress, 0.42);
      }
    };

    const dream: Scene = {
      id: "dream",
      transition: "scan",
      duration: SCENE_CFG.dreamDuration,
      enter: () => {
        sceneHandoff = { x: 0.5, y: 0.5, r: 0.04, energy: 0.62, hue: EMBER_HUE };
        dreamThoughtIndex = Math.floor(masterRng() * thoughtQueue.length);
      },
      update: (_dt) => {
        /* Snapshots are captured by the director after the composed frame is shown. */
      },
      render: (ctx) => renderDream(ctx),
      exit: () => ({ x: 0.5, y: 0.5, r: 0.02, energy: 0.35, hue: EMBER_HUE }),
    };

    const scenes: readonly Scene[] = [spark, neural, eye, world, human, dream];

    const getScene = (id: SceneId): Scene => {
      for (let i = 0; i < scenes.length; i += 1) if (scenes[i].id === id) return scenes[i];
      return spark;
    };

    const chooseMiddleBeats = (): Beat[] => {
      const r = mulberry32((seed ^ (episodeNumber * 0x45d9f3b)) >>> 0);
      const beats: Beat[] = [];
      const choose = (id: SceneId, min: number, max: number): void => {
        beats.push({ kind: id, duration: min + r() * (max - min) });
      };
      if (mood.curiosity > 0.45) choose("eye", SCENE_CFG.eyeDuration[0], SCENE_CFG.eyeDuration[1]);
      if (mood.curiosity > 0.32) choose("world", SCENE_CFG.worldDuration[0], SCENE_CFG.worldDuration[1]);
      choose("human", SCENE_CFG.humanDuration[0], SCENE_CFG.humanDuration[1]);
      choose("neural", SCENE_CFG.neuralDuration[0], SCENE_CFG.neuralDuration[1]);
      if (mood.calm > 0.55 || r() > 0.35) choose("dream", SCENE_CFG.dreamDuration[0], SCENE_CFG.dreamDuration[1]);
      if (mood.arousal > 0.62 && r() > 0.4) choose("human", SCENE_CFG.humanDuration[0], SCENE_CFG.humanDuration[1] - 2);
      if (mood.curiosity > 0.65 && r() > 0.45) choose("world", SCENE_CFG.worldDuration[0], SCENE_CFG.worldDuration[1]);
      if (beats.length > 1) {
        for (let i = beats.length - 1; i > 0; i -= 1) {
          const j = Math.floor(r() * (i + 1));
          const tmp = beats[i];
          beats[i] = beats[j];
          beats[j] = tmp;
        }
      }
      return beats;
    };

    let episode: Beat[] = [];

    const buildEpisode = (): void => {
      episode = [];
      episode.push({ kind: "sleep", duration: CFG.sleepMin + masterRng() * 2 });
      episode.push({ kind: "spark", duration: SCENE_CFG.sparkDuration[0] + masterRng() * 2 });
      episode.push({ kind: "rest", duration: CFG.restMin + masterRng() * 2 });
      episode.push({ kind: "neural", duration: SCENE_CFG.neuralDuration[0] + masterRng() * 5 });
      const middle = chooseMiddleBeats();
      for (let i = 0; i < middle.length; i += 1) {
        const prior = episode[episode.length - 1].kind;
        if (middle[i].kind === prior) continue;
        episode.push({ kind: "rest", duration: CFG.restMin + masterRng() * (CFG.restMax - CFG.restMin) });
        episode.push(middle[i]);
      }
      episode.push({ kind: "rest", duration: CFG.restMin + masterRng() * 2 });
      episode.push({ kind: "neural", duration: SCENE_CFG.neuralDuration[0] + masterRng() * 4 });
      episode.push({ kind: "rest", duration: CFG.restMin + masterRng() * 2 });
      episode.push({ kind: "dream", duration: SCENE_CFG.dreamDuration[0] + masterRng() * 5 });
      episode.push({ kind: "sleep", duration: CFG.sleepMin + masterRng() * (CFG.sleepMax - CFG.sleepMin) });
      let sum = 0;
      for (let i = 0; i < episode.length; i += 1) sum += episode[i].duration;
      if (sum < 300) episode.push({ kind: "sleep", duration: 18 + masterRng() * 18 });
      if (sum > 480 && episode.length > 13) episode.splice(6, 2);
    };

    const nextBeat = (): void => {
      if (
        forcedScene === "spark" ||
        forcedScene === "neural" ||
        forcedScene === "eye" ||
        forcedScene === "world" ||
        forcedScene === "human" ||
        forcedScene === "dream"
      ) {
        const scene = getScene(forcedScene as SceneId);
        currentSceneId = scene.id;
        resting = false;
        sceneTime = 0;
        sceneDuration = scene.duration[0];
        const ctx = makeSceneContext(sceneDuration);
        scene.enter(ctx, sceneHandoff);
        return;
      }
      if (episode.length === 0 || beatIndex >= episode.length) {
        episodeNumber += 1;
        beatIndex = 0;
        buildEpisode();
      }
      if (firstLoad && episode.length > 0 && beatIndex === 0) {
        firstLoad = false;
        beatIndex = 1;
      }
      const beat = episode[beatIndex];
      beatIndex += 1;
      episodeElapsed += beat.duration;
      if (beat.kind === "rest" || beat.kind === "sleep") {
        resting = true;
        currentSceneId = null;
        restRemaining = beat.duration;
        sceneTime = 0;
        sceneDuration = beat.duration;
        thoughtAge = 99;
        return;
      }
      const scene = getScene(beat.kind);
      resting = false;
      currentSceneId = scene.id;
      sceneTime = 0;
      sceneDuration = beat.duration;
      sceneHandoff =
        scene.id === "world" && sceneHandoff.energy < 0.4
          ? { x: 0.5, y: 0.32, r: 0.05, energy: 0.8, hue: AMBER_HUE }
          : sceneHandoff;
      const ctx = makeSceneContext(sceneDuration);
      scene.enter(ctx, sceneHandoff);
      if (scene.id === "dream" && welcomeThought) welcomeThought = false;
    };

    const sceneContext: SceneContext = {
      dt: 0,
      time: 0,
      sceneTime: 0,
      sceneDuration: 1,
      width: 1,
      height: 1,
      cols: 2,
      rows: 2,
      unit: 2,
      pointerX: 0.5,
      pointerY: 0.5,
      pointerSpeed: 0,
      pointerNear: false,
      pointerActive: false,
      mood,
      timeOfDay: worldVariant,
      seed,
      rng: masterRng,
      handoff: sceneHandoff,
    };

    const makeSceneContext = (duration: number): SceneContext => {
      sceneContext.sceneDuration = duration;
      sceneContext.width = width;
      sceneContext.height = height;
      sceneContext.cols = cols;
      sceneContext.rows = rows;
      sceneContext.unit = unit;
      sceneContext.pointerX = pointerX;
      sceneContext.pointerY = pointerY;
      sceneContext.pointerSpeed = pointerSpeed;
      sceneContext.pointerNear = Math.sqrt((pointerX - 0.5) ** 2 + (pointerY - 0.5) ** 2) < 0.32;
      sceneContext.pointerActive = pointerActive;
      sceneContext.time = logicalTime;
      sceneContext.sceneTime = sceneTime;
      sceneContext.timeOfDay = worldVariant;
      sceneContext.handoff = sceneHandoff;
      return sceneContext;
    };

    const renderScene = (): void => {
      clearScene();
      if (resting || currentSceneId === null) return;
      const scene = getScene(currentSceneId);
      const context = makeSceneContext(sceneDuration);
      context.dt = 0;
      context.time = logicalTime;
      context.sceneTime = sceneTime;
      scene.render(context);
      if (clickAge < CFG.noticeMax) {
        const radius = 0.04 + easeOut(clamp01(clickAge / 0.8)) * 0.1;
        addCell(
          clickX,
          clickY,
          radius * Math.max(cols, rows),
          0.86 * Math.exp(-clickAge * 1.1),
          AMBER_HUE,
          0.78 * Math.exp(-clickAge * 1.1),
        );
      }
    };

    const applyTransition = (): void => {
      if (resting || currentSceneId === null) return;
      const p = clamp01(sceneTime / Math.max(0.01, sceneDuration));
      const scene = getScene(currentSceneId);
      let a = 1;
      if (p < 0.1) a *= easeOut(p / 0.1);
      if (p > 0.9) a *= 1 - easeIn((p - 0.9) / 0.1);
      if (scene.transition === "radial") {
        const focal = sceneHandoff;
        for (let row = 0; row < rows; row += 1) {
          const y = (row + 0.5) / rows;
          for (let col = 0; col < cols; col += 1) {
            const x = (col + 0.5) / cols;
            const d = Math.sqrt((x - focal.x) ** 2 + (y - focal.y) ** 2);
            const reveal = smooth(clamp01((a + p * 0.18 - d) / 0.42));
            const idx = row * cols + col;
            sceneAlpha[idx] *= reveal;
            sceneLum[idx] *= reveal;
          }
        }
      } else if (scene.transition === "scan") {
        const edge = p < 0.18 ? p / 0.18 : p > 0.82 ? (1 - p) / 0.18 : 1;
        const lead = p < 0.5 ? p * 2 : (1 - p) * 2;
        for (let row = 0; row < rows; row += 1) {
          const y = (row + 0.5) / rows;
          const keep = smooth(clamp01((lead - Math.abs(y - lead) * 0.65) / 0.35));
          for (let col = 0; col < cols; col += 1) {
            const idx = row * cols + col;
            sceneAlpha[idx] *= keep * edge;
            sceneLum[idx] *= keep * edge;
          }
        }
      } else {
        for (let i = 0; i < sceneAlpha.length; i += 1) {
          sceneAlpha[i] *= a;
          sceneLum[i] *= a;
        }
      }
    };

    const applyPost = (dt: number): void => {
      const size = cols * rows;
      let targetMean = 0;
      for (let i = 0; i < size; i += 1) {
        const b = base[i];
        const alpha = sceneAlpha[i];
        const sceneMix = alpha * 0.56;
        finalLum[i] = clamp01(b + (sceneLum[i] - b) * sceneMix);
        finalHue[i] = alpha > 0.01 ? lerpHue(baseHue[i], sceneHue[i], alpha) : baseHue[i];
        targetMean += base[i];
      }
      targetMean /= Math.max(1, size);
      if (baselineMean <= 0) baselineMean = targetMean;
      const breathScale = 1 + Math.sin((logicalTime / CFG.breathPeriod) * TAU) * CFG.breathAmount;
      const heartbeatScale = reducedMotionQuery.matches || resting ? 0 : heartbeat(logicalTime);
      const halfLifeDecay = Math.exp((-Math.log(2) * dt) / CFG.trailHalfLife);
      for (let row = 0; row < rows; row += 1) {
        const y = (row + 0.5) / rows;
        for (let col = 0; col < cols; col += 1) {
          const x = (col + 0.5) / cols;
          const idx = row * cols + col;
          let lum = finalLum[idx] * breathScale;
          const edgeX = Math.abs(x - 0.5) * 2;
          const edgeY = Math.abs(y - 0.5) * 2;
          const vignette = 1 - CFG.vignetteEdge * Math.max(edgeX, edgeY) ** 2;
          lum *= vignette;
          if (heartbeatScale > 0) {
            const d = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2);
            const ring = Math.exp(-Math.abs(d - 0.11 - heartbeatScale * 0.1) / 0.018) * heartbeatScale;
            lum = clamp01(lum + ring * CFG.heartbeatAmount);
          }
          if (trailEnabled) {
            trail[idx] *= halfLifeDecay;
            if (lum > trail[idx]) trail[idx] = lum;
            lum = clamp01(lum + trail[idx] * 0.032);
          }
          if (insideSafe(x, y)) {
            lum *= CFG.safeDamper;
            if (Math.abs(shortestHue(GOLD_HUE, finalHue[idx])) < 0.08) finalHue[idx] = EMBER_HUE;
          }
          finalLum[idx] = lum;
        }
      }
      if (bloomEnabled && !reducedMotionQuery.matches && currentSceneId !== null) {
        for (let i = 0; i < size; i += 1) bloom[i] = finalLum[i] > CFG.bloomThreshold ? finalLum[i] : 0;
        for (let row = 0; row < rows; row += 1) {
          const r0 = Math.max(0, row - 1);
          const r1 = Math.min(rows - 1, row + 1);
          for (let col = 0; col < cols; col += 1) {
            const c0 = Math.max(0, col - 1);
            const c1 = Math.min(cols - 1, col + 1);
            let total = 0;
            let count = 0;
            for (let rr = r0; rr <= r1; rr += 1)
              for (let cc = c0; cc <= c1; cc += 1) {
                total += bloom[rr * cols + cc];
                count += 1;
              }
            blur[row * cols + col] = total / count;
          }
        }
        for (let i = 0; i < size; i += 1) finalLum[i] = clamp01(finalLum[i] + blur[i] * CFG.bloomAmount * 0.12);
      }
    };

    const enforceBudgets = (): void => {
      const size = cols * rows;
      let mean = 0;
      let gold = 0;
      let flashes = 0;
      for (let i = 0; i < size; i += 1) {
        mean += finalLum[i];
        if (sceneAlpha[i] > 0.08 && Math.abs(shortestHue(GOLD_HUE, sceneHue[i])) < 0.065 && finalLum[i] > 0.12)
          gold += 1;
        if (finalLum[i] - previousLum[i] > CFG.flashThreshold) flashes += 1;
      }
      mean /= Math.max(1, size);
      const low = baselineMean * (1 - CFG.baselineTolerance);
      const high = baselineMean * (1 + CFG.baselineTolerance);
      if (mean < low || mean > high) {
        const target = clamp(mean, low, high);
        const offset = target - mean;
        for (let i = 0; i < size; i += 1) finalLum[i] = clamp01(finalLum[i] + offset);
      }
      if (gold / Math.max(1, size) > CFG.maxGoldArea) {
        const ratio = CFG.maxGoldArea / Math.max(0.0001, gold / size);
        for (let i = 0; i < size; i += 1) {
          if (Math.abs(shortestHue(GOLD_HUE, finalHue[i])) < 0.07) finalLum[i] *= ratio;
        }
        gold = Math.floor(size * CFG.maxGoldArea);
      }
      const flashArea = flashes / Math.max(1, size);
      if (flashArea > CFG.maxFlashArea) {
        for (let i = 0; i < size; i += 1) {
          const delta = finalLum[i] - previousLum[i];
          if (delta > CFG.flashThreshold) finalLum[i] = previousLum[i] + delta * 0.1;
        }
      }
      meanLuminance = 0;
      goldPercent = gold / Math.max(1, size);
      flashPercent = flashArea;
      for (let i = 0; i < size; i += 1) {
        meanLuminance += finalLum[i];
        previousLum[i] = finalLum[i];
      }
      meanLuminance /= Math.max(1, size);
    };

    const writeFrame = (): void => {
      const size = cols * rows;
      for (let i = 0; i < size; i += 1) {
        const hueIndex = clamp(Math.floor(finalHue[i] * 512), 0, 511);
        const brightnessIndex = clamp(Math.floor(clamp01(finalLum[i]) * 64), 0, 63);
        const m = (brightnessIndex + 0.5) / 64;
        const o = hueIndex * 3;
        image.data[i * 4] = Math.round(lut[o] * m);
        image.data[i * 4 + 1] = Math.round(lut[o + 1] * m);
        image.data[i * 4 + 2] = Math.round(lut[o + 2] * m);
        image.data[i * 4 + 3] = 255;
      }
      if (!offCtx) return;
      offCtx.putImageData(image, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(offscreen, 0, 0, width, height);
    };

    const drawDebug = (): void => {
      if (!debug) return;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      const sceneText = currentSceneId ?? "sleep";
      const moodText = `a ${mood.arousal.toFixed(2)}  c ${mood.curiosity.toFixed(2)}  t ${mood.attention.toFixed(2)}  calm ${mood.calm.toFixed(2)}`;
      ctx.fillText(`fps ${frameCap}  scene ${sceneText}  ep ${episodeNumber}`, 10, 18);
      ctx.fillText(moodText, 10, 33);
      ctx.fillText(
        `lum ${(meanLuminance * 100).toFixed(1)} / base ${(baselineMean * 100).toFixed(1)}  gold ${(goldPercent * 100).toFixed(2)}%  flash ${(flashPercent * 100).toFixed(2)}%`,
        10,
        48,
      );
      ctx.fillText(
        `safe ${safeRectsDirty ? "recompute" : "ok"}  quality ${qualityLow ? "low" : "full"}  seed ${seed}`,
        10,
        63,
      );
      ctx.restore();
    };

    const startSceneFromRest = (): void => {
      if (noticePending && !reducedMotionQuery.matches) {
        noticePending = false;
        const prior = currentSceneId;
        currentSceneId = "eye";
        resting = false;
        sceneTime = 0;
        sceneDuration = Math.min(CFG.noticeMax, 5 + mood.attention);
        sceneHandoff = {
          x: pointerActive ? pointerX : 0.5,
          y: pointerActive ? pointerY : 0.5,
          r: 0.05,
          energy: 0.62,
          hue: AMBER_HUE,
        };
        getScene("eye").enter(makeSceneContext(sceneDuration), sceneHandoff);
        void prior;
        return;
      }
      nextBeat();
    };

    const tickDirector = (dt: number): void => {
      if (reducedMotionQuery.matches) return;
      episodeElapsed += dt;
      clickAge += dt;
      if (resting) {
        restRemaining -= dt;
        if (restRemaining <= 0) startSceneFromRest();
      } else if (currentSceneId !== null) {
        const scene = getScene(currentSceneId);
        sceneTime += dt;
        const context = makeSceneContext(sceneDuration);
        context.dt = dt;
        context.sceneTime = sceneTime;
        scene.update(dt, logicalTime, context);
        if (sceneTime >= sceneDuration) {
          sceneHandoff = scene.exit();
          resting = true;
          currentSceneId = null;
          restRemaining = CFG.restMin + masterRng() * (CFG.restMax - CFG.restMin);
          sceneTime = 0;
        }
      }
      if (returnThought && resting) {
        thoughtText = "you left.";
        prepareThought(thoughtText);
        thoughtAge += dt;
        if (thoughtAge > 0.7) returnThought = false;
      }
      if (welcomeThought && resting) {
        thoughtText = "you're here";
        thoughtAge += dt;
      }
    };

    const renderThoughtOverlay = (): void => {
      if ((!returnThought && !welcomeThought) || !resting || reducedMotionQuery.matches) return;
      writeThought(preparedThoughtLength, 0.25);
    };

    const onVisibility = (): void => {
      if (document.hidden) {
        hiddenBefore = true;
        running = false;
        cancelAnimationFrame(raf);
        return;
      }
      if (hiddenBefore) {
        hiddenBefore = false;
        pointerActive = false;
        mood.attention = 0.12;
        thoughtText = "you left.";
        prepareThought(thoughtText);
        thoughtAge = 0;
        returnThought = true;
      }
      if (minimal) return;
      running = true;
      lastNow = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    const onMotionPreference = (): void => {
      if (reducedMotionQuery.matches) {
        cancelAnimationFrame(raf);
        currentSceneId = null;
        resting = true;
      } else if (!minimal && !document.hidden) {
        running = true;
        lastNow = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };

    const observer = new MutationObserver(() => {
      minimal = document.documentElement.dataset.theme === "minimal";
      if (minimal) {
        running = false;
        cancelAnimationFrame(raf);
        return;
      }
      if (!document.hidden) {
        running = true;
        lastNow = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    });

    const onResize = (): void => {
      resize();
      recomputeSafeRects();
    };

    function tick(now: number): void {
      if (!running || minimal || document.hidden) return;
      const frameStart = performance.now();
      const minFrameGap = 1000 / frameCap;
      if (now - lastRenderAt < minFrameGap) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const rawDt = (now - lastNow) / 1000;
      const dt = clamp(rawDt, 0.001, 0.05) * clamp(forcedSpeed, 0.1, 20);
      lastNow = now;
      logicalTime += dt;
      hueSpin += dt * 0.04;
      frameIndex += 1;
      updateMood(dt);
      updateHeat(dt);
      if (safeRectsDirty) recomputeSafeRects();
      tickDirector(dt);
      buildSubstrate(logicalTime);
      renderScene();
      applyTransition();
      renderThoughtOverlay();
      applyPost(dt);
      enforceBudgets();
      snapshotAccumulator += dt;
      if (snapshotAccumulator >= 1 / CFG.snapshotHz) {
        snapshotAccumulator = 0;
        captureSnapshot();
      }
      writeFrame();
      drawDebug();

      const elapsedMs = performance.now() - frameStart;
      averageFrameMs = averageFrameMs === 0 ? elapsedMs : averageFrameMs * 0.96 + elapsedMs * 0.04;
      if (frameIndex % CFG.adaptiveWindow === 0) {
        if (averageFrameMs > CFG.adaptiveBudgetMs) {
          qualityLow = true;
          skipSubstrate = true;
          trailEnabled = false;
          bloomEnabled = false;
          frameCap = CFG.lowQualityFps;
        } else if (averageFrameMs < CFG.adaptiveBudgetMs * 0.75) {
          qualityLow = false;
          skipSubstrate = false;
          trailEnabled = true;
          bloomEnabled = true;
          frameCap = width <= 768 ? CFG.mobileFps : CFG.desktopFps;
        }
      }
      lastRenderAt = now;
      raf = requestAnimationFrame(tick);
    }

    /* The first frame establishes the resting-substrate baseline before the film wakes. */
    resize();
    recomputeSafeRects();
    if (welcomeThought) prepareThought("you're here");
    buildEpisode();
    buildSubstrate(0);
    finalLum.set(base);
    finalHue.set(baseHue);
    previousLum.set(finalLum);
    enforceBudgets();
    previousLum.set(finalLum);
    writeFrame();
    drawDebug();

    if (!reducedMotionQuery.matches && !minimal && !document.hidden) {
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotionQuery.addEventListener("change", onMotionPreference);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      reducedMotionQuery.removeEventListener("change", onMotionPreference);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      if (safeRectTimer !== null) window.clearTimeout(safeRectTimer);
    };
  }, []);

  return (
    <div aria-hidden="true" className="site-background orange-bg">
      <canvas ref={canvasRef} className="led-wallpaper-canvas" />
    </div>
  );
};

export default AnimatedLedBackground;
