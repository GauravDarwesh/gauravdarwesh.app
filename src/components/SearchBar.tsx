"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* =========================================================
   0. TTS CONFIG
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

const TTS_QUOTA_BLOCK_KEY = "gdx_tts_quota_blocked_until";
const TTS_QUOTA_FALLBACK_MS = 24 * 60 * 60 * 1000;
// OpenRouter's current free-tier reset, reported by gdx-tts. Keeping this
// client-side guard prevents a fresh browser session from calling the edge
// function while the provider is already known to be unavailable.
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
   1. MARKDOWN → HTML
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
   2. FADE HELPER
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
   3. LOW-LATENCY REACTIVE WAVEFORM

   Voice-specific fixes:
   - The visual starts immediately when voice mode opens.
   - Mic waveform uses the live time-domain signal directly instead
     of a delayed history queue.
   - Fast attack / slower release keeps speech transients visible.
   - AudioContext analyser smoothing is intentionally very low.
   - Hosted TTS is visualised from the exact playback signal.
   - A tiny synthetic floor is used only before real audio is ready.
   ========================================================= */

const BarWaveform: React.FC<{
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking?: boolean;
}> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /*
   * This visual intentionally mirrors the reference waveform:
   * fixed vertical bars distributed across the available width.
   *
   * IMPORTANT:
   * - The X positions never change.
   * - No audio history is shifted from right → left.
   * - No phase / scrolling / travelling-wave animation is used.
   * - When an analyser is available, only the bar heights change from
   *   the current audio spectrum.
   */
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
      /*
       * Keep this in the same visual family as the reference:
       * a frequency-domain analyser driving stationary vertical bars.
       */
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      analyser.minDecibels = -86;
      analyser.maxDecibels = -12;

      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    let displayedLevels: number[] = [];
    let lastTime = performance.now();

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const barCount = Math.max(8, Math.floor(rect.width / (BAR_WIDTH + BAR_GAP)));

      if (displayedLevels.length !== barCount) {
        const previous = displayedLevels;
        displayedLevels = Array.from({ length: barCount }, (_, index) => {
          if (!previous.length) return 0.08;
          const mapped = (index / Math.max(1, barCount - 1)) * Math.max(0, previous.length - 1);
          const left = Math.floor(mapped);
          const right = Math.min(previous.length - 1, left + 1);
          const blend = mapped - left;
          return (previous[left] || 0.08) * (1 - blend) + (previous[right] || 0.08) * blend;
        });
      }
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerRef.current);

    const draw = (now: number) => {
      animFrameRef.current = requestAnimationFrame(draw);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = rect.width;
      const h = rect.height;

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        resize();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barCount = Math.max(8, Math.floor(w / (BAR_WIDTH + BAR_GAP)));

      if (displayedLevels.length !== barCount) {
        displayedLevels = Array.from({ length: barCount }, () => 0.08);
      }

      const delta = Math.min(40, Math.max(8, now - lastTime));
      lastTime = now;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < barCount; i++) {
        let targetValue = 0.08;

        if (analyser && dataArray && bufferLength > 0) {
          /*
           * Map the fixed screen positions onto frequency bands.
           * Screen position is spatial only; it is NOT a time axis.
           *
           * Slight low/mid emphasis gives the voice a more natural
           * spoken character instead of making high-frequency hiss dominate.
           */
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

          /*
           * Gentle floor + compression keeps the visual alive while
           * preserving a clear relationship to actual voice intensity.
           */
          targetValue = Math.min(1, 0.045 + Math.pow(spectrumValue, 0.78) * 1.48);
        }

        const current = displayedLevels[i] ?? 0.08;

        /*
         * Smooth both attack and release. This preserves the reference
         * visual's responsiveness without making bars flicker.
         */
        const attack = 1 - Math.pow(0.16, delta / 16.67);
        const release = 1 - Math.pow(0.42, delta / 16.67);

        displayedLevels[i] =
          targetValue > current
            ? current + (targetValue - current) * attack
            : current + (targetValue - current) * release;

        const value = Math.max(0.05, Math.min(1, displayedLevels[i]));
        const barHeight = Math.max(MIN_HEIGHT, value * (h * 0.85));

        /*
         * FIXED X POSITION.
         * Nothing is shifted. Nothing scrolls.
         */
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (h - barHeight) / 2;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + value * 0.5})`;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
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
  }, [analyser, isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="flex-1 h-8 min-w-0 overflow-hidden">
      <canvas ref={canvasRef} className="pointer-events-none block w-full h-full" />
    </div>
  );
};

/* =========================================================
   3b. RECORDING TIMER
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
   4. SEARCH BAR
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
  const [suggestionPhase, setSuggestionPhase] = useState<"emerging" | "visible" | "retreating" | "hidden">("hidden");
  const [fullText, setFullText] = useState("");
  const suggestionIndexRef = useRef(0);
  const [hasInteracted, setHasInteracted] = useState(persistedState.hasInteracted);
  const [lastActivityTime, setLastActivityTime] = useState(persistedState.lastActivityTime);
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(persistedState.showExpandedSuggestions);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(!!persistedState.response);
  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);

  /* -------------------------------------------------------
     Voice state
     ------------------------------------------------------- */

  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isVoiceSessionRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);

  isVoiceSessionRef.current = isVoiceSession;
  isLoadingRef.current = isLoading;
  isSpeakingRef.current = isSpeaking;

  /* -------------------------------------------------------
     Placeholder
     ------------------------------------------------------- */

  const placeholderTexts = useMemo(() => ["Ask anything...", "hold search/shift to talk with GDx"], []);
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

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speakTokenRef = useRef(0);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();
  const stopVoiceSessionRef = useRef<(() => void) | null>(null);
  const startListeningContinuousRef = useRef<(() => Promise<void>) | null>(null);

  /* =======================================================
     Persist state
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
     AUDIO CONTEXT
     ======================================================= */

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioCtx) {
        throw new Error("Web Audio is not supported by this browser.");
      }

      const ctx: AudioContext = new AudioCtx();

      const analyser = ctx.createAnalyser();

      /*
       * Low smoothing is critical here. Heavy analyser smoothing makes
       * microphone transients arrive visually late and makes consonants
       * feel "washed out".
       */
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.08;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -8;

      const monitor = ctx.createGain();

      monitor.gain.value = 1;

      /*
       * DO NOT permanently connect analyser -> destination.
       *
       * During microphone listening that would play the user's own
       * microphone back through the speakers.
       *
       * We only connect the analyser to the destination while AI
       * audio is actually playing.
       */
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
     PLACEHOLDER
     ======================================================= */

  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || query) return;

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
     TYPEWRITER
     ======================================================= */

  useEffect(() => {
    if (response || suggestions.length > 0 || isVoiceSession) return;

    const timer = setTimeout(() => {
      if (!hasInteracted) setShowTypewriter(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [hasInteracted, response, suggestions, isVoiceSession]);

  useEffect(() => {
    const idleTimer = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      if (response || suggestions.length > 0 || isVoiceSession) return;

      if (idle > 10000 && hasInteracted && !isLoading) {
        setShowTypewriter(true);
      }
    }, 2000);

    return () => clearInterval(idleTimer);
  }, [lastActivityTime, hasInteracted, isLoading, response, suggestions, isVoiceSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      const shouldShow = (response || suggestions.length > 0) && !isLoading && idle > 10000 && !isVoiceSession;

      setShowExpandedSuggestions(shouldShow);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivityTime, response, suggestions, isLoading, isVoiceSession]);

  useEffect(() => {
    if (!showTypewriter || isVoiceSession) {
      setSuggestionPhase("hidden");
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
  }, [showTypewriter, rotatingSuggestions, fullText, isVoiceSession]);

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
     NATIVE BROWSER TTS FALLBACK

     Native TTS does not expose its audio stream. The waveform
     therefore receives isSpeaking=true and switches to its
     restrained synthetic voice animation.
     ======================================================= */

  const speakWithBrowserTTS = useCallback(async (text: string, token: number): Promise<boolean> => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      return false;
    }

    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    return new Promise<boolean>((resolve) => {
      let settled = false;
      let safetyTimer: ReturnType<typeof setTimeout> | null = null;

      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        if (safetyTimer) clearTimeout(safetyTimer);

        if (token === speakTokenRef.current) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        }

        resolve(success);
      };

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 1.0;
      utterance.pitch = 1;
      utterance.volume = 1;

      const chooseVoice = () => {
        const voices = synthesis.getVoices();
        const preferred = voices.find((voice) => /^en(-|_)/i.test(voice.lang)) || voices[0];
        if (preferred) utterance.voice = preferred;
      };

      chooseVoice();
      if (synthesis.onvoiceschanged !== undefined) {
        synthesis.addEventListener("voiceschanged", chooseVoice, { once: true });
      }

      utterance.onstart = () => {
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
          synthesis.cancel();
          finish(false);
          return;
        }

        isSpeakingRef.current = true;
        setIsSpeaking(true);
      };

      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);

      synthesis.speak(utterance);

      safetyTimer = setTimeout(
        () => {
          if (!settled) {
            try {
              synthesis.cancel();
            } catch {
              /* noop */
            }
            finish(false);
          }
        },
        Math.max(15000, text.length * 140),
      );
    });
  }, []);

  /* =======================================================
     HOSTED TTS

     Key fixes:
     - Sentences are requested and played strictly sequentially.
     - A quota response prevents every subsequent hosted request.
     - One failed hosted request falls back to native TTS for
       the remaining response.
     - Mic analyser input is disconnected while AI speaks,
       preventing mic silence/echo from masking the AI waveform.
     ======================================================= */

  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudioOnly();

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

      const sentences = (clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean])
        .map((sentence) => sentence.trim())
        .filter(Boolean);

      let audioGraph: {
        ctx: AudioContext;
        analyser: AnalyserNode;
      } | null = null;

      let hostedTtsFailed = getTtsQuotaBlockedUntil() > Date.now();
      let nativeFallbackUsed = false;

      const disconnectMicForPlayback = () => {
        if (micSourceRef.current) {
          try {
            micSourceRef.current.disconnect();
          } catch {
            /* noop */
          }
        }
      };

      const reconnectMicAfterPlayback = () => {
        if (!micSourceRef.current || !analyserRef.current) return;
        try {
          micSourceRef.current.connect(analyserRef.current);
        } catch {
          /* It may already be connected. */
        }
      };

      const fetchAudioBuffer = async (sentence: string): Promise<AudioBuffer | null> => {
        if (hostedTtsFailed) return null;

        try {
          const response = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ text: sentence }),
          });

          if (!response.ok) {
            const body = await response.text().catch(() => "");
            if (response.status === 429) rememberTtsQuotaLimit(body);
            hostedTtsFailed = true;
            return null;
          }

          const arrayBuffer = await response.arrayBuffer();
          if (!arrayBuffer.byteLength) {
            hostedTtsFailed = true;
            return null;
          }

          audioGraph ??= getAudioContext();
          return await audioGraph.ctx.decodeAudioData(arrayBuffer);
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
            nativeFallbackUsed = true;

            /* Do not leave the user waiting for another hosted request. */
            const remainingText = sentences.slice(i).join(" ");
            disconnectMicForPlayback();
            isSpeakingRef.current = true;
            setIsSpeaking(true);

            const success = await speakWithBrowserTTS(remainingText, token);

            if (!success) {
              console.warn("Browser speech synthesis fallback also failed.");
            }

            return;
          }

          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return;
          }

          disconnectMicForPlayback();
          isSpeakingRef.current = true;
          setIsSpeaking(true);

          await new Promise<void>((resolve) => {
            if (!audioGraph) {
              resolve();
              return;
            }

            const source = audioGraph.ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = 1.0;

            /*
             * AI playback path:
             *
             * source → analyser → monitor → speakers
             *
             * The analyser therefore sees the exact same audio the
             * user hears, which gives the AI waveform real speech
             * movement instead of a guessed sine wave.
             */
            const monitor = analyserMonitorRef.current;

            if (monitor) {
              try {
                if (!analyserDestinationConnectedRef.current) {
                  audioGraph.analyser.connect(monitor);
                  monitor.connect(audioGraph.ctx.destination);
                  analyserDestinationConnectedRef.current = true;
                }
              } catch {
                /* The graph may already be connected. */
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
      } finally {
        if (token === speakTokenRef.current) {
          currentSourceNodeRef.current = null;

          /*
           * Remove the analyser → speakers monitor before handing
           * the analyser back to the microphone. This prevents the
           * microphone from being echoed to the user.
           */
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

          if (!nativeFallbackUsed) {
            reconnectMicAfterPlayback();
          }

          if (isVoiceSessionRef.current) {
            /* Wait one frame so the waveform settles before recognition
               takes the mic back. This avoids the old speaking/listening
               race where both states could be true for a moment. */
            requestAnimationFrame(() => {
              if (isVoiceSessionRef.current && !isLoadingRef.current && !isSpeakingRef.current) {
                void startListeningContinuousRef.current?.();
              }
            });
          }
        }
      }
    },
    [getAudioContext, speakWithBrowserTTS, stopAudioOnly],
  );

  /* =======================================================
     CONTINUOUS SPEECH RECOGNITION

     Uses refs for loading/speaking state so recognition callbacks
     never operate on stale render-time values.
     ======================================================= */

  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current) return;

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
      const { ctx, analyser } = getAudioContext();

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      /* Show live-listening state immediately; the mic stream can still
         take a moment to resolve on the browser side. */
      setIsListening(true);

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
          /* Already connected. */
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
    recognition.continuous = true;
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

      /* Safari/Chrome can end continuous recognition spontaneously. */
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
            /* Browser may already be restarting. */
          }
        }
      });
    };

    try {
      recognition.start();
    } catch {
      /* A duplicate start is harmless. */
    }
  }, [getAudioContext]);

  startListeningContinuousRef.current = startListeningContinuous;

  /* =======================================================
     STOP VOICE SESSION
     ======================================================= */

  const stopVoiceSession = useCallback(() => {
    isVoiceSessionRef.current = false;
    isHoldingRef.current = false;
    recognitionGenerationRef.current += 1;

    setIsVoiceSession(false);
    setIsListening(false);

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

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
     HOLD TO SPEAK
     ======================================================= */

  const startHold = useCallback(() => {
    if (isLoading || isVoiceSession) return;

    try {
      getAudioContext();
    } catch {
      /* Voice recognition can still provide its own error path. */
    }

    isHoldingRef.current = true;

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

    /*
     * Enter voice mode immediately.
     *
     * The old 350ms gate made the waveform visibly late. We still
     * keep a ref guard so accidental pointer events cannot start
     * recognition after the hold has ended.
     */
    isVoiceSessionRef.current = true;
    setIsVoiceSession(true);
    setResponse(null);
    setSuggestions([]);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);

    void startListeningContinuousRef.current?.();
  }, [getAudioContext, isLoading, isVoiceSession]);

  const handleHoldStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      startHold();
    },
    [startHold],
  );

  const handleHoldEnd = useCallback(
    (event?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      event?.preventDefault?.();

      const wasHolding = isHoldingRef.current;
      isHoldingRef.current = false;

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (!isVoiceSessionRef.current && wasHolding && query.trim()) {
        handleSubmitRef.current?.(undefined, undefined, false);
      }
    },
    [query],
  );

  /* =======================================================
     SHIFT TO SPEAK
     ======================================================= */

  useEffect(() => {
    const handleShiftDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift" || event.repeat || isListening || isLoading || isVoiceSession) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isInputFocused =
        !!activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true");

      if (isInputFocused) return;

      event.preventDefault();
      startHold();
    };

    const handleShiftUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") handleHoldEnd();
    };

    window.addEventListener("keydown", handleShiftDown);
    window.addEventListener("keyup", handleShiftUp);

    return () => {
      window.removeEventListener("keydown", handleShiftDown);
      window.removeEventListener("keyup", handleShiftUp);
    };
  }, [isListening, isLoading, isVoiceSession, startHold, handleHoldEnd]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      recognitionGenerationRef.current += 1;

      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

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

  const handleSubmit = async (event?: FormEvent, customQuery?: string, fromVoice = false) => {
    event?.preventDefault();

    const text = (customQuery ?? query).trim();
    if (!text) return;

    setHasInteracted(true);
    setShowTypewriter(false);
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
      /* Recognition has already stopped before this reaches the API. */
      setIsListening(false);
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const result = await sendChatMessage(text);
      const answer = String((result as any)?.response ?? "");
      const suggs = (result as any)?.suggestions || [];

      if (fromVoice && isVoiceSessionRef.current) {
        /* Start TTS immediately; don't wait for another render. */
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

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    void handleSubmit(undefined, suggestion, false);
  }, []);

  const handleInputFocus = useCallback(() => {
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
  }, []);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
  }, []);

  /* =======================================================
     OUTSIDE CLICK
     ======================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (searchBarRef.current?.contains(target)) return;

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
  }, [response, suggestions, query, stopVoiceSession, clearPersistedState]);

  /* =======================================================
     LAYOUT
     ======================================================= */

  const layoutValues = useMemo(() => {
    const hasContent = (suggestions.length > 0 || response) && !isVoiceSession;
    const isExpanded = hasContent && !isLoading;
    const targetWidth = isExpanded ? "580px" : isVoiceSession ? "420px" : "460px";
    const targetRadius = isExpanded ? "16px" : "999px";

    return { isExpanded, targetWidth, targetRadius };
  }, [suggestions.length, response, isVoiceSession, isLoading]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {showTypewriter && fullText && suggestionPhase !== "hidden" && !isVoiceSession && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm font-normal text-white px-4 py-2 rounded-full shadow-md whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          style={{
            animation:
              suggestionPhase === "emerging"
                ? "suggestionEmerge 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                : suggestionPhase === "retreating"
                  ? "suggestionRetreat 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                  : undefined,
          }}
        >
          {fullText}
        </div>
      )}

      <div
        className={`mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 overflow-hidden select-none ${
          isLoading ? "thinking-container" : ""
        } ${isVoiceSession || isListening ? "listening-container" : ""}`}
        style={{
          width: layoutValues.targetWidth,
          maxWidth: "90vw",
          borderRadius: layoutValues.targetRadius,
          transition:
            "width 0.8s cubic-bezier(0.25, 1, 0.3, 1), border-radius 0.8s cubic-bezier(0.25, 1, 0.3, 1), background-color 0.6s ease, box-shadow 0.6s ease",
          cursor: isListening ? "default" : undefined,
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
        }}
      >
        <div
          className={`transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${layoutValues.isExpanded ? "p-5 pt-6" : "p-2"}`}
          style={{
            transitionDuration: "800ms",
            transitionDelay: layoutValues.isExpanded && !isRestoredFromStorage ? "600ms" : "0ms",
          }}
        >
          <Fade show={showExpandedSuggestions && suggestions.length > 0 && !isVoiceSession} duration={800}>
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
              response && !isVoiceSession
                ? isCollapsing || isCollapsingToThink
                  ? "opacity-0 mb-0"
                  : "opacity-100 mb-5"
                : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight: isCollapsing || isCollapsingToThink ? "0px" : response && !isVoiceSession ? "384px" : "0px",
              transitionDuration: isCollapsingToThink ? "400ms" : "1000ms",
              transitionDelay:
                response && !isCollapsing && !isCollapsingToThink && !isRestoredFromStorage ? "900ms" : "0ms",
            }}
          >
            {response && !isVoiceSession && (
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
            {!isVoiceSession && (
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

            {isVoiceSession && (
              <div className="flex-1 flex items-center gap-2 pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession} isSpeaking={isSpeaking} />
                {isListening && <RecordingTimer isActive={isListening} />}
              </div>
            )}

            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
                title="End voice mode"
                aria-label="End voice mode"
              >
                <span aria-hidden="true" className="relative block h-3.5 w-3.5">
                  <span className="absolute left-1/2 top-1/2 block h-[1px] w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white/70" />
                  <span className="absolute left-1/2 top-1/2 block h-[1px] w-3.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-white/70" />
                </span>
              </button>
            ) : (
              <div
                className="shrink-0 select-none"
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
              >
                <div
                  className={`h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)] hover:scale-110 active:scale-95 cursor-pointer ${
                    isListening ? "bg-white/30" : "hover:bg-white/20"
                  }`}
                >
                  <Search
                    className={`h-4 w-4 text-white/50 ${
                      isLoading ? "thinking-icon" : ""
                    } ${isListening ? "!text-white" : ""}`}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* =====================================================
          EXISTING ANIMATIONS — intentionally preserved
          ===================================================== */}

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

        .thinking-icon {
          stroke: rgba(255,255,255,0.5);
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.3));
          animation: iconGlow 4s infinite ease-in-out;
        }

        @keyframes iconGlow {
          0%, 100% {
            stroke: rgba(255,255,255,0.3);
            filter: drop-shadow(0 0 1px rgba(255,255,255,0.2));
          }
          50% {
            stroke: rgba(255,255,255,0.8);
            filter: drop-shadow(0 0 3px rgba(255,255,255,0.6));
          }
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
            transform: translateY(12px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes suggestionRetreat {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
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
