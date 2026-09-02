"use client";

import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ==========================================================================
   CONFIG
   ========================================================================== */

const SUPABASE_URL = "https://zdrcjhohalgzhlbufwcl.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYm90Z3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQ4ODgsImV4cCI6MjA3MTQ2MDg4OH0.dCIOgyiibgCcXZr6OW2hkqGM3340ugtQivXTjofbEmo";

const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

const STORAGE_KEY = "searchbar_state";
const FIRST_VISIT_KEY = "gd_ai_first_visit";

/* ==========================================================================
   TYPES
   ========================================================================== */

type SuggestionPhase = "hidden" | "entering" | "visible" | "exiting";

interface PersistedState {
  response: string | null;
  suggestions: string[];
  hasInteracted: boolean;
  showExpandedSuggestions: boolean;
  lastActivityTime: number;
}

/* ==========================================================================
   MARKDOWN
   ========================================================================== */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const convertMarkdownToHtml = (text: string): string => {
  const processInline = (input: string) => {
    let str = escapeHtml(input);

    str = str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    str = str.replace(/\*(.*?)\*/g, "<em>$1</em>");

    str = str.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    str = str.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>',
    );

    return str;
  };

  return text
    .split("\n")
    .map((rawLine) => {
      const line = rawLine.trim();

      if (!line) {
        return '<div class="h-2"></div>';
      }

      if (line.startsWith("### ")) {
        return `<h3 class="text-lg font-semibold mt-4 mb-2">${processInline(line.slice(4))}</h3>`;
      }

      if (line.startsWith("## ")) {
        return `<h2 class="text-xl font-bold mt-4 mb-2">${processInline(line.slice(3))}</h2>`;
      }

      if (line.startsWith("# ")) {
        return `<h1 class="text-2xl font-bold mt-4 mb-2">${processInline(line.slice(2))}</h1>`;
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<div class="flex gap-2 ml-2 mb-1">
          <span class="opacity-50">•</span>
          <span>${processInline(line.slice(2))}</span>
        </div>`;
      }

      return `<p class="mb-2">${processInline(line)}</p>`;
    })
    .join("");
};

/* ==========================================================================
   SMOOTH BAR WAVEFORM
   ========================================================================== */

interface BarWaveformProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

const BarWaveform: React.FC<BarWaveformProps> = ({ analyser, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frameRef = useRef<number | null>(null);

  const dimensionsRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const smoothedValuesRef = useRef<number[]>([]);

  /* ------------------------------------------------------------------------
     Canvas sizing
     ------------------------------------------------------------------------ */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      dimensionsRef.current = {
        width: rect.width,
        height: rect.height,
        dpr,
      };

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  /* ------------------------------------------------------------------------
     Animation
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isActive) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);

      const { width, height, dpr } = dimensionsRef.current;

      if (!width || !height) return;

      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
      }

      const barWidth = 2.2;
      const gap = 2.7;

      const count = Math.max(12, Math.floor(width / (barWidth + gap)));

      if (smoothedValuesRef.current.length !== count) {
        smoothedValuesRef.current = Array.from({ length: count }, () => 0);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        let target = 0;

        if (analyser && frequencyData) {
          /*
           * Ignore the very top end of the frequency spectrum.
           * This produces a much calmer waveform.
           */
          const index = Math.floor((i / count) * Math.min(frequencyData.length * 0.65, frequencyData.length - 1));

          target = frequencyData[index] / 255;

          /*
           * Give the center of the waveform slightly more energy.
           */
          const centerDistance = Math.abs(i / count - 0.5);

          target *= 1 - centerDistance * 0.35;
        }

        /*
         * Critically damped-ish smoothing.
         *
         * Attack is slightly faster than release, which makes the
         * waveform feel alive without becoming twitchy.
         */
        const previous = smoothedValuesRef.current[i] ?? 0;

        const smoothing = target > previous ? 0.18 : 0.075;

        const next = previous + (target - previous) * smoothing;

        smoothedValuesRef.current[i] = next;

        const idleBreath = !analyser ? 0.12 + Math.sin(performance.now() * 0.0015 + i * 0.45) * 0.035 : 0;

        const value = Math.max(next, idleBreath);

        const minHeight = 2.5;

        const maxHeight = height * 0.78;

        const barHeight = Math.max(minHeight, value * maxHeight);

        const x = i * (barWidth + gap);

        const y = (height - barHeight) / 2;

        const alpha = 0.26 + value * 0.55;

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;

        ctx.beginPath();

        ctx.roundRect(x, y, barWidth, barHeight, 2);

        ctx.fill();
      }
    };

    draw();

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [analyser, isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="flex-1 min-w-0 h-8 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
};

/* ==========================================================================
   RECORDING TIMER
   ========================================================================== */

const RecordingTimer: React.FC<{
  isActive: boolean;
}> = ({ isActive }) => {
  const startedAtRef = useRef<number | null>(null);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      startedAtRef.current = null;
      setElapsed(0);
      return;
    }

    startedAtRef.current = performance.now();

    const update = () => {
      if (startedAtRef.current === null) return;

      setElapsed(Math.floor((performance.now() - startedAtRef.current) / 1000));
    };

    update();

    const interval = window.setInterval(update, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  if (!isActive) return null;

  const minutes = Math.floor(elapsed / 60);

  const seconds = elapsed % 60;

  return (
    <span className="shrink-0 text-sm font-mono tabular-nums text-white/65">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
};

/* ==========================================================================
   SEARCH BAR
   ========================================================================== */

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  /* ========================================================================
     PERSISTENCE
     ======================================================================== */

  const getInitialState = useCallback((): PersistedState => {
    const emptyState: PersistedState = {
      response: null,
      suggestions: [],
      hasInteracted: false,
      showExpandedSuggestions: false,
      lastActivityTime: Date.now(),
    };

    try {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

      const isRefresh = navigationEntry?.type === "reload";

      if (isRefresh) {
        localStorage.removeItem(STORAGE_KEY);
        return emptyState;
      }

      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return emptyState;

      const parsed = JSON.parse(saved);

      return {
        response: parsed.response ?? null,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        hasInteracted: Boolean(parsed.hasInteracted),
        showExpandedSuggestions: Boolean(parsed.showExpandedSuggestions),
        lastActivityTime: parsed.lastActivityTime ?? Date.now(),
      };
    } catch {
      return emptyState;
    }
  }, []);

  const initialState = useMemo(() => getInitialState(), [getInitialState]);

  const saveState = useCallback((state: PersistedState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Ignore storage errors */
    }
  }, []);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Ignore */
    }
  }, []);

  /* ========================================================================
     BASIC STATE
     ======================================================================== */

  const [query, setQuery] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [response, setResponse] = useState<string | null>(initialState.response);

  const [suggestions, setSuggestions] = useState<string[]>(initialState.suggestions);

  const [hasInteracted, setHasInteracted] = useState(initialState.hasInteracted);

  const [lastActivityTime, setLastActivityTime] = useState(initialState.lastActivityTime);

  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(initialState.showExpandedSuggestions);

  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(Boolean(initialState.response));

  /* ========================================================================
     ANIMATION STATE
     ======================================================================== */

  const [isCollapsing, setIsCollapsing] = useState(false);

  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);

  const [showTypewriter, setShowTypewriter] = useState(false);

  const [suggestionPhase, setSuggestionPhase] = useState<SuggestionPhase>("hidden");

  const [activeSuggestion, setActiveSuggestion] = useState("");

  const suggestionIndexRef = useRef(0);

  const suggestionAnimationTimerRef = useRef<number | null>(null);

  /* ========================================================================
     VOICE STATE
     ======================================================================== */

  const [isVoiceSession, setIsVoiceSession] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const isVoiceSessionRef = useRef(false);

  const isLoadingRef = useRef(false);

  const isSpeakingRef = useRef(false);

  useEffect(() => {
    isVoiceSessionRef.current = isVoiceSession;
  }, [isVoiceSession]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  /* ========================================================================
     PLACEHOLDER
     ======================================================================== */

  const placeholderTexts = useMemo(() => ["Ask anything...", "hold search/shift to talk with GDx"], []);

  const [placeholderText, setPlaceholderText] = useState(placeholderTexts[0]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const [placeholderMode, setPlaceholderMode] = useState<"typing" | "waiting" | "deleting">("waiting");

  /* ========================================================================
     AUDIO
     ======================================================================== */

  const audioContextRef = useRef<AudioContext | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);

  const analyserDestinationConnectedRef = useRef(false);

  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);

  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const recognitionRef = useRef<any>(null);

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const speakTokenRef = useRef(0);

  const transcriptRef = useRef("");

  const silenceTimerRef = useRef<number | null>(null);

  /* ========================================================================
     HOLD TO SPEAK
     ======================================================================== */

  const holdTimerRef = useRef<number | null>(null);

  const isHoldingRef = useRef(false);

  const searchBarRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();

  /* ========================================================================
     SAVE STATE
     ======================================================================== */

  useEffect(() => {
    saveState({
      response,
      suggestions,
      hasInteracted,
      showExpandedSuggestions,
      lastActivityTime,
    });
  }, [response, suggestions, hasInteracted, showExpandedSuggestions, lastActivityTime, saveState]);

  /* ========================================================================
     AUDIO CONTEXT
     ======================================================================== */

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported.");
      }

      const context = new AudioContextClass();

      const analyser = context.createAnalyser();

      analyser.fftSize = 256;

      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      analyser.smoothingTimeConstant = 0.86;

      audioContextRef.current = context;

      analyserRef.current = analyser;

      setAnalyserNode(analyser);
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      void context.resume();
    }

    const analyser = analyserRef.current;

    if (!analyser) {
      throw new Error("Analyser initialization failed.");
    }

    /*
     * The analyser should only be connected to the output once.
     */
    if (!analyserDestinationConnectedRef.current) {
      analyser.connect(context.destination);

      analyserDestinationConnectedRef.current = true;
    }

    return {
      ctx: context,
      analyser,
    };
  }, []);

  /* ========================================================================
     PLACEHOLDER ANIMATION
     ======================================================================== */

  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || query) {
      return;
    }

    const target = placeholderTexts[placeholderIndex];

    if (placeholderMode === "waiting") {
      const timer = window.setTimeout(() => {
        setPlaceholderMode("deleting");
      }, 2600);

      return () => window.clearTimeout(timer);
    }

    if (placeholderMode === "deleting") {
      if (placeholderText.length === 0) {
        setPlaceholderIndex((index) => (index + 1) % placeholderTexts.length);

        setPlaceholderMode("typing");

        return;
      }

      const timer = window.setTimeout(() => {
        setPlaceholderText((value) => value.slice(0, -1));
      }, 28);

      return () => window.clearTimeout(timer);
    }

    if (placeholderMode === "typing") {
      if (placeholderText === target) {
        setPlaceholderMode("waiting");
        return;
      }

      const timer = window.setTimeout(() => {
        setPlaceholderText(target.slice(0, placeholderText.length + 1));
      }, 42);

      return () => window.clearTimeout(timer);
    }
  }, [
    placeholderText,
    placeholderMode,
    placeholderIndex,
    placeholderTexts,
    isLoading,
    isListening,
    isVoiceSession,
    query,
  ]);

  /* ========================================================================
     ACTIVITY
     ======================================================================== */

  const activityTimerRef = useRef<number | null>(null);

  const markActivity = useCallback((immediate = false) => {
    if (activityTimerRef.current !== null) {
      window.clearTimeout(activityTimerRef.current);
    }

    if (immediate) {
      setLastActivityTime(Date.now());
      return;
    }

    activityTimerRef.current = window.setTimeout(() => {
      setLastActivityTime(Date.now());
    }, 120);
  }, []);

  useEffect(() => {
    const onMouseMove = () => markActivity();

    const onInteraction = () => markActivity(true);

    window.addEventListener("mousemove", onMouseMove);

    window.addEventListener("keypress", onInteraction);

    window.addEventListener("click", onInteraction);

    window.addEventListener("scroll", onInteraction);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);

      window.removeEventListener("keypress", onInteraction);

      window.removeEventListener("click", onInteraction);

      window.removeEventListener("scroll", onInteraction);

      if (activityTimerRef.current !== null) {
        window.clearTimeout(activityTimerRef.current);
      }
    };
  }, [markActivity]);

  /* ========================================================================
     FIRST VISIT INTRO
     ======================================================================== */

  useEffect(() => {
    try {
      const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);

      if (!isFirstVisit || response || suggestions.length || isLoading) {
        return;
      }

      localStorage.setItem(FIRST_VISIT_KEY, "true");

      const timer = window.setTimeout(() => {
        handleSubmitRef.current?.(undefined, "introduce the website to the new user", false);
      }, 1500);

      return () => window.clearTimeout(timer);
    } catch {
      return;
    }
  }, []);

  /* ========================================================================
     TYPEWRITER TRIGGER
     ======================================================================== */

  useEffect(() => {
    if (response || suggestions.length || isVoiceSession) {
      setShowTypewriter(false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!hasInteracted) {
        setShowTypewriter(true);
      }
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [hasInteracted, response, suggestions.length, isVoiceSession]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivityTime;

      if (response || suggestions.length || isVoiceSession) {
        return;
      }

      if (idle > 10000 && hasInteracted && !isLoading) {
        setShowTypewriter(true);
      }
    }, 1500);

    return () => window.clearInterval(timer);
  }, [lastActivityTime, hasInteracted, isLoading, response, suggestions.length, isVoiceSession]);

  /* ========================================================================
     EXPANDED SUGGESTIONS
     ======================================================================== */

  useEffect(() => {
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivityTime;

      const shouldShow = Boolean(response || suggestions.length) && !isLoading && !isVoiceSession && idle > 10000;

      setShowExpandedSuggestions(shouldShow);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lastActivityTime, response, suggestions.length, isLoading, isVoiceSession]);

  /* ========================================================================
     ROTATING SUGGESTION
     ======================================================================== */

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

  useEffect(() => {
    if (!showTypewriter || isVoiceSession) {
      setSuggestionPhase("hidden");
      return;
    }

    if (suggestionAnimationTimerRef.current !== null) {
      window.clearTimeout(suggestionAnimationTimerRef.current);
    }

    const showNext = () => {
      const next = rotatingSuggestions[suggestionIndexRef.current % rotatingSuggestions.length];

      setActiveSuggestion(next);
      setSuggestionPhase("entering");

      suggestionAnimationTimerRef.current = window.setTimeout(() => {
        setSuggestionPhase("visible");

        suggestionAnimationTimerRef.current = window.setTimeout(() => {
          setSuggestionPhase("exiting");

          suggestionAnimationTimerRef.current = window.setTimeout(() => {
            suggestionIndexRef.current = (suggestionIndexRef.current + 1) % rotatingSuggestions.length;

            showNext();
          }, 650);
        }, 3900);
      }, 650);
    };

    showNext();

    return () => {
      if (suggestionAnimationTimerRef.current !== null) {
        window.clearTimeout(suggestionAnimationTimerRef.current);
      }
    };
  }, [showTypewriter, isVoiceSession, rotatingSuggestions]);

  /* ========================================================================
     STOP AUDIO
     ======================================================================== */

  const stopAudioOnly = useCallback(() => {
    speakTokenRef.current += 1;

    const source = currentSourceNodeRef.current;

    if (source) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* Already stopped */
      }

      try {
        source.disconnect();
      } catch {
        /* Already disconnected */
      }

      currentSourceNodeRef.current = null;
    }

    setIsSpeaking(false);
  }, []);

  /* ========================================================================
     STOP VOICE
     ======================================================================== */

  const stopVoiceSession = useCallback(() => {
    isVoiceSessionRef.current = false;

    setIsVoiceSession(false);

    stopAudioOnly();

    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = null;
    }

    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;

      try {
        recognition.stop();
      } catch {
        /* noop */
      }

      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());

      micStreamRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        /* noop */
      }

      micSourceRef.current = null;
    }

    setIsListening(false);

    transcriptRef.current = "";
  }, [stopAudioOnly]);

  /* ========================================================================
     VOICE RESPONSE
     ======================================================================== */

  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudioOnly();

      const token = speakTokenRef.current;

      if (!isVoiceSessionRef.current) {
        return;
      }

      let ctx: AudioContext;
      let analyser: AnalyserNode;

      try {
        ({ ctx, analyser } = getAudioContext());
      } catch {
        return;
      }

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
        return;
      }

      const sentences = clean
        .match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)
        ?.map((sentence) => sentence.trim())
        .filter(Boolean) ?? [clean];

      setIsSpeaking(true);

      const fetchAudio = async (sentence: string): Promise<AudioBuffer | null> => {
        try {
          const res = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              text: sentence,
            }),
          });

          if (!res.ok) {
            throw new Error(`TTS ${res.status}`);
          }

          const buffer = await res.arrayBuffer();

          return await ctx.decodeAudioData(buffer);
        } catch (error) {
          console.warn("TTS error:", error);

          return null;
        }
      };

      /*
       * Prefetch all sentences concurrently.
       */
      const buffers = Promise.all(sentences.map(fetchAudio));

      try {
        const decoded = await buffers;

        for (let i = 0; i < decoded.length; i++) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return;
          }

          const audio = decoded[i];

          if (!audio) continue;

          await new Promise<void>((resolve) => {
            if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
              resolve();
              return;
            }

            const source = ctx.createBufferSource();

            source.buffer = audio;

            source.playbackRate.value = 1.045;

            source.connect(analyser);

            currentSourceNodeRef.current = source;

            source.onended = () => {
              if (currentSourceNodeRef.current === source) {
                currentSourceNodeRef.current = null;
              }

              try {
                source.disconnect();
              } catch {
                /* noop */
              }

              resolve();
            };

            source.start();
          });
        }
      } finally {
        if (token === speakTokenRef.current) {
          setIsSpeaking(false);
        }
      }
    },
    [getAudioContext, stopAudioOnly],
  );

  /* ========================================================================
     START LISTENING
     ======================================================================== */

  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current || isLoadingRef.current || isSpeakingRef.current) {
      return;
    }

    const SpeechRecognition =
      (
        window as typeof window & {
          SpeechRecognition?: any;
          webkitSpeechRecognition?: any;
        }
      ).SpeechRecognition ||
      (
        window as typeof window & {
          SpeechRecognition?: any;
          webkitSpeechRecognition?: any;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported.");

      stopVoiceSession();

      return;
    }

    try {
      const { ctx, analyser } = getAudioContext();

      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        micSourceRef.current = ctx.createMediaStreamSource(micStreamRef.current);

        /*
         * IMPORTANT:
         * We intentionally don't connect this source
         * directly to destination.
         *
         * It only feeds the analyser.
         */
        micSourceRef.current.connect(analyser);
      }
    } catch (error) {
      console.warn("Microphone initialization failed:", error);

      stopVoiceSession();

      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (!isVoiceSessionRef.current) {
        return;
      }

      transcriptRef.current = "";

      setIsListening(true);
    };

    const submitTranscript = () => {
      if (silenceTimerRef.current !== null) {
        window.clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = null;
      }

      const text = transcriptRef.current.trim();

      if (!text) return;

      try {
        recognition.stop();
      } catch {
        /* noop */
      }

      setIsListening(false);

      handleSubmitRef.current?.(undefined, text, true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      transcriptRef.current = transcript;

      if (silenceTimerRef.current !== null) {
        window.clearTimeout(silenceTimerRef.current);
      }

      /*
       * Slightly longer than the original.
       * This prevents natural pauses from cutting
       * the user off too aggressively.
       */
      silenceTimerRef.current = window.setTimeout(submitTranscript, 1550);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition:", event.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) {
        return;
      }

      if (!isVoiceSessionRef.current) {
        return;
      }

      if (isLoadingRef.current || isSpeakingRef.current) {
        return;
      }

      const text = transcriptRef.current.trim();

      if (text) {
        submitTranscript();
        return;
      }

      /*
       * Browser speech recognition can stop
       * automatically even with continuous=true.
       *
       * Restart gently.
       */
      window.setTimeout(() => {
        if (
          isVoiceSessionRef.current &&
          !isLoadingRef.current &&
          !isSpeakingRef.current &&
          recognitionRef.current === recognition
        ) {
          try {
            recognition.start();
          } catch {
            /* Already running */
          }
        }
      }, 120);
    };

    try {
      recognition.start();
    } catch {
      /* Already started */
    }
  }, [getAudioContext, stopVoiceSession]);

  /* ========================================================================
     HOLD TO SPEAK
     ======================================================================== */

  const startHold = useCallback(() => {
    if (isLoading || isVoiceSession) {
      return;
    }

    try {
      getAudioContext();
    } catch {
      return;
    }

    isHoldingRef.current = true;

    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = window.setTimeout(() => {
      if (!isHoldingRef.current) {
        return;
      }

      isVoiceSessionRef.current = true;

      setIsVoiceSession(true);

      setResponse(null);
      setSuggestions([]);

      setShowTypewriter(false);
      setShowExpandedSuggestions(false);

      setHasInteracted(true);

      void startListeningContinuous();
    }, 320);
  }, [getAudioContext, isLoading, isVoiceSession, startListeningContinuous]);

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

      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);

        holdTimerRef.current = null;
      }

      /*
       * If the user only clicked instead of holding,
       * submit the typed query.
       */
      if (!isVoiceSessionRef.current && wasHolding && query.trim()) {
        handleSubmitRef.current?.(undefined, undefined, false);
      }
    },
    [query],
  );

  /* ========================================================================
     SHIFT KEY
     ======================================================================== */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift" || event.repeat || isListening || isLoading || isVoiceSession) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;

      const inputFocused =
        active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);

      if (inputFocused) {
        return;
      }

      event.preventDefault();

      startHold();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") {
        return;
      }

      handleHoldEnd(event);
    };

    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isListening, isLoading, isVoiceSession, startHold, handleHoldEnd]);

  /* ========================================================================
     SUBMIT
     ======================================================================== */

  const handleSubmit = async (event?: FormEvent, customQuery?: string, fromVoice = false) => {
    event?.preventDefault();

    const text = (customQuery ?? query).trim();

    if (!text) return;

    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);

    if (!customQuery) {
      setQuery("");
    }

    if (!fromVoice) {
      stopVoiceSession();

      if (response || suggestions.length) {
        /*
         * Soft collapse into thinking state.
         */
        setIsCollapsingToThink(true);

        await new Promise<void>((resolve) => window.setTimeout(resolve, 360));

        setResponse(null);
        setSuggestions([]);

        await new Promise<void>((resolve) => window.setTimeout(resolve, 120));

        setIsCollapsingToThink(false);
      } else {
        setResponse(null);
        setSuggestions([]);
      }
    }

    setIsLoading(true);

    try {
      const result = await sendChatMessage(text);

      const answer = String((result as any)?.response ?? "");

      const suggs = Array.isArray((result as any)?.suggestions) ? (result as any).suggestions : [];

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
      setIsLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  /* ========================================================================
     SUGGESTIONS
     ======================================================================== */

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);

    handleSubmitRef.current?.(undefined, suggestion, false);
  }, []);

  /* ========================================================================
     INPUT
     ======================================================================== */

  const handleInputFocus = useCallback(() => {
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
    markActivity(true);
  }, [markActivity]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);

      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);

      markActivity(true);
    },
    [markActivity],
  );

  /* ========================================================================
     OUTSIDE CLICK
     ======================================================================== */

  useEffect(() => {
    let collapseTimer: number | null = null;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchBarRef.current?.contains(target)) {
        return;
      }

      if (isVoiceSessionRef.current) {
        stopVoiceSession();
        return;
      }

      const element = event.target as Element;

      const navigationClick = Boolean(
        element?.closest?.('[class*="fixed top-6"]') ||
        element?.closest?.('[class*="fixed bottom-6 right-6"]') ||
        element?.closest?.('button[aria-label*="Scroll to top"]') ||
        element?.closest?.('button[aria-label*="Close modal"]'),
      );

      if (navigationClick) {
        return;
      }

      if (query.trim() && !response && suggestions.length === 0) {
        setQuery("");
        inputRef.current?.blur();
        return;
      }

      if (response || suggestions.length) {
        setIsCollapsing(true);
        setShowExpandedSuggestions(false);

        collapseTimer = window.setTimeout(() => {
          setResponse(null);
          setSuggestions([]);
          setIsCollapsing(false);

          clearPersistedState();
        }, 900);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    document.addEventListener("touchstart", handleOutside as EventListener);

    return () => {
      document.removeEventListener("mousedown", handleOutside);

      document.removeEventListener("touchstart", handleOutside as EventListener);

      if (collapseTimer !== null) {
        window.clearTimeout(collapseTimer);
      }
    };
  }, [query, response, suggestions.length, stopVoiceSession, clearPersistedState]);

  /* ========================================================================
     CLEANUP
     ======================================================================== */

  useEffect(() => {
    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }

      if (silenceTimerRef.current !== null) {
        window.clearTimeout(silenceTimerRef.current);
      }

      if (suggestionAnimationTimerRef.current !== null) {
        window.clearTimeout(suggestionAnimationTimerRef.current);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {
          /* noop */
        }
      }

      if (currentSourceNodeRef.current) {
        try {
          currentSourceNodeRef.current.stop();
        } catch {
          /* noop */
        }
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  /* ========================================================================
     DERIVED LAYOUT
     ======================================================================== */

  const hasContent = Boolean(response || suggestions.length) && !isVoiceSession;

  const isExpanded = hasContent && !isLoading && !isCollapsingToThink;

  /*
   * Instead of wildly changing dimensions,
   * keep the visual states very close together.
   *
   * This makes the expansion feel intentional.
   */
  const targetWidth = isVoiceSession ? "420px" : isExpanded ? "580px" : "460px";

  const targetRadius = isExpanded ? "18px" : "999px";

  /* ========================================================================
     RENDER
     ======================================================================== */

  return (
    <div
      ref={searchBarRef}
      className="
        fixed
        bottom-6
        left-1/2
        -translate-x-1/2
        z-50
        w-full
        px-4
        flex
        flex-col
        items-center
        gap-3
      "
    >
      {/* ====================================================================
          ROTATING SUGGESTION
          ==================================================================== */}

      <div
        className={`
          pointer-events-none
          transition-all
          duration-[650ms]
          ease-[cubic-bezier(0.16,1,0.3,1)]
          ${
            suggestionPhase === "hidden"
              ? "opacity-0 translate-y-3 scale-[0.96]"
              : suggestionPhase === "entering"
                ? "opacity-0 translate-y-3 scale-[0.96]"
                : suggestionPhase === "exiting"
                  ? "opacity-0 translate-y-3 scale-[0.97]"
                  : "opacity-100 translate-y-0 scale-100"
          }
          ${!showTypewriter || !activeSuggestion || isVoiceSession ? "invisible" : "visible"}
        `}
      >
        <button
          type="button"
          onClick={() => handleSuggestionClick(activeSuggestion)}
          className="
            pointer-events-auto
            max-w-[90vw]
            overflow-hidden
            text-ellipsis
            whitespace-nowrap
            rounded-full
            border
            border-white/10
            bg-white/[0.09]
            px-4
            py-2
            text-sm
            text-white/80
            backdrop-blur-2xl
            shadow-[0_8px_35px_rgba(0,0,0,0.16)]
            transition-all
            duration-500
            ease-[cubic-bezier(0.16,1,0.3,1)]
            hover:bg-white/[0.14]
            hover:text-white
            hover:-translate-y-0.5
            active:scale-[0.98]
          "
        >
          {activeSuggestion}
        </button>
      </div>

      {/* ====================================================================
          SEARCH BAR
          ==================================================================== */}

      <div
        className={`
          searchbar-shell
          mx-auto
          overflow-hidden
          select-none
          border
          border-white/[0.18]
          bg-white/[0.075]
          text-foreground
          backdrop-blur-2xl
          shadow-[0_10px_45px_rgba(0,0,0,0.16)]
          ${isLoading ? "searchbar-thinking" : ""}
          ${isListening ? "searchbar-listening" : ""}
        `}
        style={{
          width: targetWidth,
          maxWidth: "90vw",
          borderRadius: targetRadius,

          transition: [
            "width 900ms cubic-bezier(0.16,1,0.3,1)",
            "border-radius 900ms cubic-bezier(0.16,1,0.3,1)",
            "background-color 700ms cubic-bezier(0.16,1,0.3,1)",
            "border-color 700ms cubic-bezier(0.16,1,0.3,1)",
            "box-shadow 900ms cubic-bezier(0.16,1,0.3,1)",
          ].join(", "),

          WebkitTouchCallout: "none",

          WebkitUserSelect: "none",
        }}
      >
        <div
          className={`
            searchbar-inner
            ${isExpanded ? "expanded" : "collapsed"}
          `}
        >
          {/* ================================================================
              EXPANDED SUGGESTIONS
              ================================================================ */}

          <div
            className={`
              suggestions-wrapper
              ${
                showExpandedSuggestions && suggestions.length && !isVoiceSession
                  ? "suggestions-visible"
                  : "suggestions-hidden"
              }
            `}
          >
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 px-3 pb-3">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="
                        suggestion-chip
                        rounded-full
                        border
                        border-white/10
                        bg-white/[0.08]
                        px-3
                        py-1
                        text-xs
                        sm:text-sm
                        text-white/75
                        transition-all
                        duration-500
                        ease-[cubic-bezier(0.16,1,0.3,1)]
                        hover:-translate-y-0.5
                        hover:bg-white/[0.14]
                        hover:text-white
                        active:scale-[0.97]
                        disabled:pointer-events-none
                        disabled:opacity-50
                      "
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ================================================================
              RESPONSE
              ================================================================ */}

          <div
            className={`
              response-wrapper
              ${
                response && !isVoiceSession && !isCollapsing && !isCollapsingToThink
                  ? "response-visible"
                  : "response-hidden"
              }
            `}
          >
            {response && !isVoiceSession && (
              <div
                className="
                    response-content
                    scrollbar-hide
                    px-4
                    text-sm
                    leading-relaxed
                    text-foreground
                  "
                dangerouslySetInnerHTML={{
                  __html: convertMarkdownToHtml(response),
                }}
              />
            )}
          </div>

          {/* ================================================================
              FORM
              ================================================================ */}

          <form
            onSubmit={(event) => handleSubmit(event, undefined, false)}
            className="
              searchbar-form
              relative
              flex
              min-h-[40px]
              items-center
              gap-2
            "
            onFocus={handleInputFocus}
          >
            {/* --------------------------------------------------------------
                TEXT INPUT
                -------------------------------------------------------------- */}

            {!isVoiceSession && (
              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
                <Input
                  ref={inputRef}
                  type="text"
                  value={query}
                  placeholder={isLoading ? "Thinking…" : placeholderText}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  aria-label="Ask anything"
                  className={`
                    h-10
                    w-full
                    border-0
                    bg-transparent
                    px-4
                    text-base
                    text-foreground
                    outline-none
                    ring-0
                    placeholder:text-white/40
                    focus-visible:ring-0
                    focus-visible:ring-offset-0
                    ${isLoading ? "thinking-placeholder" : ""}
                  `}
                />
              </div>
            )}

            {/* --------------------------------------------------------------
                VOICE WAVEFORM
                -------------------------------------------------------------- */}

            {isVoiceSession && (
              <div
                className="
                  flex
                  min-w-0
                  flex-1
                  items-center
                  gap-3
                  pl-3
                "
              >
                <BarWaveform analyser={analyserNode} isActive={isListening || isSpeaking} />

                <RecordingTimer isActive={isListening} />
              </div>
            )}

            {/* --------------------------------------------------------------
                ACTION BUTTON
                -------------------------------------------------------------- */}

            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                aria-label="End voice mode"
                title="End voice mode"
                className="
                  voice-close
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-white/[0.10]
                  text-white/80
                  transition-all
                  duration-500
                  ease-[cubic-bezier(0.16,1,0.3,1)]
                  hover:scale-105
                  hover:bg-white/[0.17]
                  hover:text-white
                  active:scale-90
                "
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div
                className="
                  shrink-0
                  select-none
                "
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                }}
              >
                <div
                  className={`
                    search-action
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    transition-all
                    duration-500
                    ease-[cubic-bezier(0.16,1,0.3,1)]
                    hover:scale-110
                    active:scale-90
                    ${isListening ? "bg-white/[0.15]" : "hover:bg-white/[0.08]"}
                  `}
                >
                  <Search
                    className={`
                      h-4
                      w-4
                      text-white/45
                      transition-all
                      duration-500
                      ${isLoading ? "thinking-icon" : ""}
                      ${isListening ? "scale-110 !text-white" : ""}
                    `}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ====================================================================
          CSS
          ==================================================================== */}

      <style jsx>{`
        /* ------------------------------------------------------------------
           CORE PHYSICS
           ------------------------------------------------------------------ */

        .searchbar-inner {
          padding: 8px;
          transition:
            padding 900ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: center bottom;
        }

        .searchbar-inner.expanded {
          padding: 20px 20px 14px;
        }

        .searchbar-inner.collapsed {
          padding: 8px;
        }

        /* ------------------------------------------------------------------
           RESPONSE
           ------------------------------------------------------------------ */

        .response-wrapper {
          overflow: hidden;

          transform-origin: center bottom;

          transition:
            opacity 650ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 750ms cubic-bezier(0.16, 1, 0.3, 1),
            max-height 850ms cubic-bezier(0.16, 1, 0.3, 1),
            margin 850ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .response-visible {
          max-height: 320px;
          margin-bottom: 12px;
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }

        .response-hidden {
          max-height: 0;
          margin-bottom: 0;
          opacity: 0;
          transform:
            translateY(8px)
            scale(0.985);
        }

        .response-content {
          max-height: 300px;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
        }

        .response-content::-webkit-scrollbar {
          display: none;
        }

        /* ------------------------------------------------------------------
           SUGGESTIONS
           ------------------------------------------------------------------ */

        .suggestions-wrapper {
          overflow: hidden;

          transition:
            opacity 650ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 750ms cubic-bezier(0.16, 1, 0.3, 1),
            max-height 750ms cubic-bezier(0.16, 1, 0.3, 1),
            margin 750ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .suggestions-visible {
          max-height: 140px;
          margin-bottom: 2px;
          opacity: 1;
          transform:
            translateY(0)
            scale(1);
        }

        .suggestions-hidden {
          max-height: 0;
          margin-bottom: 0;
          opacity: 0;
          transform:
            translateY(-5px)
            scale(0.985);
          pointer-events: none;
        }

        .suggestion-chip {
          transform: translateZ(0);
          will-change: transform, opacity;
        }

        /* ------------------------------------------------------------------
           THINKING
           ------------------------------------------------------------------ */

        .searchbar-thinking {
          border-color: rgba(
            255,
            255,
            255,
            0.24
          );

          background: rgba(
            255,
            255,
            255,
            0.06
          );

          animation:
            thinkingPulse
            2.8s
            cubic-bezier(0.45, 0, 0.55, 1)
            infinite;
        }

        @keyframes thinkingPulse {
          0%,
          100% {
            box-shadow:
              0 8px 40px rgba(
                0,
                0,
                0,
                0.14
              ),
              0 0 0 rgba(
                255,
                255,
                255,
                0
              );
          }

          50% {
            box-shadow:
              0 10px 45px rgba(
                0,
                0,
                0,
                0.18
              ),
              0 0 24px rgba(
                255,
                255,
                255,
                0.10
              );
          }
        }

        .thinking-placeholder::placeholder {
          color: rgba(
            255,
            255,
            255,
            0.55
          );

          animation:
            placeholderGlow
            2.8s
            cubic-bezier(0.45, 0, 0.55, 1)
            infinite;
        }

        @keyframes placeholderGlow {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 0.9;
          }
        }

        .thinking-icon {
          animation:
            iconBreath
            2.4s
            cubic-bezier(0.45, 0, 0.55, 1)
            infinite;
        }

        @keyframes iconBreath {
          0%,
          100% {
            opacity: 0.35;
            filter:
              drop-shadow(
                0 0 0
                rgba(
                  255,
                  255,
                  255,
                  0
                )
              );
          }

          50% {
            opacity: 0.85;
            filter:
              drop-shadow(
                0 0 5px
                rgba(
                  255,
                  255,
                  255,
                  0.3
                )
              );
          }
        }

        /* ------------------------------------------------------------------
           LISTENING
           ------------------------------------------------------------------ */

        .searchbar-listening {
          border-color: rgba(
            255,
            255,
            255,
            0.28
          );

          background: rgba(
            255,
            255,
            255,
            0.065
          );

          animation:
            listeningPulse
            3.2s
            cubic-bezier(0.45, 0, 0.55, 1)
            infinite;
        }

        @keyframes listeningPulse {
          0%,
          100% {
            box-shadow:
              0 10px 45px rgba(
                0,
                0,
                0,
                0.15
              ),
              0 0 8px rgba(
                255,
                255,
                255,
                0.04
              );
          }

          50% {
            box-shadow:
              0 12px 50px rgba(
                0,
                0,
                0,
                0.18
              ),
              0 0 26px rgba(
                255,
                255,
                255,
                0.11
              );
          }
        }

        /* ------------------------------------------------------------------
           ACTION BUTTON
           ------------------------------------------------------------------ */

        .search-action,
        .voice-close {
          transform: translateZ(0);
          will-change: transform;
        }

        /* ------------------------------------------------------------------
           INLINE CODE
           ------------------------------------------------------------------ */

        .inline-code {
          background: rgba(
            255,
            255,
            255,
            0.06
          );

          padding:
            0.08rem
            0.3rem;

          border-radius: 5px;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            "Roboto Mono",
            monospace;

          font-size: 0.9em;
        }

        /* ------------------------------------------------------------------
           REDUCED MOTION
           ------------------------------------------------------------------ */

        @media (
          prefers-reduced-motion: reduce
        ) {
          .searchbar-shell,
          .searchbar-inner,
          .response-wrapper,
          .suggestions-wrapper,
          .suggestion-chip,
          .search-action,
          .voice-close {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
