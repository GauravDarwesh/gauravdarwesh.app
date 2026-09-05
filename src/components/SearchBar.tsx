"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Mic, Check, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* =========================================================
   0. CROSS-RUNTIME ENV & TTS CONFIG
   ========================================================= */

const getEnv = (key: string, viteFallbackKey: string): string => {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.[viteFallbackKey]) {
      return metaEnv[viteFallbackKey] as string;
    }
  } catch {
    /* import.meta might be inaccessible in standard CJS/Next environments */
  }
  return "";
};

const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;
const TRANSCRIBE_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-transcribe`;

const TTS_QUOTA_BLOCK_KEY = "gdx_tts_quota_blocked_until";
const TTS_QUOTA_FALLBACK_MS = 24 * 60 * 60 * 1000;
const TTS_KNOWN_PROVIDER_RESET_AT = 1788566400000;

const getTtsQuotaBlockedUntil = (): number => {
  if (typeof window === "undefined") return 0;

  const knownProviderBlock = TTS_KNOWN_PROVIDER_RESET_AT > Date.now() ? TTS_KNOWN_PROVIDER_RESET_AT : 0;

  try {
    const value = Number(window.localStorage.getItem(TTS_QUOTA_BLOCK_KEY));
    if (Number.isFinite(value) && value > Date.now()) {
      return Math.max(value, knownProviderBlock);
    }
    window.localStorage.removeItem(TTS_QUOTA_BLOCK_KEY);
  } catch {
    /* Storage may be unavailable */
  }

  return knownProviderBlock;
};

const rememberTtsQuotaLimit = (responseBody: string) => {
  if (typeof window === "undefined") return;
  const resetMatch = responseBody.match(/X-RateLimit-Reset[^0-9]*(\d{10,13})/i);
  const parsedReset = resetMatch ? Number(resetMatch[1]) : 0;
  const resetAt =
    Number.isFinite(parsedReset) && parsedReset > Date.now() ? parsedReset : Date.now() + TTS_QUOTA_FALLBACK_MS;

  try {
    window.localStorage.setItem(TTS_QUOTA_BLOCK_KEY, String(resetAt));
  } catch {
    /* Storage failure fallback */
  }
};

/* =========================================================
   1. CHATGPT-STYLE WAVEFORM ICON
   ========================================================= */

const ChatGPTWaveformIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4 text-white" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <rect x="3.5" y="8" width="2.5" height="8" rx="1.25" />
    <rect x="8.5" y="4" width="2.5" height="16" rx="1.25" />
    <rect x="13.5" y="6.5" width="2.5" height="11" rx="1.25" />
    <rect x="18.5" y="9" width="2.5" height="6" rx="1.25" />
  </svg>
);

/* =========================================================
   2. SECURE MARKDOWN → HTML CONVERTER (XSS-SAFE)
   ========================================================= */

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const convertMarkdownToHtml = (text: string): string => {
  const processInline = (str: string): string => {
    let sanitized = escapeHtml(str);

    const rules = [
      {
        pattern: /\*\*(.*?)\*\*/g,
        replacement: '<strong class="font-normal">$1</strong>',
      },
      {
        pattern: /\*(.*?)\*/g,
        replacement: "<em>$1</em>",
      },
      {
        pattern: /`([^`]+)`/g,
        replacement: '<code class="inline-code">$1</code>',
      },
      {
        pattern: /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g,
        replacement:
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>',
      },
    ];

    rules.forEach((rule) => {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    });

    return sanitized;
  };

  return text
    .split("\n")
    .map((rawLine) => {
      const line = rawLine.trim();
      if (!line) return "<br>";

      if (line.startsWith("### ")) {
        return `<h3 class="text-lg font-normal mt-4 mb-2">${processInline(line.slice(4))}</h3>`;
      }
      if (line.startsWith("## ")) {
        return `<h2 class="text-xl font-normal mt-4 mb-2">${processInline(line.slice(3))}</h2>`;
      }
      if (line.startsWith("# ")) {
        return `<h1 class="text-2xl font-normal mt-4 mb-2">${processInline(line.slice(2))}</h1>`;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<li class="ml-4 list-disc font-normal">${processInline(line.slice(2))}</li>`;
      }

      return `<p class="mb-2 font-normal">${processInline(line)}</p>`;
    })
    .join("");
};

/* =========================================================
   3. FADE HELPER
   ========================================================= */

function Fade({ show, duration = 300, children }: { show: boolean; duration?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [show, duration]);

  if (!visible && !show) return null;

  return (
    <div
      className={`transition-opacity ${show ? "opacity-100" : "opacity-0"}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   4. REACTIVE WAVEFORM (NO LAYOUT THRASHING)
   ========================================================= */

const BarWaveform: React.FC<{
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking?: boolean;
}> = ({ analyser, isActive, isSpeaking = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayedLevelsRef = useRef<number[]>([]);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!isActive || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_WIDTH = 2;
    const BAR_GAP = 2;
    const MIN_HEIGHT = 3;

    let bufferLength = 0;
    let dataArray: Uint8Array | null = null;

    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      analyser.minDecibels = -86;
      analyser.maxDecibels = -12;

      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    let lastTime = performance.now();

    const updateDimensions = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      dimensionsRef.current = { width, height };

      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
      const targetWidth = Math.max(1, Math.round(width * dpr));
      const targetHeight = Math.max(1, Math.round(height * dpr));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const barCount = Math.max(8, Math.floor(width / (BAR_WIDTH + BAR_GAP)));
      const prev = displayedLevelsRef.current;

      if (prev.length !== barCount) {
        displayedLevelsRef.current = Array.from({ length: barCount }, (_, index) => {
          if (!prev.length) return 0.08;
          const mapped = (index / Math.max(1, barCount - 1)) * Math.max(0, prev.length - 1);
          const left = Math.floor(mapped);
          const right = Math.min(prev.length - 1, left + 1);
          const blend = mapped - left;
          return (prev[left] || 0.08) * (1 - blend) + (prev[right] || 0.08) * blend;
        });
      }
    };

    const initialRect = containerRef.current.getBoundingClientRect();
    updateDimensions(initialRect.width, initialRect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateDimensions(width, height);
      }
    });
    resizeObserver.observe(containerRef.current);

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);

      const { width: w, height: h } = dimensionsRef.current;
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barCount = Math.max(8, Math.floor(w / (BAR_WIDTH + BAR_GAP)));
      if (displayedLevelsRef.current.length !== barCount) {
        displayedLevelsRef.current = Array.from({ length: barCount }, () => 0.08);
      }

      const delta = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;

      let realAudioEnergy = 0;
      if (analyser && dataArray && bufferLength > 0) {
        analyser.getByteFrequencyData(dataArray);
        for (let j = 0; j < Math.min(32, bufferLength); j++) {
          realAudioEnergy += dataArray[j];
        }
      }

      const hasRealSignal = realAudioEnergy > 15;

      for (let i = 0; i < barCount; i++) {
        let targetValue = 0.08;

        if (hasRealSignal && analyser && dataArray && bufferLength > 0) {
          const normalizedPosition = i / Math.max(1, barCount - 1);
          const low = Math.floor(Math.pow(normalizedPosition, 1.65) * (bufferLength * 0.88));
          const high = Math.max(low + 1, Math.floor(Math.pow((i + 1) / barCount, 1.65) * (bufferLength * 0.88)));

          let sum = 0;
          let weight = 0;

          for (let j = low; j < Math.min(high, bufferLength); j++) {
            const frequencyPosition = j / Math.max(1, bufferLength - 1);
            const voiceWeight = 1.2 - frequencyPosition * 0.78;
            const sample = dataArray[j] / 255;
            sum += sample * Math.max(0.28, voiceWeight);
            weight += Math.max(0.28, voiceWeight);
          }

          const spectrumValue = weight > 0 ? sum / weight : 0;
          targetValue = Math.min(1, 0.045 + Math.pow(spectrumValue, 0.78) * 1.48);
        } else if (isSpeaking) {
          const t = now * 0.005;
          const speechRhythm = Math.sin(t * 1.8) * Math.sin(t * 3.2);
          const modulation = Math.max(0.25, 0.6 + 0.4 * speechRhythm);
          const harmonic = Math.sin(t * 4.0 + i * 0.42) * 0.5 + Math.cos(t * 2.2 + i * 0.28) * 0.5;
          const barEnvelope = Math.sin((i / Math.max(1, barCount - 1)) * Math.PI);
          targetValue = Math.max(0.08, Math.min(0.9, 0.12 + (harmonic * 0.5 + 0.5) * modulation * barEnvelope * 0.85));
        } else {
          const t = now * 0.002;
          const gentleWave = Math.sin(t * 2.0 + i * 0.25) * 0.035;
          targetValue = 0.07 + gentleWave;
        }

        const current = displayedLevelsRef.current[i] ?? 0.08;
        const attack = 1 - Math.pow(0.18, delta / 16.67);
        const release = 1 - Math.pow(0.45, delta / 16.67);

        displayedLevelsRef.current[i] =
          targetValue > current
            ? current + (targetValue - current) * attack
            : current + (targetValue - current) * release;

        const value = Math.max(0.05, Math.min(1, displayedLevelsRef.current[i]));
        const barHeight = Math.max(MIN_HEIGHT, value * (h * 0.85));

        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (h - barHeight) / 2;
        const radius = Math.min(1, barHeight / 2);

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + value * 0.5})`;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, BAR_WIDTH, barHeight, radius);
        } else {
          ctx.rect(x, y, BAR_WIDTH, barHeight);
        }
        ctx.fill();
      }
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      animFrameRef.current = null;
    };
  }, [analyser, isActive, isSpeaking]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="flex-1 h-8 min-w-0 overflow-hidden">
      <canvas ref={canvasRef} className="pointer-events-none block w-full h-full" />
    </div>
  );
};

/* =========================================================
   5. RECORDING TIMER
   ========================================================= */

const RecordingTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    setSeconds(0);
    intervalRef.current = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isActive]);

  if (!isActive) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="text-sm font-mono font-normal text-white/70 tabular-nums shrink-0">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

/* =========================================================
   UNIVERSAL AUDIO DECODER (SAFARI / IOS / WINDOWS SAFE)
   ========================================================= */

const decodeAudioDataSafe = (ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> => {
  return new Promise((resolve, reject) => {
    const promise = ctx.decodeAudioData(buffer, resolve, reject);
    if (promise && typeof promise.then === "function") {
      promise.then(resolve).catch(reject);
    }
  });
};

/* =========================================================
   6. SEARCH BAR MAIN COMPONENT
   ========================================================= */

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const STORAGE_KEY = "searchbar_state";

  /* -------------------------------------------------------
     UI State (SSR-Safe Init)
     ------------------------------------------------------- */

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [suggestionPhase, setSuggestionPhase] = useState<
    "emerging" | "visible" | "retreating" | "blurringOut" | "hidden"
  >("hidden");
  const [fullText, setFullText] = useState("");
  const suggestionIndexRef = useRef(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(false);
  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);

  /* -------------------------------------------------------
     Hydrate Persisted State Safely on Mount
     ------------------------------------------------------- */

  useEffect(() => {
    try {
      const navigation = window.performance?.getEntriesByType("navigation")?.[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isPageRefresh = (window.performance as any)?.navigation?.type === 1 || navigation?.type === "reload";

      if (isPageRefresh) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.response) {
          setResponse(parsed.response);
          setIsRestoredFromStorage(true);
        }
        if (Array.isArray(parsed.suggestions)) setSuggestions(parsed.suggestions);
        if (typeof parsed.hasInteracted === "boolean") setHasInteracted(parsed.hasInteracted);
        if (typeof parsed.showExpandedSuggestions === "boolean") {
          setShowExpandedSuggestions(parsed.showExpandedSuggestions);
        }
        if (typeof parsed.lastActivityTime === "number") setLastActivityTime(parsed.lastActivityTime);
      }
    } catch {
      /* Safe fallback on restricted storage */
    }
  }, []);

  /* -------------------------------------------------------
     Modes: Voice Session vs Transcribe
     ------------------------------------------------------- */

  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isVoiceSessionRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const isAndroidRef = useRef(false);
  const isXiaomiRef = useRef(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent || "";
      isAndroidRef.current = /Android/i.test(ua);
      isXiaomiRef.current = /Xiaomi|Redmi|POCO|MiuiBrowser|MIUI|Mi\s?Pad/i.test(ua);
    }
  }, []);

  const androidRecorderRef = useRef<MediaRecorder | null>(null);
  const androidRecordedChunksRef = useRef<Blob[]>([]);
  const androidRecordingMimeTypeRef = useRef<string>("");
  const androidRecordingPromiseRef = useRef<Promise<Blob> | null>(null);

  isVoiceSessionRef.current = isVoiceSession;
  isTranscribingRef.current = isTranscribing;
  isLoadingRef.current = isLoading;
  isSpeakingRef.current = isSpeaking;

  /* -------------------------------------------------------
     Placeholder
     ------------------------------------------------------- */

  const placeholderTexts = useMemo(() => ["Have a dialogue with GDx...", "Ask anything..."], []);
  const [placeholderText, setPlaceholderText] = useState(placeholderTexts[0]);
  const [placeholderPhase, setPlaceholderPhase] = useState<"typing" | "pause" | "deleting">("pause");
  const [placeholderTarget, setPlaceholderTarget] = useState(0);

  /* -------------------------------------------------------
     Audio / recognition refs
     ------------------------------------------------------- */

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const analyserDestinationConnectedRef = useRef(false);
  const analyserMonitorRef = useRef<GainNode | null>(null);

  const recognitionRef = useRef<any>(null);
  const recognitionGenerationRef = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const transcriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transcribeTranscriptRef = useRef("");
  const transcribeGenerationRef = useRef(0);
  const transcribeManualStopRef = useRef(false);
  const transcribeRecorderRef = useRef<MediaRecorder | null>(null);
  const transcribeChunksRef = useRef<Blob[]>([]);
  const transcribeMimeTypeRef = useRef<string>("");
  const transcribeRecordingPromiseRef = useRef<Promise<Blob> | null>(null);

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const hostedAudioRef = useRef<HTMLAudioElement | null>(null);
  const androidPlaybackAudioRef = useRef<HTMLAudioElement | null>(null);
  const hostedObjectUrlRef = useRef<string | null>(null);
  const speakTokenRef = useRef(0);

  // Global GC pinned anchor for SpeechSynthesis
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();
  const stopVoiceSessionRef = useRef<(() => void) | null>(null);
  const stopTranscribeRef = useRef<(() => void) | null>(null);
  const startListeningContinuousRef = useRef<(() => Promise<void>) | null>(null);

  /* =======================================================
     PERSIST STATE
     ======================================================= */

  const saveState = useCallback(
    (state: {
      response: string | null;
      suggestions: string[];
      hasInteracted: boolean;
      showExpandedSuggestions: boolean;
      lastActivityTime: number;
    }) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn("Failed to save search state:", error);
      }
    },
    [],
  );

  useEffect(() => {
    saveState({
      response,
      suggestions,
      hasInteracted,
      showExpandedSuggestions,
      lastActivityTime,
    });
  }, [response, suggestions, hasInteracted, showExpandedSuggestions, lastActivityTime, saveState]);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear persisted search state:", error);
    }
  }, []);

  /* =======================================================
     AUDIO CONTEXT & HARDWARE UNLOCK (IOS / ANDROID / DESKTOP)
     ======================================================= */

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error("Web Audio is not supported by this browser.");
      }

      const ctx: AudioContext = new AudioCtx();
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.08;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -8;

      const monitor = ctx.createGain();
      monitor.gain.value = 1;

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      analyserMonitorRef.current = monitor;

      setAnalyserNode(analyser);
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return {
      ctx: audioContextRef.current,
      analyser: analyserRef.current!,
    };
  }, []);

  const primeMobileAudioSession = useCallback(() => {
    const isAndroid = isAndroidRef.current;

    try {
      const { ctx } = getAudioContext();
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      /* AudioContext fallback */
    }

    if (typeof window === "undefined") return;

    if ("speechSynthesis" in window) {
      try {
        if (isAndroid) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume();
        } else {
          // iOS Safari primed unlock
          window.speechSynthesis.cancel();
          const prime = new SpeechSynthesisUtterance("");
          prime.volume = 0.01;
          window.speechSynthesis.speak(prime);
          window.speechSynthesis.resume();
        }
      } catch {
        /* Speech synthesis unlock fallback */
      }
    }

    if (isAndroid && !androidPlaybackAudioRef.current) {
      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.volume = 1;
        androidPlaybackAudioRef.current = audio;
      } catch {
        /* Construction fallback */
      }
    }
  }, [getAudioContext]);

  /* =======================================================
     TRANSCRIBE CONFIRMATION TONE
     ======================================================= */

  const playTranscribeTone = useCallback(
    (kind: "start" | "done") => {
      if (!isAndroidRef.current) return;

      try {
        const { ctx } = getAudioContext();
        if (ctx.state === "suspended") void ctx.resume();

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(kind === "start" ? 880 : 660, now);
        if (kind === "done") oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.09);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
      } catch {
        /* Notification tone fallback */
      }
    },
    [getAudioContext],
  );

  /* =======================================================
     ROTATING SUGGESTIONS
     ======================================================= */

  const rotatingSuggestions = useMemo(
    () => [
      "✨ Tell me about Gaurav's Experience",
      "✨ What is Gaurav's Education?",
      "✨ What are Gaurav's Skills?",
      "✨ Can you share Gaurav's Recommendations?",
      "✨ Show me Gaurav's Achievements",
      "✨ List Gaurav's Certifications",
      "✨ What Projects has Gaurav done?",
      "✨ Does Gaurav have any Hobbies?",
      "✨ How to Contact Gaurav?",
      "✨ What roles has Gaurav worked in?",
      "✨ Can you share Gaurav's Career Highlights?",
      "✨ What is Gaurav passionate about?",
      "✨ Which Companies has Gaurav worked at?",
      "✨ What is Gaurav's Current Role?",
      "✨ Can you share Gaurav's Career Timeline?",
      "✨ What Technologies does Gaurav use?",
      "✨ Who has Gaurav collaborated with?",
      "✨ What are Gaurav's Strengths?",
      "✨ What are Gaurav's Future Goals?",
      "✨ What Languages does Gaurav know?",
      "✨ Has Gaurav contributed to Open Source?",
      "✨ What Awards has Gaurav received?",
      "✨ Has Gaurav done any Volunteering?",
      "✨ Can you share Gaurav's Leadership Experience?",
      "✨ What Publications has Gaurav written?",
      "✨ What Conferences has Gaurav attended?",
      "✨ Has Gaurav delivered any Talks?",
      "✨ What is Gaurav's Work Philosophy?",
      "✨ Can you share a Fun Fact about Gaurav?",
    ],
    [],
  );

  /* =======================================================
     SMOOTH SUGGESTION BUBBLE DISMISS
     ======================================================= */

  const dismissSuggestionBubble = useCallback(() => {
    if (suggestionPhase === "hidden" || suggestionPhase === "blurringOut") return;
    setSuggestionPhase("blurringOut");

    setTimeout(() => {
      setShowTypewriter(false);
      setSuggestionPhase("hidden");
    }, 400);
  }, [suggestionPhase]);

  /* =======================================================
     PLACEHOLDER ROTATION
     ======================================================= */

  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || isTranscribing || query) return;

    const currentTarget = placeholderTexts[placeholderTarget];

    if (placeholderPhase === "pause") {
      const timer = setTimeout(() => setPlaceholderPhase("deleting"), 2500);
      return () => clearTimeout(timer);
    }

    if (placeholderPhase === "deleting") {
      if (!placeholderText.length) {
        setPlaceholderTarget((prev) => (prev + 1) % placeholderTexts.length);
        setPlaceholderPhase("typing");
        return;
      }

      const timer = setTimeout(() => setPlaceholderText((current) => current.slice(0, -1)), 30);
      return () => clearTimeout(timer);
    }

    if (placeholderPhase === "typing") {
      if (placeholderText === currentTarget) {
        setPlaceholderPhase("pause");
        return;
      }

      const timer = setTimeout(() => setPlaceholderText(currentTarget.slice(0, placeholderText.length + 1)), 50);
      return () => clearTimeout(timer);
    }
  }, [
    placeholderText,
    placeholderPhase,
    placeholderTarget,
    placeholderTexts,
    isLoading,
    isListening,
    isVoiceSession,
    isTranscribing,
    query,
  ]);

  /* =======================================================
     ACTIVITY TRACKING (MOBILE TOUCH + DESKTOP)
     ======================================================= */

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const debouncedSetActivity = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setLastActivityTime(Date.now()), 100);
  }, []);

  useEffect(() => {
    const handleImmediate = () => setLastActivityTime(Date.now());
    const passiveOption = { passive: true };

    window.addEventListener("mousemove", debouncedSetActivity, passiveOption);
    window.addEventListener("touchmove", debouncedSetActivity, passiveOption);

    const interactiveEvents = ["keypress", "click", "scroll", "touchstart"];
    interactiveEvents.forEach((event) => window.addEventListener(event, handleImmediate, passiveOption));

    return () => {
      window.removeEventListener("mousemove", debouncedSetActivity);
      window.removeEventListener("touchmove", debouncedSetActivity);
      interactiveEvents.forEach((event) => window.removeEventListener(event, handleImmediate));
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [debouncedSetActivity]);

  /* =======================================================
     FIRST VISIT
     ======================================================= */

  useEffect(() => {
    const FIRST_VISIT_KEY = "gd_ai_first_visit";
    try {
      const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
      if (isFirstVisit && !response && suggestions.length === 0 && !isLoading) {
        localStorage.setItem(FIRST_VISIT_KEY, "true");
        const timer = setTimeout(() => {
          handleSubmitRef.current?.(undefined, "introduce the website to the new user", false);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      /* Storage restricted fallback */
    }
  }, [response, suggestions.length, isLoading]);

  /* =======================================================
     TYPEWRITER & ROTATING BUBBLE
     ======================================================= */

  useEffect(() => {
    if (response || suggestions.length > 0 || isVoiceSession || isTranscribing) return;

    const timer = setTimeout(() => {
      if (!hasInteracted) setShowTypewriter(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [hasInteracted, response, suggestions, isVoiceSession, isTranscribing]);

  useEffect(() => {
    const idleTimer = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      if (response || suggestions.length > 0 || isVoiceSession || isTranscribing) return;

      if (idle > 10000 && hasInteracted && !isLoading) {
        setShowTypewriter(true);
      }
    }, 2000);

    return () => clearInterval(idleTimer);
  }, [lastActivityTime, hasInteracted, isLoading, response, suggestions, isVoiceSession, isTranscribing]);

  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      const shouldShow =
        (response || suggestions.length > 0) && !isLoading && idle > 10000 && !isVoiceSession && !isTranscribing;

      setShowExpandedSuggestions(shouldShow);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivityTime, response, suggestions, isLoading, isVoiceSession, isTranscribing]);

  useEffect(() => {
    if (!showTypewriter || isVoiceSession || isTranscribing) {
      if (suggestionPhase !== "blurringOut") {
        setSuggestionPhase("hidden");
      }
      return;
    }

    if (!fullText) {
      setFullText(rotatingSuggestions[suggestionIndexRef.current]);
    }

    setSuggestionPhase("emerging");

    const emergeTimer = setTimeout(() => setSuggestionPhase("visible"), 800);
    const interval = setInterval(() => {
      setSuggestionPhase("retreating");

      setTimeout(() => {
        suggestionIndexRef.current = (suggestionIndexRef.current + 1) % rotatingSuggestions.length;
        setFullText(rotatingSuggestions[suggestionIndexRef.current]);
        setSuggestionPhase("emerging");
        setTimeout(() => setSuggestionPhase("visible"), 800);
      }, 700);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearTimeout(emergeTimer);
    };
  }, [showTypewriter, rotatingSuggestions, fullText, isVoiceSession, isTranscribing]);

  /* =======================================================
     STOP AUDIO
     ======================================================= */

  const stopAudioOnly = useCallback(() => {
    speakTokenRef.current += 1;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch {
        /* noop */
      }
    }

    activeUtteranceRef.current = null;

    if (hostedAudioRef.current) {
      try {
        hostedAudioRef.current.pause();
        hostedAudioRef.current.currentTime = 0;
      } catch {
        /* noop */
      }
      hostedAudioRef.current = null;
    }

    if (hostedObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(hostedObjectUrlRef.current);
      } catch {
        /* noop */
      }
      hostedObjectUrlRef.current = null;
    }

    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.onended = null;
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      currentSourceNodeRef.current = null;
    }

    if (analyserDestinationConnectedRef.current && analyserRef.current && analyserMonitorRef.current) {
      try {
        analyserRef.current.disconnect(analyserMonitorRef.current);
      } catch {
        /* noop */
      }

      try {
        analyserMonitorRef.current.disconnect();
      } catch {
        /* noop */
      }

      analyserDestinationConnectedRef.current = false;
    }

    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  /* =======================================================
     NATIVE BROWSER TTS
     ======================================================= */

  const getAvailableVoice = useCallback((synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice | null> => {
    return new Promise((resolve) => {
      const pickVoice = () => {
        const voices = synthesis.getVoices() || [];
        if (!voices.length) return null;

        return (
          voices.find((voice) => voice.localService && /^en(-|_)/i.test(voice.lang)) ||
          voices.find((voice) => /^en(-|_)/i.test(voice.lang)) ||
          voices.find((voice) => voice.localService) ||
          voices[0] ||
          null
        );
      };

      const immediate = pickVoice();
      if (immediate) {
        resolve(immediate);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          synthesis.removeEventListener("voiceschanged", finish);
        } catch {
          /* noop */
        }
        resolve(pickVoice());
      };

      const timeout = setTimeout(finish, 1200);

      try {
        synthesis.addEventListener("voiceschanged", finish, { once: true });
      } catch {
        /* fallback */
      }
    });
  }, []);

  const speakWithBrowserTTS = useCallback(
    async (fullTextToSpeak: string, token: number): Promise<boolean> => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || !fullTextToSpeak.trim()) {
        return false;
      }

      const synthesis = window.speechSynthesis;
      if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
        return false;
      }

      const isAndroid = isAndroidRef.current;

      /* ANDROID LOCAL CHUNKING */
      if (isAndroid) {
        const cleanText = fullTextToSpeak.replace(/\s+/g, " ").trim();
        const chunks = cleanText
          .split(/(?<=[.!?])\s+/)
          .flatMap((sentence) => {
            if (sentence.length <= 180) return [sentence];

            const words = sentence.split(/\s+/);
            const result: string[] = [];
            let current = "";

            for (const word of words) {
              const candidate = current ? `${current} ${word}` : word;
              if (candidate.length > 180 && current) {
                result.push(current);
                current = word;
              } else {
                current = candidate;
              }
            }

            if (current) result.push(current);
            return result;
          })
          .filter(Boolean);

        if (!chunks.length) return false;

        const preferredVoice = await getAvailableVoice(synthesis);
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
          return false;
        }

        for (let index = 0; index < chunks.length; index++) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return false;
          }

          const chunk = chunks[index];

          const didSpeak = await new Promise<boolean>((resolve) => {
            let settled = false;
            let timer: ReturnType<typeof setTimeout> | null = null;
            let retryTimer: ReturnType<typeof setTimeout> | null = null;
            let attempt = 0;

            const cleanup = () => {
              if (timer) clearTimeout(timer);
              if (retryTimer) clearTimeout(retryTimer);
              activeUtteranceRef.current = null;
            };

            const finish = (success: boolean) => {
              if (settled) return;
              settled = true;
              cleanup();
              resolve(success);
            };

            const speakAttempt = () => {
              if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
                finish(false);
                return;
              }

              const utterance = new SpeechSynthesisUtterance(chunk);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              utterance.volume = 1.0;

              if (attempt === 0 && preferredVoice) {
                utterance.voice = preferredVoice;
                utterance.lang = preferredVoice.lang || "en-IN";
              } else {
                utterance.lang = "en-IN";
              }

              activeUtteranceRef.current = utterance;

              utterance.onstart = () => {
                if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
                  try {
                    synthesis.cancel();
                  } catch {
                    /* noop */
                  }
                  finish(false);
                  return;
                }
                isSpeakingRef.current = true;
                setIsSpeaking(true);
              };

              utterance.onend = () => {
                isSpeakingRef.current = false;
                setIsSpeaking(false);
                finish(true);
              };

              utterance.onerror = (event: any) => {
                isSpeakingRef.current = false;
                setIsSpeaking(false);

                if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
                  finish(false);
                  return;
                }

                if (attempt === 0 && event?.error !== "not-allowed") {
                  attempt = 1;
                  cleanup();

                  retryTimer = setTimeout(() => {
                    try {
                      synthesis.cancel();
                      synthesis.resume();
                    } catch {
                      /* noop */
                    }
                    speakAttempt();
                  }, 100);
                  return;
                }

                finish(false);
              };

              try {
                synthesis.cancel();
                synthesis.resume();
                synthesis.speak(utterance);

                timer = setTimeout(
                  () => {
                    if (!settled && attempt === 0) {
                      attempt = 1;
                      cleanup();
                      try {
                        synthesis.cancel();
                      } catch {
                        /* noop */
                      }
                      retryTimer = setTimeout(() => speakAttempt(), 120);
                      return;
                    }
                    finish(false);
                  },
                  Math.max(12000, chunk.length * 220),
                );
              } catch {
                if (attempt === 0) {
                  attempt = 1;
                  retryTimer = setTimeout(() => speakAttempt(), 120);
                } else {
                  finish(false);
                }
              }
            };

            speakAttempt();
          });

          if (!didSpeak) return false;

          if (index < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 70));
          }
        }

        return true;
      }

      /* iOS / DESKTOP (WINDOWS & MAC) PATH */
      const preferredVoice = await getAvailableVoice(synthesis);
      if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
        return false;
      }

      return new Promise<boolean>((resolve) => {
        let settled = false;
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;
        let resumeTimer: ReturnType<typeof setInterval> | null = null;

        const cleanup = () => {
          if (safetyTimer) clearTimeout(safetyTimer);
          if (resumeTimer) clearInterval(resumeTimer);
          activeUtteranceRef.current = null;
        };

        const finish = (success: boolean) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(success);
        };

        const utterance = new SpeechSynthesisUtterance(fullTextToSpeak);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang || "en-US";
        } else {
          utterance.lang = "en-US";
        }

        activeUtteranceRef.current = utterance;

        utterance.onstart = () => {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            try {
              synthesis.cancel();
            } catch {
              /* noop */
            }
            finish(false);
            return;
          }
          isSpeakingRef.current = true;
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          finish(true);
        };

        utterance.onerror = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          finish(false);
        };

        try {
          synthesis.cancel();
          synthesis.resume();
          synthesis.speak(utterance);

          // Prevent Chromium voice queue freeze on Windows & Mac
          resumeTimer = setInterval(() => {
            if (!settled && token === speakTokenRef.current && isVoiceSessionRef.current) {
              try {
                synthesis.resume();
              } catch {
                /* noop */
              }
            }
          }, 900);

          safetyTimer = setTimeout(() => finish(true), Math.max(10000, fullTextToSpeak.length * 180));
        } catch {
          finish(false);
        }
      });
    },
    [getAvailableVoice],
  );

  const playHostedAudioOnAndroid = useCallback(
    async (audioBytes: ArrayBuffer, token: number): Promise<boolean> => {
      if (!isAndroidRef.current || typeof window === "undefined") return false;
      if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

      if (isXiaomiRef.current) {
        try {
          const { ctx, analyser } = getAudioContext();
          if (ctx.state === "suspended") await ctx.resume();

          const decoded = await decodeAudioDataSafe(ctx, audioBytes.slice(0));
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

          return await new Promise<boolean>((resolve) => {
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.playbackRate.value = 1;
            currentSourceNodeRef.current = source;

            const monitor = analyserMonitorRef.current;
            if (monitor && !analyserDestinationConnectedRef.current) {
              try {
                analyser.connect(monitor);
                monitor.connect(ctx.destination);
                analyserDestinationConnectedRef.current = true;
              } catch {
                /* noop */
              }
            }

            source.connect(analyser);
            isSpeakingRef.current = true;
            setIsSpeaking(true);

            let settled = false;
            const finish = (success: boolean) => {
              if (settled) return;
              settled = true;
              source.onended = null;
              if (currentSourceNodeRef.current === source) currentSourceNodeRef.current = null;
              try {
                source.disconnect();
              } catch {
                /* noop */
              }
              isSpeakingRef.current = false;
              setIsSpeaking(false);
              resolve(success);
            };

            source.onended = () => finish(true);

            try {
              source.start(0);
            } catch {
              finish(false);
            }
          });
        } catch (error) {
          console.warn("Xiaomi Web Audio TTS playback failed; falling back:", error);
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        }
      }

      try {
        const blob = new Blob([audioBytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        hostedObjectUrlRef.current = url;

        const audio = androidPlaybackAudioRef.current ?? new Audio();
        audio.preload = "auto";
        (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        audio.src = url;
        audio.currentTime = 0;
        hostedAudioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            audio.onended = null;
            audio.onerror = null;
            if (error) reject(error);
            else resolve();
          };

          audio.onended = () => finish();
          audio.onerror = () => finish(new Error("Android hosted TTS playback failed"));

          isSpeakingRef.current = true;
          setIsSpeaking(true);

          const playPromise = audio.play();
          if (playPromise) {
            playPromise.catch((error) => finish(error instanceof Error ? error : new Error("Playback blocked")));
          }
        });

        isSpeakingRef.current = false;
        setIsSpeaking(false);
        return token === speakTokenRef.current;
      } catch {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        return false;
      } finally {
        hostedAudioRef.current = null;

        if (hostedObjectUrlRef.current) {
          try {
            URL.revokeObjectURL(hostedObjectUrlRef.current);
          } catch {
            /* noop */
          }
          hostedObjectUrlRef.current = null;
        }

        if (androidPlaybackAudioRef.current) {
          try {
            androidPlaybackAudioRef.current.pause();
            androidPlaybackAudioRef.current.removeAttribute("src");
            androidPlaybackAudioRef.current.load();
          } catch {
            /* noop */
          }
        }
      }
    },
    [getAudioContext],
  );

  /* =======================================================
     HOSTED TTS WITH CLEAN LOCAL FALLBACK
     ======================================================= */

  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudioOnly();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
        recognitionRef.current = null;
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      transcriptRef.current = "";
      setIsListening(false);

      const token = ++speakTokenRef.current;
      const clean = raw
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^\s{0,3}#{1,6}\s*/gm, "")
        .replace(/^\s{0,3}>\s?/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      if (!clean) {
        if (isVoiceSessionRef.current) {
          void startListeningContinuousRef.current?.();
        }
        return;
      }

      const sentences = clean
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      let audioGraph: { ctx: AudioContext; analyser: AnalyserNode } | null = null;
      let hostedTtsFailed = false;

      const disconnectMicForPlayback = () => {
        if (micSourceRef.current) {
          try {
            micSourceRef.current.disconnect();
          } catch {
            /* noop */
          }
        }
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
      };

      const reconnectMicAfterPlayback = () => {
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
        }
        if (!micSourceRef.current || !analyserRef.current) return;
        try {
          micSourceRef.current.connect(analyserRef.current);
        } catch {
          /* Already connected */
        }
      };

      const fetchAudioBuffer = async (sentence: string): Promise<AudioBuffer | null> => {
        if (hostedTtsFailed) return null;

        try {
          const res = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ text: sentence }),
          });

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            if (res.status === 429) rememberTtsQuotaLimit(body);
            hostedTtsFailed = true;
            return null;
          }

          const contentType = res.headers.get("content-type") || "";
          const arrayBuffer = await res.arrayBuffer();

          if (!arrayBuffer.byteLength || /application\/(json|text)/i.test(contentType)) {
            hostedTtsFailed = true;
            return null;
          }

          if (isAndroidRef.current) {
            const played = await playHostedAudioOnAndroid(arrayBuffer, token);
            if (played) return { __androidPlayed: true } as any;
            hostedTtsFailed = true;
            return null;
          }

          audioGraph ??= getAudioContext();
          if (audioGraph.ctx.state === "suspended") {
            await audioGraph.ctx.resume();
          }

          try {
            return await decodeAudioDataSafe(audioGraph.ctx, arrayBuffer.slice(0));
          } catch {
            hostedTtsFailed = true;
            return null;
          }
        } catch {
          hostedTtsFailed = true;
          return null;
        }
      };

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      try {
        for (let i = 0; i < sentences.length; i++) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return;
          }

          const buffer = await fetchAudioBuffer(sentences[i]);

          if (!buffer) {
            disconnectMicForPlayback();
            isSpeakingRef.current = true;
            setIsSpeaking(true);

            const remainingCombined = sentences.slice(i).join(" ");
            await speakWithBrowserTTS(remainingCombined, token);
            return;
          }

          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return;
          }

          if (isAndroidRef.current && (buffer as any)?.__androidPlayed) {
            continue;
          }

          disconnectMicForPlayback();
          isSpeakingRef.current = true;
          setIsSpeaking(true);

          await new Promise<void>((resolve) => {
            if (!audioGraph) {
              resolve();
              return;
            }

            if (audioGraph.ctx.state === "suspended") {
              void audioGraph.ctx.resume();
            }

            const source = audioGraph.ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = 1.0;

            const monitor = analyserMonitorRef.current;
            if (monitor) {
              try {
                if (!analyserDestinationConnectedRef.current) {
                  audioGraph.analyser.connect(monitor);
                  monitor.connect(audioGraph.ctx.destination);
                  analyserDestinationConnectedRef.current = true;
                }
              } catch {
                /* Graph may already be connected */
              }
            }

            source.connect(audioGraph.analyser);
            currentSourceNodeRef.current = source;

            const finish = () => {
              if (currentSourceNodeRef.current === source) {
                currentSourceNodeRef.current = null;
              }
              resolve();
            };

            source.onended = finish;
            try {
              source.start(0);
            } catch {
              finish();
            }
          });
        }
      } catch (err) {
        console.warn("TTS playback error:", err);
      } finally {
        if (token === speakTokenRef.current) {
          currentSourceNodeRef.current = null;

          if (analyserDestinationConnectedRef.current && analyserRef.current && analyserMonitorRef.current) {
            try {
              analyserRef.current.disconnect(analyserMonitorRef.current);
            } catch {
              /* noop */
            }

            try {
              analyserMonitorRef.current.disconnect();
            } catch {
              /* noop */
            }

            analyserDestinationConnectedRef.current = false;
          }

          isSpeakingRef.current = false;
          setIsSpeaking(false);

          if (isVoiceSessionRef.current) {
            setTimeout(() => {
              if (isVoiceSessionRef.current && !isLoadingRef.current && !isSpeakingRef.current) {
                transcriptRef.current = "";
                reconnectMicAfterPlayback();
                void startListeningContinuousRef.current?.();
              }
            }, 600);
          } else {
            reconnectMicAfterPlayback();
          }
        }
      }
    },
    [getAudioContext, playHostedAudioOnAndroid, speakWithBrowserTTS, stopAudioOnly],
  );

  /* =======================================================
     TRANSCRIPTION API
     ======================================================= */

  const requestTranscription = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    const mime = (audioBlob.type || "").toLowerCase();
    const extension =
      mime.includes("mp4") || mime.includes("m4a")
        ? "mp4"
        : mime.includes("ogg")
          ? "ogg"
          : mime.includes("mpeg") || mime.includes("mp3")
            ? "mp3"
            : mime.includes("wav")
              ? "wav"
              : mime.includes("aac")
                ? "aac"
                : "webm";

    formData.append("audio", audioBlob, `gdx-transcribe.${extension}`);
    formData.append("language", "en-IN");

    const res = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Transcription failed (${res.status})${body ? `: ${body}` : ""}`);
    }

    const contentType = res.headers.get("content-type") || "";
    const result = contentType.includes("application/json") ? await res.json() : { text: await res.text() };

    return String(result?.text ?? result?.transcript ?? result?.data?.text ?? result?.data?.transcript ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const getSupportedRecordingMimeType = useCallback(() => {
    if (typeof MediaRecorder === "undefined") return "";

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg", "audio/aac"];

    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
  }, []);

  /* =======================================================
     CONTINUOUS SPEECH RECOGNITION (VOICE AGENT)
     ======================================================= */

  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current || isSpeakingRef.current) return;

    const generation = ++recognitionGenerationRef.current;

    /* XIAOMI HARDWARE COMPATIBILITY */
    if (isXiaomiRef.current) {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        console.warn("Xiaomi audio recording is not supported in this browser.");
        stopVoiceSessionRef.current?.();
        return;
      }

      try {
        const { ctx, analyser } = getAudioContext();
        if (ctx.state === "suspended") await ctx.resume();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current || isSpeakingRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        micStreamRef.current = stream;
        if (micSourceRef.current) {
          try {
            micSourceRef.current.disconnect();
          } catch {
            /* noop */
          }
        }
        micSourceRef.current = ctx.createMediaStreamSource(stream);
        try {
          micSourceRef.current.connect(analyser);
        } catch {
          /* noop */
        }

        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
        const supportedMime = candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
        androidRecordingMimeTypeRef.current = supportedMime || "audio/webm";
        androidRecordedChunksRef.current = [];

        const recorder = supportedMime
          ? new MediaRecorder(stream, { mimeType: supportedMime })
          : new MediaRecorder(stream);

        androidRecorderRef.current = recorder;

        androidRecordingPromiseRef.current = new Promise<Blob>((resolve, reject) => {
          recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data && event.data.size > 0) androidRecordedChunksRef.current.push(event.data);
          };
          recorder.onerror = () => reject(new Error("Xiaomi voice recording failed."));
          recorder.onstop = () => {
            const type = recorder.mimeType || androidRecordingMimeTypeRef.current || "audio/webm";
            const blob = new Blob(androidRecordedChunksRef.current, { type });
            androidRecordedChunksRef.current = [];
            androidRecorderRef.current = null;
            if (!blob.size) {
              reject(new Error("No voice audio was recorded."));
              return;
            }
            resolve(blob);
          };
        });

        setIsListening(true);
        recorder.start();

        const data = new Uint8Array(analyser.fftSize);
        let heardSpeech = false;
        let lastSpeechAt = performance.now();
        let monitorTimer: ReturnType<typeof setInterval> | null = null;

        const stopSegment = async () => {
          if (monitorTimer) {
            clearInterval(monitorTimer);
            monitorTimer = null;
          }
          if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current || isSpeakingRef.current) {
            return;
          }

          try {
            recorder.requestData?.();
          } catch {
            /* noop */
          }
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            /* noop */
          }

          let blob: Blob | null = null;
          try {
            blob = androidRecordingPromiseRef.current ? await androidRecordingPromiseRef.current : null;
          } catch (error) {
            console.warn("Xiaomi recording finalization failed:", error);
          }
          androidRecordingPromiseRef.current = null;

          if (!blob || !blob.size || generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current) {
            return;
          }

          try {
            const transcript = await requestTranscription(blob);
            if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current) return;
            if (transcript) {
              setIsListening(false);
              handleSubmitRef.current?.(undefined, transcript, true);
              return;
            }
          } catch (error) {
            console.warn("Xiaomi voice transcription failed:", error);
          }

          if (
            generation === recognitionGenerationRef.current &&
            isVoiceSessionRef.current &&
            !isSpeakingRef.current &&
            !isLoadingRef.current
          ) {
            setTimeout(() => {
              if (
                generation === recognitionGenerationRef.current &&
                isVoiceSessionRef.current &&
                !isSpeakingRef.current
              ) {
                void startListeningContinuousRef.current?.();
              }
            }, 150);
          }
        };

        monitorTimer = setInterval(() => {
          if (
            generation !== recognitionGenerationRef.current ||
            !isVoiceSessionRef.current ||
            isSpeakingRef.current ||
            isLoadingRef.current
          ) {
            if (monitorTimer) clearInterval(monitorTimer);
            monitorTimer = null;
            return;
          }

          analyser.getByteTimeDomainData(data);
          let sumSquares = 0;
          for (let i = 0; i < data.length; i++) {
            const normalized = (data[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }

          const rms = Math.sqrt(sumSquares / data.length);
          const now = performance.now();

          if (rms > 0.024) {
            heardSpeech = true;
            lastSpeechAt = now;
          } else if (heardSpeech && now - lastSpeechAt > 2200) {
            void stopSegment();
          }
        }, 100);
      } catch (error) {
        console.warn("Xiaomi voice setup failed:", error);
        if (generation === recognitionGenerationRef.current) stopVoiceSessionRef.current?.();
      }

      return;
    }

    /* STANDARD RECOGNITION (IOS, ANDROID CHROME, MACOS, WINDOWS) */
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      stopVoiceSessionRef.current?.();
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }

    if (!isVoiceSessionRef.current) return;

    try {
      setIsListening(true);

      // On Android and iOS WebKit, avoid dual mic locking between getUserMedia
      // and native speech recognition. Desktop Web Audio connects normally.
      const isMobile =
        isAndroidRef.current ||
        (typeof navigator !== "undefined" &&
          (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)));

      if (!isMobile) {
        const { ctx, analyser } = getAudioContext();

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        if (!micStreamRef.current) {
          micStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }

        if (!micSourceRef.current && micStreamRef.current) {
          micSourceRef.current = ctx.createMediaStreamSource(micStreamRef.current);
        }

        if (micSourceRef.current) {
          try {
            micSourceRef.current.connect(analyser);
          } catch {
            /* Already connected */
          }
        }
      }
    } catch (error) {
      console.warn("Microphone setup warning:", error);
      if (!isVoiceSessionRef.current) return;
    }

    if (!isVoiceSessionRef.current || generation !== recognitionGenerationRef.current) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = !isAndroidRef.current;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    transcriptRef.current = "";

    const clearSilenceTimer = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    const submitTranscript = () => {
      clearSilenceTimer();

      if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current) {
        return;
      }

      if (isLoadingRef.current || isSpeakingRef.current) {
        return;
      }

      const text = transcriptRef.current.trim();
      if (!text) return;

      transcriptRef.current = "";
      setIsListening(false);

      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        /* noop */
      }

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      handleSubmitRef.current?.(undefined, text, true);
    };

    recognition.onstart = () => {
      if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current || isSpeakingRef.current) {
        try {
          recognition.stop();
        } catch {
          /* noop */
        }
        return;
      }

      setIsListening(true);
      transcriptRef.current = "";
    };

    recognition.onresult = (event: any) => {
      if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current || isSpeakingRef.current) {
        return;
      }

      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || "";
      }

      transcriptRef.current = transcript;
      clearSilenceTimer();

      if (transcript.trim()) {
        silenceTimerRef.current = setTimeout(submitTranscript, 1400);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopVoiceSessionRef.current?.();
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();

      if (
        generation !== recognitionGenerationRef.current ||
        !isVoiceSessionRef.current ||
        isLoadingRef.current ||
        isSpeakingRef.current
      ) {
        return;
      }

      const text = transcriptRef.current.trim();
      if (text) {
        submitTranscript();
        return;
      }

      requestAnimationFrame(() => {
        if (
          generation === recognitionGenerationRef.current &&
          isVoiceSessionRef.current &&
          !isLoadingRef.current &&
          !isSpeakingRef.current &&
          recognitionRef.current === recognition
        ) {
          try {
            recognition.start();
          } catch {
            /* Browser may already be restarting */
          }
        }
      });
    };

    try {
      recognition.start();
    } catch {
      /* Handled gracefully */
    }
  }, [getAudioContext, requestTranscription]);

  startListeningContinuousRef.current = startListeningContinuous;

  /* =======================================================
     STOP VOICE SESSION (AGENT)
     ======================================================= */

  const stopVoiceSession = useCallback(() => {
    isVoiceSessionRef.current = false;
    recognitionGenerationRef.current += 1;

    setIsVoiceSession(false);
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }

    transcriptRef.current = "";

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      micSourceRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    stopAudioOnly();
  }, [stopAudioOnly]);

  stopVoiceSessionRef.current = stopVoiceSession;

  /* =======================================================
     START VOICE SESSION (AGENT)
     ======================================================= */

  const startVoiceSession = useCallback(() => {
    if (isLoading) return;

    if (isTranscribing) {
      stopTranscribeRef.current?.();
    }

    isVoiceSessionRef.current = true;
    setIsVoiceSession(true);

    primeMobileAudioSession();
    setResponse(null);
    setSuggestions([]);
    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);

    void startListeningContinuousRef.current?.();
  }, [isLoading, isTranscribing, primeMobileAudioSession, dismissSuggestionBubble]);

  /* =======================================================
     TRANSCRIBE (SPEECH TO TEXT)
     ======================================================= */

  const stopTranscribe = useCallback(() => {
    transcribeManualStopRef.current = true;
    transcribeGenerationRef.current += 1;
    isTranscribingRef.current = false;

    setIsTranscribing(false);
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (transcribeRecorderRef.current) {
      try {
        transcribeRecorderRef.current.ondataavailable = null;
        transcribeRecorderRef.current.onerror = null;
        transcribeRecorderRef.current.onstop = null;
        if (transcribeRecorderRef.current.state !== "inactive") transcribeRecorderRef.current.stop();
      } catch {
        /* noop */
      }
      transcribeRecorderRef.current = null;
    }
    transcribeRecordingPromiseRef.current = null;
    transcribeChunksRef.current = [];
    transcribeMimeTypeRef.current = "";

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      micSourceRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    transcribeTranscriptRef.current = "";
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  stopTranscribeRef.current = stopTranscribe;

  const finishAndroidTranscription = useCallback(async () => {
    if (!isAndroidRef.current || !isTranscribingRef.current) return;

    transcribeManualStopRef.current = true;
    isTranscribingRef.current = false;
    setIsTranscribing(false);
    setIsListening(false);

    const recorder = transcribeRecorderRef.current;
    if (!recorder) {
      playTranscribeTone("done");
      return;
    }

    try {
      recorder.requestData?.();
    } catch {
      /* noop */
    }

    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* noop */
    }

    let blob: Blob | null = null;
    try {
      blob = transcribeRecordingPromiseRef.current ? await transcribeRecordingPromiseRef.current : null;
    } catch (error) {
      console.warn("Android recording finalization failed:", error);
    }

    transcribeRecordingPromiseRef.current = null;
    transcribeRecorderRef.current = null;

    try {
      if (!blob || !blob.size) {
        playTranscribeTone("done");
        alert("I couldn't capture that recording. Please try again.");
        return;
      }

      const transcript = await requestTranscription(blob);
      setQuery(transcript);
      playTranscribeTone("done");
    } catch (error) {
      console.warn("Android transcription request failed:", error);
      playTranscribeTone("done");
      alert("I couldn't transcribe that recording. Please try again.");
    } finally {
      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {
          /* noop */
        }
        micSourceRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      transcribeChunksRef.current = [];
      transcribeMimeTypeRef.current = "";
      transcribeTranscriptRef.current = "";
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [playTranscribeTone, requestTranscription]);

  const finishIosTranscription = useCallback(() => {
    if (isAndroidRef.current || !isTranscribingRef.current) return;

    transcribeManualStopRef.current = true;
    isTranscribingRef.current = false;
    setIsTranscribing(false);
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const text = transcribeTranscriptRef.current.trim();

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    setQuery(text);
    transcribeTranscriptRef.current = "";
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const startTranscribe = useCallback(async () => {
    if (isLoading) return;

    if (isVoiceSessionRef.current) stopVoiceSession();

    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
    setQuery("");

    transcribeManualStopRef.current = false;
    transcribeTranscriptRef.current = "";
    transcribeChunksRef.current = [];
    transcribeRecordingPromiseRef.current = null;
    transcribeGenerationRef.current += 1;

    try {
      primeMobileAudioSession();

      const { ctx, analyser } = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Microphone access is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {
          /* noop */
        }
      }
      micSourceRef.current = ctx.createMediaStreamSource(stream);
      try {
        micSourceRef.current.connect(analyser);
      } catch {
        /* noop */
      }

      setIsTranscribing(true);
      isTranscribingRef.current = true;
      setIsListening(true);

      if (isAndroidRef.current) {
        if (typeof MediaRecorder === "undefined") {
          stopTranscribe();
          alert("Audio recording is not supported on this Android browser.");
          return;
        }

        const supportedMime = getSupportedRecordingMimeType();
        transcribeMimeTypeRef.current = supportedMime || "audio/webm";

        const recorder = supportedMime
          ? new MediaRecorder(stream, { mimeType: supportedMime })
          : new MediaRecorder(stream);

        transcribeRecorderRef.current = recorder;
        transcribeRecordingPromiseRef.current = new Promise<Blob>((resolve, reject) => {
          recorder.ondataavailable = (event: BlobEvent) => {
            if (event.data && event.data.size > 0) transcribeChunksRef.current.push(event.data);
          };
          recorder.onerror = () => reject(new Error("Voice recording failed."));
          recorder.onstop = () => {
            const type = recorder.mimeType || transcribeMimeTypeRef.current || "audio/webm";
            const blob = new Blob(transcribeChunksRef.current, { type });
            if (!blob.size) reject(new Error("No voice audio was recorded."));
            else resolve(blob);
          };
        });

        playTranscribeTone("start");
        recorder.start();
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        stopTranscribe();
        alert("Speech recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        if (isTranscribingRef.current && !transcribeManualStopRef.current) setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (!isTranscribingRef.current || transcribeManualStopRef.current) return;

        let finalText = transcribeTranscriptRef.current;
        let interim = "";

        for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
          const result = event.results[i];
          const value = result?.[0]?.transcript || "";
          if (result?.isFinal) {
            finalText = `${finalText} ${value}`.replace(/\s+/g, " ").trim();
          } else {
            interim += value;
          }
        }

        transcribeTranscriptRef.current = finalText;
        const visible = `${finalText} ${interim}`.replace(/\s+/g, " ").trim();
        if (visible) setQuery(visible);
      };

      recognition.onerror = (event: any) => {
        if (transcribeManualStopRef.current || !isTranscribingRef.current) return;
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          stopTranscribe();
        }
      };

      recognition.onend = () => {
        if (!isTranscribingRef.current || transcribeManualStopRef.current) return;
        try {
          recognition.start();
        } catch {
          /* already restarting */
        }
      };

      recognition.start();
    } catch (error) {
      console.warn("Transcribe setup failed:", error);
      stopTranscribe();
    }
  }, [
    dismissSuggestionBubble,
    getAudioContext,
    getSupportedRecordingMimeType,
    isLoading,
    playTranscribeTone,
    primeMobileAudioSession,
    stopTranscribe,
    stopVoiceSession,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      recognitionGenerationRef.current += 1;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      transcribeManualStopRef.current = true;
      transcribeGenerationRef.current += 1;

      if (transcribeRecorderRef.current) {
        try {
          transcribeRecorderRef.current.ondataavailable = null;
          transcribeRecorderRef.current.onerror = null;
          transcribeRecorderRef.current.onstop = null;
          if (transcribeRecorderRef.current.state !== "inactive") transcribeRecorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
      transcribeRecorderRef.current = null;
      transcribeRecordingPromiseRef.current = null;
      transcribeChunksRef.current = [];

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
      }

      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {
          /* noop */
        }
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }

      activeUtteranceRef.current = null;

      if (hostedAudioRef.current) {
        try {
          hostedAudioRef.current.pause();
        } catch {
          /* noop */
        }
      }
      if (androidPlaybackAudioRef.current) {
        try {
          androidPlaybackAudioRef.current.pause();
          androidPlaybackAudioRef.current.removeAttribute("src");
          androidPlaybackAudioRef.current.load();
        } catch {
          /* noop */
        }
      }
      if (hostedObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(hostedObjectUrlRef.current);
        } catch {
          /* noop */
        }
      }

      if (currentSourceNodeRef.current) {
        try {
          currentSourceNodeRef.current.stop();
          currentSourceNodeRef.current.disconnect();
        } catch {
          /* noop */
        }
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleSubmit = useCallback(
    async (event?: FormEvent, customQuery?: string, fromVoice = false) => {
      event?.preventDefault();

      if (isLoadingRef.current) return;

      if (isTranscribingRef.current) {
        stopTranscribe();
      }

      const text = (customQuery ?? query).trim();
      if (!text) return;

      setHasInteracted(true);
      dismissSuggestionBubble();
      setShowExpandedSuggestions(false);

      if (!customQuery) setQuery("");

      if (!fromVoice) {
        stopVoiceSession();

        if (response || suggestions.length > 0) {
          setIsCollapsingToThink(true);
          await new Promise((resolve) => setTimeout(resolve, 500));
          setResponse(null);
          setSuggestions([]);
          await new Promise((resolve) => setTimeout(resolve, 200));
          setIsCollapsingToThink(false);
        } else {
          setResponse(null);
          setSuggestions([]);
        }
      } else {
        setIsListening(false);
      }

      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        const result = await sendChatMessage(text);
        const answer = String((result as any)?.response ?? "");
        const suggs = (result as any)?.suggestions || [];

        if (fromVoice && isVoiceSessionRef.current) {
          void speakVoiceResponse(answer);
        } else {
          setResponse(answer);
          setSuggestions(suggs);
          setIsRestoredFromStorage(false);
          onSearch?.(answer);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Try again.";

        if (fromVoice && isVoiceSessionRef.current) {
          void speakVoiceResponse(message);
        } else {
          setResponse(message);
          setSuggestions([]);
          setIsRestoredFromStorage(false);
          onSearch?.(message);
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [
      query,
      response,
      suggestions.length,
      dismissSuggestionBubble,
      stopTranscribe,
      stopVoiceSession,
      speakVoiceResponse,
      onSearch,
    ],
  );

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  /* -------------------------------------------------------
     Interaction Handlers
     ------------------------------------------------------- */

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery("");
      setHasInteracted(true);
      dismissSuggestionBubble();
      setShowExpandedSuggestions(false);
      void handleSubmit(undefined, suggestion, false);
    },
    [dismissSuggestionBubble, handleSubmit],
  );

  const handleInputFocus = useCallback(() => {
    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
  }, [dismissSuggestionBubble]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setHasInteracted(true);
      dismissSuggestionBubble();
      setShowExpandedSuggestions(false);
    },
    [dismissSuggestionBubble],
  );

  /* -------------------------------------------------------
     Outside Click Listener
     ------------------------------------------------------- */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (searchBarRef.current?.contains(target)) return;

      if (isTranscribingRef.current) {
        stopTranscribe();
        return;
      }

      if (isVoiceSessionRef.current) {
        stopVoiceSession();
        return;
      }

      const element = target as Element;
      const isNavigationClick =
        !!element?.closest &&
        (element.closest('[class*="fixed top-6"]') ||
          element.closest('[class*="fixed bottom-6 right-6"]') ||
          element.closest('button[aria-label*="Scroll to top"]') ||
          element.closest('button[aria-label*="Close modal"]'));

      if (isNavigationClick) return;

      if (query.trim() && !response && suggestions.length === 0) {
        setQuery("");
        inputRef.current?.blur();
        return;
      }

      if (response || suggestions.length > 0) {
        const COLLAPSE_MS = 1400;
        setIsCollapsing(true);
        setShowExpandedSuggestions(false);

        window.setTimeout(() => {
          setResponse(null);
          setSuggestions([]);
          setIsCollapsing(false);
          clearPersistedState();
        }, COLLAPSE_MS);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [response, suggestions, query, stopVoiceSession, stopTranscribe, clearPersistedState]);

  /* -------------------------------------------------------
     Layout Values
     ------------------------------------------------------- */

  const layoutValues = useMemo(() => {
    const hasContent = (suggestions.length > 0 || response) && !isVoiceSession && !isTranscribing;
    const isExpanded = hasContent && !isLoading;
    const targetWidth = isExpanded
      ? "min(460px, 92vw)"
      : isVoiceSession || isTranscribing
        ? "min(320px, 78vw)"
        : "min(360px, 92vw)";
    const targetRadius = isExpanded ? "16px" : "999px";

    return { isExpanded, targetWidth, targetRadius };
  }, [suggestions.length, response, isVoiceSession, isTranscribing, isLoading]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {showTypewriter && fullText && suggestionPhase !== "hidden" && !isVoiceSession && !isTranscribing && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm font-normal text-white px-4 py-2 rounded-full shadow-md whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis transition-all"
          style={{
            animation:
              suggestionPhase === "emerging"
                ? "suggestionEmerge 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                : suggestionPhase === "retreating"
                  ? "suggestionRetreat 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                  : suggestionPhase === "blurringOut"
                    ? "suggestionBlurOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                    : undefined,
          }}
        >
          {fullText}
        </div>
      )}

      <div
        className={`mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 overflow-hidden select-none ${
          isLoading ? "thinking-container" : ""
        } ${isVoiceSession || isTranscribing || isListening ? "listening-container" : ""}`}
        style={{
          width: layoutValues.targetWidth,
          maxWidth: "92vw",
          borderRadius: layoutValues.targetRadius,
          transition:
            "width 0.8s cubic-bezier(0.25, 1, 0.3, 1), border-radius 0.8s cubic-bezier(0.25, 1, 0.3, 1), background-color 0.6s ease, box-shadow 0.6s ease",
          cursor: isListening ? "default" : undefined,
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation",
        }}
      >
        <div
          className={`transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${layoutValues.isExpanded ? "p-5 pt-6" : "p-2"}`}
          style={{
            transitionDuration: "800ms",
            transitionDelay: layoutValues.isExpanded && !isRestoredFromStorage ? "600ms" : "0ms",
          }}
        >
          <Fade
            show={showExpandedSuggestions && suggestions.length > 0 && !isVoiceSession && !isTranscribing}
            duration={800}
          >
            <div
              className="flex gap-2 flex-wrap justify-center mb-3 animate-fadeIn"
              style={{ animation: "fadeIn 0.8s ease forwards" }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 bg-white/20 text-xs sm:text-sm font-normal rounded-full hover:bg-white/30 transition cursor-pointer"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Fade>

          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${
              response && !isVoiceSession && !isTranscribing
                ? isCollapsing || isCollapsingToThink
                  ? "opacity-0 mb-0"
                  : "opacity-100 mb-5"
                : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight:
                isCollapsing || isCollapsingToThink
                  ? "0px"
                  : response && !isVoiceSession && !isTranscribing
                    ? "384px"
                    : "0px",
              transitionDuration: isCollapsingToThink ? "400ms" : "1000ms",
              transitionDelay:
                response && !isCollapsing && !isCollapsingToThink && !isRestoredFromStorage ? "900ms" : "0ms",
            }}
          >
            {response && !isVoiceSession && !isTranscribing && (
              <div
                className="text-foreground text-sm leading-relaxed font-normal px-4 overflow-y-auto scrollbar-hide"
                style={{
                  animation: isRestoredFromStorage ? "none" : "fadeSlideIn 800ms cubic-bezier(0.25,1,0.3,1) both",
                  animationDelay: isRestoredFromStorage ? "0ms" : "1000ms",
                  maxHeight: "300px",
                  fontWeight: 400,
                }}
                dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
              />
            )}
          </div>

          <form
            onSubmit={(event) => handleSubmit(event, undefined, false)}
            className="flex items-center gap-2 relative min-h-[40px]"
            onFocus={handleInputFocus}
          >
            {!isVoiceSession && !isTranscribing && (
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={isLoading ? "Thinking…" : placeholderText}
                  value={query}
                  onChange={handleInputChange}
                  className={`flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base font-normal px-4 h-10 ${
                    isLoading ? "thinking-placeholder" : ""
                  }`}
                  disabled={isLoading}
                  aria-label="Ask anything"
                  style={{ fontWeight: 400 }}
                />
              </div>
            )}

            {isVoiceSession && !isTranscribing && (
              <div className="flex-1 flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession} isSpeaking={isSpeaking || isListening} />
              </div>
            )}

            {isTranscribing && (
              <div className="flex-1 flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isTranscribing} isSpeaking={isListening} />
                <RecordingTimer isActive={isTranscribing} />
              </div>
            )}

            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="End voice session"
                aria-label="End voice session"
              >
                <X className="h-4 w-4 text-white" strokeWidth={2} />
              </button>
            ) : isTranscribing ? (
              <button
                type="button"
                onClick={isAndroidRef.current ? finishAndroidTranscription : finishIosTranscription}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="Done transcribing"
                aria-label="Done transcribing"
              >
                <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={startTranscribe}
                  className="h-9 w-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Transcribe speech"
                  aria-label="Transcribe speech"
                >
                  <Mic className="h-5 w-5" strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={startVoiceSession}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0084FF] hover:bg-[#0074E8] transition-all active:scale-95 shadow-sm cursor-pointer"
                  title="Talk with GDx"
                  aria-label="Talk with GDx"
                >
                  <ChatGPTWaveformIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes delayedFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease forwards;
        }

        .animate-delayedFadeIn {
          animation: delayedFadeIn 1s ease forwards;
          animation-delay: 0.1s;
        }

        .thinking-container {
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          animation: glowPulse 2s infinite ease-in-out;
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow:
              0 0 5px rgba(255,255,255,0.1),
              inset 0 0 10px rgba(255,255,255,0.05);
          }
          50% {
            box-shadow:
              0 0 20px rgba(255,255,255,0.3),
              inset 0 0 20px rgba(255,255,255,0.15);
          }
        }

        @keyframes textGlow {
          0%, 100% {
            color: rgba(255,255,255,0.3);
            text-shadow: 0 0 1px rgba(255,255,255,0.2);
          }
          50% {
            color: rgba(255,255,255,0.8);
            text-shadow: 0 0 3px rgba(255,255,255,0.6);
          }
        }

        .thinking-placeholder::placeholder {
          color: rgba(255,255,255,0.6);
          animation: textGlow 2s infinite ease-in-out;
          font-weight: 400;
        }

        .thinking-placeholder[disabled] {
          caret-color: transparent;
        }

        .inline-code {
          background: rgba(255,255,255,.04);
          padding: .05rem .25rem;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace;
          font-size: .9em;
          font-weight: 400;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .typewriter-cursor {
          display: inline-block;
          animation: blink 1s infinite;
          margin-left: 2px;
          font-weight: 400;
        }

        .typewriter-text {
          display: inline-block;
          min-height: 1.2em;
          font-weight: 400;
        }

        .listening-container {
          border: 1px solid rgba(255,255,255,0.3);
          animation: listeningGlow 1.5s infinite ease-in-out;
        }

        @keyframes listeningGlow {
          0%, 100% {
            box-shadow:
              0 0 8px rgba(255,255,255,0.15),
              inset 0 0 12px rgba(255,255,255,0.08);
          }
          50% {
            box-shadow:
              0 0 25px rgba(255,255,255,0.4),
              inset 0 0 25px rgba(255,255,255,0.2);
          }
        }

        .listening-input {
          color: transparent;
        }

        @keyframes suggestionEmerge {
          0% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0) scale(1);
          }
        }

        @keyframes suggestionRetreat {
          0% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            filter: blur(8px);
            transform: translateY(-8px) scale(0.96);
          }
        }

        @keyframes suggestionBlurOut {
          0% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            filter: blur(12px);
            transform: translateY(8px) scale(0.94);
          }
        }

        input,
        button {
          font-weight: 400;
        }

        strong,
        h1,
        h2,
        h3 {
          font-weight: 400;
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
