"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Mic, Check, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* =========================================================
   0. TTS CONFIG
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

const TTS_QUOTA_BLOCK_KEY = "gdx_tts_quota_blocked_until";
const TTS_QUOTA_FALLBACK_MS = 24 * 60 * 60 * 1000;
const TTS_KNOWN_PROVIDER_RESET_AT = 0;

const getTtsQuotaBlockedUntil = (): number => {
  if (typeof window === "undefined") return 0;

  const knownProviderBlock = 0;

  try {
    const value = Number(window.localStorage.getItem(TTS_QUOTA_BLOCK_KEY));

    if (Number.isFinite(value) && value > Date.now()) {
      return Math.max(value, knownProviderBlock);
    }

    window.localStorage.removeItem(TTS_QUOTA_BLOCK_KEY);
  } catch {
    /* Storage may be unavailable. */
  }

  return knownProviderBlock;
};

const rememberTtsQuotaLimit = (responseBody: string) => {
  const resetMatch = responseBody.match(/X-RateLimit-Reset[^0-9]*(\d{10,13})/i);
  const parsedReset = resetMatch ? Number(resetMatch[1]) : 0;
  const resetAt =
    Number.isFinite(parsedReset) && parsedReset > Date.now() ? parsedReset : Date.now() + TTS_QUOTA_FALLBACK_MS;

  try {
    window.localStorage.setItem(TTS_QUOTA_BLOCK_KEY, String(resetAt));
  } catch {
    /* In-flight fallback still works. */
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
   2. MARKDOWN → HTML
   ========================================================= */

const convertMarkdownToHtml = (text: string): string => {
  const processInline = (str: string): string => {
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
        pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
        replacement:
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>',
      },
    ];

    rules.forEach((rule) => {
      str = str.replace(rule.pattern, rule.replacement);
    });

    return str;
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
   4. REACTIVE WAVEFORM
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

  useEffect(() => {
    if (!isActive || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_WIDTH = 2;
    const BAR_GAP = 2;
    const MIN_HEIGHT = 3;

    let bufferLength = 0;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      analyser.minDecibels = -86;
      analyser.maxDecibels = -12;

      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
    }

    let lastTime = performance.now();

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.max(1, Math.round(rect.width * dpr));
      const targetHeight = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      const barCount = Math.max(8, Math.floor(rect.width / (BAR_WIDTH + BAR_GAP)));
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

    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(containerRef.current);

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = rect.width;
      const h = rect.height;

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
   6. SEARCH BAR MAIN COMPONENT
   ========================================================= */

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const STORAGE_KEY = "searchbar_state";

  /* -------------------------------------------------------
     Persisted state
     ------------------------------------------------------- */

  const loadPersistedState = useCallback(() => {
    try {
      const navigation = window.performance?.getEntriesByType("navigation")?.[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isPageRefresh = (window.performance as any)?.navigation?.type === 1 || navigation?.type === "reload";

      if (isPageRefresh) {
        localStorage.removeItem(STORAGE_KEY);
        return {
          response: null,
          suggestions: [],
          hasInteracted: false,
          showExpandedSuggestions: false,
          lastActivityTime: Date.now(),
        };
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          response: parsed.response || null,
          suggestions: parsed.suggestions || [],
          hasInteracted: parsed.hasInteracted || false,
          showExpandedSuggestions: parsed.showExpandedSuggestions || false,
          lastActivityTime: parsed.lastActivityTime || Date.now(),
        };
      }
    } catch (error) {
      console.warn("Failed to load persisted search state:", error);
    }

    return {
      response: null,
      suggestions: [],
      hasInteracted: false,
      showExpandedSuggestions: false,
      lastActivityTime: Date.now(),
    };
  }, []);

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

  const persistedState = useMemo(() => loadPersistedState(), [loadPersistedState]);

  /* -------------------------------------------------------
     UI state
     ------------------------------------------------------- */

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(persistedState.response);
  const [suggestions, setSuggestions] = useState<string[]>(persistedState.suggestions);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [suggestionPhase, setSuggestionPhase] = useState<
    "emerging" | "visible" | "retreating" | "blurringOut" | "hidden"
  >("hidden");
  const [fullText, setFullText] = useState("");
  const suggestionIndexRef = useRef(0);
  const [hasInteracted, setHasInteracted] = useState(persistedState.hasInteracted);
  const [lastActivityTime, setLastActivityTime] = useState(persistedState.lastActivityTime);
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(persistedState.showExpandedSuggestions);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(!!persistedState.response);
  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);

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

  useEffect(() => {
    isAndroidRef.current = /Android/i.test(navigator.userAgent || "");
  }, []);

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

  // Android Chrome/Samsung Internet can end SpeechRecognition unexpectedly
  // even while the user is still actively transcribing. Keep a separate
  // transcript buffer and generation guard so recognition can safely restart.
  const transcribeTranscriptRef = useRef("");
  const transcribeGenerationRef = useRef(0);
  const transcribeManualStopRef = useRef(false);
  const transcribeRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const androidVoiceSilenceTimerRef = useRef<number | null>(null);
  const androidVoiceLastSpeechRef = useRef(0);
  const androidVoiceStartedAtRef = useRef(0);
  const androidVoiceTranscribingRef = useRef(false);

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const hostedAudioRef = useRef<HTMLAudioElement | null>(null);
  const hostedObjectUrlRef = useRef<string | null>(null);
  const speakTokenRef = useRef(0);
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
     AUDIO CONTEXT & MOBILE HARDWARE UNLOCKING
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

    // Direct synchronous speak to lift the iOS Safari / Mobile Chrome background speech lock
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const prime = new SpeechSynthesisUtterance(" ");
        prime.volume = 0.01;
        window.speechSynthesis.speak(prime);
      } catch {
        /* Speech synthesis unlock fallback */
      }
    }
  }, [getAudioContext]);

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
     PLACEHOLDER
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
     ACTIVITY TRACKING
     ======================================================= */

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const debouncedSetActivity = useCallback(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setLastActivityTime(Date.now()), 100);
  }, []);

  useEffect(() => {
    const handleImmediate = () => setLastActivityTime(Date.now());

    window.addEventListener("mousemove", debouncedSetActivity);
    ["keypress", "click", "scroll"].forEach((event) => window.addEventListener(event, handleImmediate));

    return () => {
      window.removeEventListener("mousemove", debouncedSetActivity);
      ["keypress", "click", "scroll"].forEach((event) => window.removeEventListener(event, handleImmediate));
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [debouncedSetActivity]);

  /* =======================================================
     FIRST VISIT
     ======================================================= */

  useEffect(() => {
    const FIRST_VISIT_KEY = "gd_ai_first_visit";
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);

    if (isFirstVisit && !response && suggestions.length === 0 && !isLoading) {
      localStorage.setItem(FIRST_VISIT_KEY, "true");
      const timer = setTimeout(() => {
        handleSubmit(undefined, "introduce the website to the new user", false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

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
     ANDROID RAW PCM AUDIO HELPERS
     ======================================================= */

  // Xiaomi devices can expose very different MediaRecorder containers/codecs.
  // Android transcription therefore uses the same raw microphone stream that
  // already drives the working waveform and captures PCM frames directly from
  // Web Audio. This removes MediaRecorder/WebM/MP4 differences completely.
  const androidPcmProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const androidPcmSilentGainRef = useRef<GainNode | null>(null);
  const androidPcmChunksRef = useRef<Float32Array[]>([]);
  const androidPcmRecordingRef = useRef(false);
  const androidPcmSampleRateRef = useRef(44100);
  const androidPcmResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const androidPcmRejectRef = useRef<((error: Error) => void) | null>(null);

  const ensureMicStream = useCallback(async () => {
    if (micStreamRef.current) {
      const liveTrack = micStreamRef.current.getAudioTracks().find((track) => track.readyState === "live");
      if (liveTrack) return micStreamRef.current;
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
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
    return stream;
  }, []);

  const attachAnalyserToMic = useCallback(async () => {
    const { ctx, analyser } = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const stream = await ensureMicStream();

    if (!micSourceRef.current) {
      micSourceRef.current = ctx.createMediaStreamSource(stream);
    }

    try {
      micSourceRef.current.connect(analyser);
    } catch {
      /* Already connected */
    }

    return { ctx, analyser, stream };
  }, [ensureMicStream, getAudioContext]);

  const encodePcm16Wav = useCallback((samples: Float32Array, sampleRate: number): Blob => {
    const bytesPerSample = 2;
    const channelCount = 1;
    const dataLength = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
    view.setUint16(32, channelCount * bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, pcm, true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  }, []);

  const stopAndroidPcmRecording = useCallback(
    (discard = false): Blob | null => {
      if (androidVoiceSilenceTimerRef.current !== null) {
        window.clearTimeout(androidVoiceSilenceTimerRef.current);
        androidVoiceSilenceTimerRef.current = null;
      }

      androidPcmRecordingRef.current = false;

      const processor = androidPcmProcessorRef.current;
      androidPcmProcessorRef.current = null;

      if (processor) {
        try {
          processor.disconnect();
        } catch {
          /* noop */
        }
        processor.onaudioprocess = null;
      }

      if (androidPcmSilentGainRef.current) {
        try {
          androidPcmSilentGainRef.current.disconnect();
        } catch {
          /* noop */
        }
        androidPcmSilentGainRef.current = null;
      }

      const chunks = androidPcmChunksRef.current;
      androidPcmChunksRef.current = [];

      const resolve = androidPcmResolveRef.current;
      const reject = androidPcmRejectRef.current;
      androidPcmResolveRef.current = null;
      androidPcmRejectRef.current = null;

      if (discard) {
        reject?.(new Error("Android recording cancelled."));
        return null;
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (!totalLength) {
        reject?.(new Error("No microphone audio was captured."));
        return null;
      }

      const samples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }

      const blob = encodePcm16Wav(samples, androidPcmSampleRateRef.current);
      resolve?.(blob);
      return blob;
    },
    [encodePcm16Wav],
  );

  const recordAndroidPcmClip = useCallback(
    async (maxMs = 15000): Promise<Blob> => {
      const { ctx, analyser } = await attachAnalyserToMic();

      if (!micSourceRef.current) {
        throw new Error("Microphone source is unavailable.");
      }

      if (androidPcmRecordingRef.current) {
        stopAndroidPcmRecording(true);
      }

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      androidPcmChunksRef.current = [];
      androidPcmSampleRateRef.current = ctx.sampleRate;
      androidPcmRecordingRef.current = true;
      androidPcmProcessorRef.current = processor;
      androidPcmSilentGainRef.current = silentGain;

      // Keep the processor alive without sending microphone audio to speakers.
      micSourceRef.current.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      processor.onaudioprocess = (event) => {
        if (!androidPcmRecordingRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        androidPcmChunksRef.current.push(new Float32Array(input));
      };

      return await new Promise<Blob>((resolve, reject) => {
        androidPcmResolveRef.current = resolve;
        androidPcmRejectRef.current = reject;

        window.setTimeout(() => {
          if (androidPcmRecordingRef.current) {
            stopAndroidPcmRecording(false);
          }
        }, maxMs);
      });
    },
    [attachAnalyserToMic, stopAndroidPcmRecording],
  );

  const transcribeRecordedAudio = useCallback(async (blob: Blob): Promise<string> => {
    const form = new FormData();
    form.append("audio", blob, "recording.wav");

    const res = await fetch(`${SUPABASE_URL}/functions/v1/gdx-transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: form,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `Transcription failed (${res.status})`);
    }

    const transcript = String(data?.text || "").trim();
    if (!transcript) throw new Error("No speech was detected.");
    return transcript;
  }, []);

  /* =======================================================
     STOP AUDIO
     ======================================================= */

  const stopAudioOnly = useCallback(() => {
    speakTokenRef.current += 1;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
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
     NATIVE BROWSER TTS (SAFE FOR IOS & ANDROID)
     ======================================================= */

  const getAvailableVoice = useCallback((synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice | null> => {
    return new Promise((resolve) => {
      const pickVoice = () => {
        const voices = synthesis.getVoices() || [];
        if (!voices.length) return null;

        // Prefer a local/native English voice where possible. Android often
        // exposes multiple remote voices, and local voices are more reliable
        // for browser fallback playback.
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
        // Timeout fallback above still resolves.
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

          // Mobile Chrome can pause long utterances by itself. Resuming while
          // active is harmless on browsers that do not exhibit the issue.
          resumeTimer = setInterval(() => {
            if (!settled && token === speakTokenRef.current && isVoiceSessionRef.current) {
              try {
                synthesis.resume();
              } catch {
                /* noop */
              }
            }
          }, 900);
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
          // Clear any stale utterance that Android may still consider queued.
          synthesis.cancel();

          // Give the browser a microtask to process cancel() before queueing.
          window.setTimeout(() => {
            if (settled || token !== speakTokenRef.current || !isVoiceSessionRef.current) {
              finish(false);
              return;
            }

            try {
              synthesis.resume();
              synthesis.speak(utterance);
              safetyTimer = setTimeout(finish.bind(null, true), Math.max(12000, fullTextToSpeak.length * 220));
            } catch {
              finish(false);
            }
          }, 0);
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

      try {
        const { ctx, analyser } = getAudioContext();

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        const audioBuffer = await ctx.decodeAudioData(audioBytes.slice(0));
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

        disconnectMicForHostedPlayback: {
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
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = 1;
        source.connect(analyser);
        currentSourceNodeRef.current = source;

        const monitor = analyserMonitorRef.current;
        if (monitor && !analyserDestinationConnectedRef.current) {
          try {
            analyser.connect(monitor);
            monitor.connect(ctx.destination);
            analyserDestinationConnectedRef.current = true;
          } catch {
            /* Graph may already be connected */
          }
        }

        isSpeakingRef.current = true;
        setIsSpeaking(true);

        await new Promise<void>((resolve, reject) => {
          let finished = false;

          const finish = (error?: Error) => {
            if (finished) return;
            finished = true;

            if (currentSourceNodeRef.current === source) {
              currentSourceNodeRef.current = null;
            }

            if (error) reject(error);
            else resolve();
          };

          source.onended = () => finish();

          try {
            source.start(0);
          } catch (error) {
            finish(error instanceof Error ? error : new Error("Could not start hosted Android TTS."));
          }
        });

        isSpeakingRef.current = false;
        setIsSpeaking(false);

        if (token !== speakTokenRef.current) return false;
        return true;
      } catch (error) {
        console.warn("Hosted Android TTS playback failed:", error);
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        return false;
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

      // Every new voice response tests the hosted TTS endpoint first.
      // Once that request fails, the remainder of this response falls back
      // to browser/local TTS. A previously stored quota flag never skips
      // the first live API attempt.
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

          // If the function accidentally returns JSON/text instead of audio,
          // fail over immediately instead of trying to decode invalid bytes.
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
            return await audioGraph.ctx.decodeAudioData(arrayBuffer.slice(0));
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

            // Cohesive single pass fallback without looping or stutter
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

          // Buffer delay to avoid acoustic feedback from the phone's speaker
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
    [getAudioContext, speakWithBrowserTTS, stopAudioOnly],
  );

  /* =======================================================
     CONTINUOUS SPEECH RECOGNITION (VOICE AGENT)
     ======================================================= */

  const startAndroidVoiceTurn = useCallback(async () => {
    if (!isVoiceSessionRef.current || isSpeakingRef.current || androidVoiceTranscribingRef.current) return;

    androidVoiceTranscribingRef.current = false;
    setIsListening(true);

    try {
      const { ctx, analyser } = await attachAnalyserToMic();

      if (!micSourceRef.current) throw new Error("Microphone source is unavailable.");

      if (androidPcmRecordingRef.current) {
        stopAndroidPcmRecording(true);
      }

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;

      androidPcmChunksRef.current = [];
      androidPcmSampleRateRef.current = ctx.sampleRate;
      androidPcmRecordingRef.current = true;
      androidPcmProcessorRef.current = processor;
      androidPcmSilentGainRef.current = silentGain;
      androidVoiceStartedAtRef.current = performance.now();
      androidVoiceLastSpeechRef.current = performance.now();

      micSourceRef.current.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);

      processor.onaudioprocess = (event) => {
        if (!androidPcmRecordingRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        androidPcmChunksRef.current.push(new Float32Array(input));
      };

      let monitorFrame = 0;
      let hasSpeech = false;
      let stopped = false;

      const cleanupMonitor = () => {
        if (monitorFrame) cancelAnimationFrame(monitorFrame);
        monitorFrame = 0;
      };

      const stopTurn = async () => {
        if (stopped) return;
        stopped = true;
        cleanupMonitor();

        const blob = stopAndroidPcmRecording(false);
        if (!blob || !isVoiceSessionRef.current) return;

        androidVoiceTranscribingRef.current = true;
        setIsListening(false);

        try {
          const transcript = await transcribeRecordedAudio(blob);

          if (!isVoiceSessionRef.current || !transcript.trim()) return;

          androidVoiceTranscribingRef.current = false;
          transcriptRef.current = transcript.trim();
          handleSubmitRef.current?.(undefined, transcript.trim(), true);
        } catch (error) {
          androidVoiceTranscribingRef.current = false;
          console.warn("Android voice transcription failed:", error);

          if (isVoiceSessionRef.current) {
            window.setTimeout(() => {
              if (isVoiceSessionRef.current && !isSpeakingRef.current) {
                void startAndroidVoiceTurn();
              }
            }, 350);
          }
        }
      };

      const sample = () => {
        if (!androidPcmRecordingRef.current || !isVoiceSessionRef.current || isSpeakingRef.current) {
          cleanupMonitor();
          return;
        }

        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);

        let sum = 0;
        for (let i = 0; i < Math.min(40, data.length); i++) sum += data[i];
        const energy = sum / Math.max(1, Math.min(40, data.length));

        const now = performance.now();
        if (energy > 12) {
          hasSpeech = true;
          androidVoiceLastSpeechRef.current = now;
        }

        if (
          hasSpeech &&
          now - androidVoiceLastSpeechRef.current > 1100 &&
          now - androidVoiceStartedAtRef.current > 700
        ) {
          void stopTurn();
          return;
        }

        if (!hasSpeech && now - androidVoiceStartedAtRef.current > 9000) {
          void stopTurn();
          return;
        }

        monitorFrame = requestAnimationFrame(sample);
      };

      monitorFrame = requestAnimationFrame(sample);
    } catch (error) {
      console.warn("Android voice setup failed:", error);
      androidPcmRecordingRef.current = false;
      setIsListening(false);

      if (isVoiceSessionRef.current) {
        window.setTimeout(() => {
          if (isVoiceSessionRef.current && !isSpeakingRef.current) void startAndroidVoiceTurn();
        }, 500);
      }
    }
  }, [attachAnalyserToMic, stopAndroidPcmRecording, transcribeRecordedAudio]);

  const startListeningContinuous = useCallback(async () => {
    if (isAndroidRef.current) {
      await startAndroidVoiceTurn();
      return;
    }

    if (!isVoiceSessionRef.current || isSpeakingRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      stopVoiceSessionRef.current?.();
      return;
    }

    const generation = ++recognitionGenerationRef.current;

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

      // Android Chrome can have trouble when getUserMedia and its separate
      // SpeechRecognition service compete for the microphone. Let recognition
      // own the microphone on Android; desktop/iOS retain the real analyser.
      if (!isAndroidRef.current) {
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
      /* Duplicate start is harmless */
    }
  }, [getAudioContext, startAndroidVoiceTurn]);

  startListeningContinuousRef.current = startListeningContinuous;

  /* =======================================================
     STOP VOICE SESSION (AGENT)
     ======================================================= */

  const stopVoiceSession = useCallback(() => {
    isVoiceSessionRef.current = false;
    androidVoiceTranscribingRef.current = false;
    stopAndroidPcmRecording(true);
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
  }, [stopAudioOnly, stopAndroidPcmRecording]);

  stopVoiceSessionRef.current = stopVoiceSession;

  /* =======================================================
     START VOICE SESSION (AGENT)
     ======================================================= */

  const startVoiceSession = useCallback(() => {
    if (isLoading) return;

    if (isTranscribing) {
      stopTranscribeRef.current?.();
    }

    primeMobileAudioSession();

    isVoiceSessionRef.current = true;
    setIsVoiceSession(true);
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
    stopAndroidPcmRecording(true);
    transcribeGenerationRef.current += 1;

    if (transcribeRestartTimerRef.current) {
      clearTimeout(transcribeRestartTimerRef.current);
      transcribeRestartTimerRef.current = null;
    }

    isTranscribingRef.current = false;
    setIsTranscribing(false);
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

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [stopAndroidPcmRecording]);

  stopTranscribeRef.current = stopTranscribe;

  const finishTranscribe = useCallback(() => {
    if (isAndroidRef.current && androidPcmRecordingRef.current) {
      stopAndroidPcmRecording(false);
      return;
    }

    stopTranscribe();
  }, [stopAndroidPcmRecording, stopTranscribe]);

  const startTranscribe = useCallback(async () => {
    if (isLoading) return;

    if (isVoiceSessionRef.current) {
      stopVoiceSession();
    }

    primeMobileAudioSession();

    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
    setQuery("");

    const generation = ++transcribeGenerationRef.current;
    transcribeManualStopRef.current = false;
    transcribeTranscriptRef.current = "";

    if (isAndroidRef.current) {
      try {
        // Get microphone + start PCM capture. No MediaRecorder container or
        // Android SpeechRecognition service is involved.
        const recordingPromise = recordAndroidPcmClip(30000);

        setIsTranscribing(true);
        isTranscribingRef.current = true;
        setIsListening(true);

        const blob = await recordingPromise;

        if (generation !== transcribeGenerationRef.current || transcribeManualStopRef.current) {
          return;
        }

        setIsListening(false);
        const transcript = await transcribeRecordedAudio(blob);

        if (generation !== transcribeGenerationRef.current || transcribeManualStopRef.current) {
          return;
        }

        setQuery(transcript);
        setIsTranscribing(false);
        isTranscribingRef.current = false;
        setIsListening(false);

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

        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      } catch (error) {
        console.warn("Android transcription failed:", error);
        setIsTranscribing(false);
        isTranscribingRef.current = false;
        setIsListening(false);

        try {
          stopAndroidPcmRecording(true);
        } catch {
          /* noop */
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

        alert(error instanceof Error ? error.message : "Android transcription failed. Please try again.");
        return;
      }
    }

    // Existing reliable browser speech-recognition path for iOS/desktop.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const { ctx, analyser } = await attachAnalyserToMic();

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      setIsTranscribing(true);
      isTranscribingRef.current = true;
      setIsListening(true);

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0]?.transcript || "";
        }

        if (transcript) {
          setQuery(transcript);
          transcribeTranscriptRef.current = transcript;
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => stopTranscribe(), 3000);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition transcribe error:", event.error);
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          stopTranscribe();
        }
      };

      recognition.onend = () => {
        if (isTranscribingRef.current) {
          stopTranscribe();
        }
      };

      recognition.start();
    } catch (error) {
      console.warn("Transcribe setup warning:", error);
      stopTranscribe();
    }
  }, [
    attachAnalyserToMic,
    dismissSuggestionBubble,
    isLoading,
    primeMobileAudioSession,
    recordAndroidPcmClip,
    stopAndroidPcmRecording,
    stopTranscribe,
    stopVoiceSession,
    transcribeRecordedAudio,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      recognitionGenerationRef.current += 1;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (transcribeRestartTimerRef.current) clearTimeout(transcribeRestartTimerRef.current);

      transcribeManualStopRef.current = true;
      transcribeGenerationRef.current += 1;
      androidVoiceTranscribingRef.current = false;
      stopAndroidPcmRecording(true);

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
  }, [stopAndroidPcmRecording]);

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleSubmit = async (event?: FormEvent, customQuery?: string, fromVoice = false) => {
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
  };

  handleSubmitRef.current = handleSubmit;

  /* =======================================================
     INTERACTION HELPERS
     ======================================================= */

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery("");
      setHasInteracted(true);
      dismissSuggestionBubble();
      setShowExpandedSuggestions(false);
      void handleSubmit(undefined, suggestion, false);
    },
    [dismissSuggestionBubble],
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

  /* =======================================================
     OUTSIDE CLICK
     ======================================================= */

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
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [response, suggestions, query, stopVoiceSession, stopTranscribe, clearPersistedState]);

  /* =======================================================
     LAYOUT
     ======================================================= */

  const layoutValues = useMemo(() => {
    const hasContent = (suggestions.length > 0 || response) && !isVoiceSession && !isTranscribing;
    const isExpanded = hasContent && !isLoading;
    // On narrow phones, a 360px normal bar and 320px voice bar become almost
    // the same visible width, so the width animation looks compressed.
    // Keep desktop widths unchanged while giving mobile states a meaningful
    // difference and leaving safe horizontal breathing room.
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

            {/* Talk with agent voice mode: Waveform WITHOUT timer */}
            {isVoiceSession && !isTranscribing && (
              <div className="flex-1 flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession} isSpeaking={isSpeaking} />
              </div>
            )}

            {/* Transcribe mode: Waveform WITH timer */}
            {isTranscribing && (
              <div className="flex-1 flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isTranscribing} isSpeaking={false} />
                <RecordingTimer isActive={isTranscribing} />
              </div>
            )}

            {/* Action buttons */}
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
                onClick={finishTranscribe}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="Done transcribing"
                aria-label="Done transcribing"
              >
                <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {/* Transcribe mic button */}
                <button
                  type="button"
                  onClick={startTranscribe}
                  className="h-9 w-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Transcribe speech"
                  aria-label="Transcribe speech"
                >
                  <Mic className="h-5 w-5" strokeWidth={2} />
                </button>

                {/* Talk with agent button (ChatGPT style) */}
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
