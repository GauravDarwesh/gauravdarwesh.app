"use client";

import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ---------- Configuration ---------- */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

const STORAGE_KEY = "searchbar_state";
const FIRST_VISIT_KEY = "gd_ai_first_visit";
const TTS_QUOTA_BLOCKED_UNTIL_KEY = "gdx_tts_quota_blocked_until";
const TTS_QUOTA_FALLBACK_MS = 24 * 60 * 60 * 1000;

const HOLD_THRESHOLD_MS = 350;
const SILENCE_MS = 1400;
const RESPONSE_MAX_HEIGHT = 340;

/* ---------- Safe Markdown -> HTML ---------- */
/*
 * The original implementation put raw model output directly into
 * dangerouslySetInnerHTML. Escape first, then add only the formatting
 * we explicitly support.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const safeHref = (value: string) => {
  try {
    const url = new URL(value, window.location.origin);
    return /^(https?:|mailto:|tel:)$/.test(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

const convertMarkdownToHtml = (text: string): string => {
  const escaped = escapeHtml(text);

  const processInline = (input: string) => {
    let str = input;

    str = str.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    str = str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    str = str.replace(/\*(.*?)\*/g, "<em>$1</em>");

    str = str.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label: string, href: string) =>
        `<a href="${safeHref(href)}" target="_blank" rel="noopener noreferrer" class="response-link">${label}</a>`,
    );

    return str;
  };

  const lines = escaped.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre class="code-block"><code>${codeLines.join("\n")}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      closeList();
      html.push('<div class="response-spacer"></div>');
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${processInline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${processInline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${processInline(line.slice(2))}</h1>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${processInline(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${processInline(line)}</p>`);
  }

  if (inCodeBlock) {
    html.push(`<pre class="code-block"><code>${codeLines.join("\n")}</code></pre>`);
  }

  closeList();
  return html.join("");
};

/* ---------- Shared fade / collapse primitive ---------- */

function Fade({ show, duration = 350, children }: { show: boolean; duration?: number; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (show) {
      setMounted(true);
    } else {
      timer = setTimeout(() => setMounted(false), duration);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [show, duration]);

  if (!mounted) return null;

  return (
    <div
      className={`fade-shell ${show ? "fade-shell-visible" : "fade-shell-hidden"}`}
      style={{ "--fade-duration": `${duration}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------- Smooth audio waveform ---------- */
/*
 * Important fixes over the old canvas:
 * - canvas dimensions are NOT rewritten every animation frame
 * - ResizeObserver handles size changes
 * - values are interpolated instead of jumping directly between FFT frames
 * - mic and playback analysers are independent, so mic audio is never sent
 *   back to the speakers
 */
const BarWaveform: React.FC<{
  analyser: AnalyserNode | null;
  isActive: boolean;
  mode: "listening" | "speaking";
}> = ({ analyser, isActive, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });
  const valuesRef = useRef<number[]>([]);
  const phaseRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      if (
        dimensionsRef.current.width === width &&
        dimensionsRef.current.height === height &&
        dimensionsRef.current.dpr === dpr
      ) {
        return;
      }

      dimensionsRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      valuesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    if (analyser) {
      analyser.smoothingTimeConstant = 0.88;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -15;
    }

    let lastTime = performance.now();

    const draw = (now: number) => {
      const { width: w, height: h, dpr } = dimensionsRef.current;

      if (!w || !h) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const delta = Math.min(40, now - lastTime);
      lastTime = now;
      const dt = delta / 1000;

      phaseRef.current += dt;

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
      }

      const barWidth = 2;
      const gap = 2.3;
      const barCount = Math.max(10, Math.floor(w / (barWidth + gap)));
      const previous = valuesRef.current;

      if (previous.length !== barCount) {
        valuesRef.current = Array.from({ length: barCount }, (_, i) => previous[i] ?? 0.12);
      }

      const values = valuesRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const center = h / 2;
      const maxHeight = h * 0.82;

      for (let i = 0; i < barCount; i++) {
        let target = 0.08;

        if (analyser && data) {
          /*
           * Bias towards speech-relevant lower/mid frequencies rather than
           * letting a single high-frequency spike dominate the waveform.
           */
          const normalized = i / Math.max(1, barCount - 1);
          const sourceIndex = Math.min(data.length - 1, Math.floor(Math.pow(normalized, 1.55) * data.length * 0.72));

          target = data[sourceIndex] / 255;

          // Give the center a little more presence.
          const centerWeight = 0.72 + 0.28 * Math.sin(Math.PI * normalized);
          target *= centerWeight;
        } else {
          const t = phaseRef.current;
          const waveA = Math.sin(t * (mode === "speaking" ? 3.1 : 2.5) + i * 0.34);
          const waveB = Math.sin(t * 5.2 + i * 0.12);
          target = 0.12 + Math.abs(waveA) * (mode === "speaking" ? 0.25 : 0.16) + Math.abs(waveB) * 0.08;
        }

        // Smoothly approach the new FFT value.
        const smoothing = 1 - Math.exp(-dt * 14);
        values[i] += (target - values[i]) * smoothing;

        // Gentle falloff at both edges keeps the waveform visually centered.
        const edge = Math.sin((Math.PI * (i + 1)) / (barCount + 1));
        const value = Math.max(0.07, Math.min(1, values[i] * (0.72 + edge * 0.28)));

        const barHeight = Math.max(3, value * maxHeight);
        const x = i * (barWidth + gap);
        const y = center - barHeight / 2;

        ctx.fillStyle = `rgba(255,255,255,${0.22 + value * 0.58})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.25);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [analyser, isActive, mode]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="waveform-container" aria-hidden="true">
      <canvas ref={canvasRef} className="pointer-events-none block h-full w-full" />
    </div>
  );
};

/* ---------- Recording timer ---------- */

const RecordingTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      startedAtRef.current = null;
      setElapsed(0);
      return;
    }

    startedAtRef.current = performance.now();

    const tick = () => {
      const started = startedAtRef.current;
      if (started !== null) {
        setElapsed(Math.floor((performance.now() - started) / 1000));
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [isActive]);

  if (!isActive) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <span className="recording-timer">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

/* ---------- SearchBar ---------- */

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

type PersistedState = {
  response: string | null;
  suggestions: string[];
  hasInteracted: boolean;
  showExpandedSuggestions: boolean;
  lastActivityTime: number;
};

const EMPTY_PERSISTED_STATE = (): PersistedState => ({
  response: null,
  suggestions: [],
  hasInteracted: false,
  showExpandedSuggestions: false,
  lastActivityTime: Date.now(),
});

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const loadPersistedState = useCallback((): PersistedState => {
    if (typeof window === "undefined") return EMPTY_PERSISTED_STATE();

    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

      const isReload =
        navigation?.type === "reload" ||
        (performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1;

      /*
       * Do not resurrect an old conversation after a hard refresh.
       * This matches the original intended behavior while remaining robust
       * when PerformanceNavigationTiming is unavailable.
       */
      if (isReload) {
        localStorage.removeItem(STORAGE_KEY);
        return EMPTY_PERSISTED_STATE();
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return EMPTY_PERSISTED_STATE();

      const parsed = JSON.parse(saved);
      return {
        response: typeof parsed.response === "string" ? parsed.response : null,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        hasInteracted: Boolean(parsed.hasInteracted),
        showExpandedSuggestions: Boolean(parsed.showExpandedSuggestions),
        lastActivityTime: typeof parsed.lastActivityTime === "number" ? parsed.lastActivityTime : Date.now(),
      };
    } catch {
      return EMPTY_PERSISTED_STATE();
    }
  }, []);

  const persisted = useMemo(loadPersistedState, [loadPersistedState]);

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(persisted.response);
  const [suggestions, setSuggestions] = useState<string[]>(persisted.suggestions);

  const [hasInteracted, setHasInteracted] = useState(persisted.hasInteracted);
  const [lastActivityTime, setLastActivityTime] = useState(persisted.lastActivityTime);

  const [showTypewriter, setShowTypewriter] = useState(false);
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(persisted.showExpandedSuggestions);

  const [suggestionPhase, setSuggestionPhase] = useState<"emerging" | "visible" | "retreating" | "hidden">("hidden");
  const [fullText, setFullText] = useState("");
  const suggestionIndexRef = useRef(0);

  const [placeholderText, setPlaceholderText] = useState("Ask anything...");
  const [placeholderPhase, setPlaceholderPhase] = useState<"typing" | "pause" | "deleting">("pause");
  const [placeholderTarget, setPlaceholderTarget] = useState(0);

  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(Boolean(persisted.response));

  /* Voice state */
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

  /* DOM / timer refs */
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outsideCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHoldingRef = useRef(false);
  const wasVoiceGestureRef = useRef(false);

  /* Recognition / audio refs */
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);

  const [waveformAnalyser, setWaveformAnalyser] = useState<AnalyserNode | null>(null);

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speakTokenRef = useRef(0);

  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();
  const startListeningContinuousRef = useRef<() => void>();

  const placeholderTexts = useMemo(() => ["Ask anything...", "hold shift/search to talk with GDx"], []);

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
      "✨ What Technologies does Gaurav use?",
      "✨ What is Gaurav's Work Philosophy?",
    ],
    [],
  );

  /* ---------- Persistence ---------- */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          response,
          suggestions,
          hasInteracted,
          showExpandedSuggestions,
          lastActivityTime,
        }),
      );
    } catch {
      /* localStorage can be unavailable in privacy modes */
    }
  }, [response, suggestions, hasInteracted, showExpandedSuggestions, lastActivityTime]);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  /* ---------- Audio context ---------- */

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return null;

      const ctx = new AudioContextClass();
      const micAnalyser = ctx.createAnalyser();
      const playbackAnalyser = ctx.createAnalyser();

      micAnalyser.fftSize = 512;
      micAnalyser.smoothingTimeConstant = 0.9;

      playbackAnalyser.fftSize = 512;
      playbackAnalyser.smoothingTimeConstant = 0.9;

      /*
       * Each analyser has its own graph. Playback analyser connects to the
       * speakers; mic analyser intentionally does NOT.
       */
      playbackAnalyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      micAnalyserRef.current = micAnalyser;
      playbackAnalyserRef.current = playbackAnalyser;
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return {
      ctx: audioContextRef.current,
      micAnalyser: micAnalyserRef.current,
      playbackAnalyser: playbackAnalyserRef.current,
    };
  }, []);

  /* ---------- Placeholder animation ---------- */

  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || query) return;

    const target = placeholderTexts[placeholderTarget];

    if (placeholderPhase === "pause") {
      const timer = setTimeout(() => setPlaceholderPhase("deleting"), 2800);
      return () => clearTimeout(timer);
    }

    if (placeholderPhase === "deleting") {
      if (placeholderText.length === 0) {
        setPlaceholderTarget((prev) => (prev + 1) % placeholderTexts.length);
        setPlaceholderPhase("typing");
        return;
      }

      const timer = setTimeout(() => setPlaceholderText((value) => value.slice(0, -1)), 24);
      return () => clearTimeout(timer);
    }

    if (placeholderPhase === "typing") {
      if (placeholderText === target) {
        setPlaceholderPhase("pause");
        return;
      }

      const timer = setTimeout(() => setPlaceholderText(target.slice(0, placeholderText.length + 1)), 38);
      return () => clearTimeout(timer);
    }
  }, [
    placeholderPhase,
    placeholderTarget,
    placeholderText,
    placeholderTexts,
    isLoading,
    isListening,
    isVoiceSession,
    query,
  ]);

  /* ---------- Activity tracking ---------- */

  const markActivity = useCallback(() => {
    if (activityDebounceRef.current) {
      clearTimeout(activityDebounceRef.current);
    }

    activityDebounceRef.current = setTimeout(() => {
      setLastActivityTime(Date.now());
    }, 120);
  }, []);

  useEffect(() => {
    const immediateActivity = () => setLastActivityTime(Date.now());

    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("pointerdown", immediateActivity, { passive: true });
    window.addEventListener("keydown", immediateActivity, { passive: true });
    window.addEventListener("scroll", immediateActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("pointerdown", immediateActivity);
      window.removeEventListener("keydown", immediateActivity);
      window.removeEventListener("scroll", immediateActivity);

      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
      }
    };
  }, [markActivity]);

  /* ---------- Typewriter suggestion lifecycle ---------- */

  useEffect(() => {
    if (response || suggestions.length || isVoiceSession || isLoading) {
      setShowTypewriter(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!hasInteracted) setShowTypewriter(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [hasInteracted, response, suggestions.length, isVoiceSession, isLoading]);

  useEffect(() => {
    if (!showTypewriter || isVoiceSession) {
      setSuggestionPhase("hidden");
      return;
    }

    let retreatTimer: ReturnType<typeof setTimeout> | undefined;
    let visibleTimer: ReturnType<typeof setTimeout> | undefined;

    setFullText(rotatingSuggestions[suggestionIndexRef.current]);
    setSuggestionPhase("emerging");

    visibleTimer = setTimeout(() => setSuggestionPhase("visible"), 650);

    const cycle = setTimeout(() => {
      setSuggestionPhase("retreating");

      retreatTimer = setTimeout(() => {
        suggestionIndexRef.current = (suggestionIndexRef.current + 1) % rotatingSuggestions.length;
        setFullText(rotatingSuggestions[suggestionIndexRef.current]);
        setSuggestionPhase("emerging");

        visibleTimer = setTimeout(() => setSuggestionPhase("visible"), 650);
      }, 500);
    }, 4500);

    return () => {
      clearTimeout(cycle);
      if (retreatTimer) clearTimeout(retreatTimer);
      if (visibleTimer) clearTimeout(visibleTimer);
    };
  }, [showTypewriter, rotatingSuggestions, isVoiceSession]);

  /* ---------- Expanded suggestions after idle ---------- */

  useEffect(() => {
    if (!response && suggestions.length === 0) return;

    const idle = Date.now() - lastActivityTime;
    const shouldShow = !isLoading && !isVoiceSession && idle > 10000 && suggestions.length > 0;

    setShowExpandedSuggestions(shouldShow);
  }, [lastActivityTime, response, suggestions.length, isLoading, isVoiceSession]);

  /* ---------- Stop audio ---------- */

  const stopAudioOnly = useCallback(() => {
    speakTokenRef.current += 1;

    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.stop();
      } catch {
        /* already stopped */
      }

      try {
        currentSourceNodeRef.current.disconnect();
      } catch {
        /* noop */
      }

      currentSourceNodeRef.current = null;
    }

    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setWaveformAnalyser(isListening ? micAnalyserRef.current : null);
  }, [isListening]);

  /* ---------- Voice session cleanup ---------- */

  const stopVoiceSession = useCallback(() => {
    isVoiceSessionRef.current = false;
    setIsVoiceSession(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    speakTokenRef.current += 1;

    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.stop();
      } catch {
        /* noop */
      }

      try {
        currentSourceNodeRef.current.disconnect();
      } catch {
        /* noop */
      }

      currentSourceNodeRef.current = null;
    }

    setIsSpeaking(false);
    isSpeakingRef.current = false;

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
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
      micSourceRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    setIsListening(false);
    setWaveformAnalyser(null);

    if (audioContextRef.current) {
      void audioContextRef.current.suspend().catch(() => undefined);
    }

    transcriptRef.current = "";
  }, []);

  /* ---------- TTS ---------- */

  const cleanForSpeech = useCallback((raw: string) => {
    return raw
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
  }, []);

  const speakWithBrowser = useCallback((sentence: string, token: number) => {
    return new Promise<void>((resolve) => {
      if (!("speechSynthesis" in window) || token !== speakTokenRef.current) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1.02;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudioOnly();

      const token = ++speakTokenRef.current;
      const audio = getAudioContext();

      if (!audio) return;

      const { ctx, playbackAnalyser } = audio;
      if (!ctx || !playbackAnalyser) return;

      const clean = cleanForSpeech(raw);
      if (!clean) {
        if (isVoiceSessionRef.current) {
          startListeningContinuousRef.current?.();
        }
        return;
      }

      const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((s) => s.trim()) ?? [clean];

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setWaveformAnalyser(playbackAnalyser);

      let quotaBlockedUntil = Number(sessionStorage.getItem(TTS_QUOTA_BLOCKED_UNTIL_KEY) ?? 0);

      if (!Number.isFinite(quotaBlockedUntil) || quotaBlockedUntil <= Date.now()) {
        quotaBlockedUntil = 0;
        sessionStorage.removeItem(TTS_QUOTA_BLOCKED_UNTIL_KEY);
      }

      const fetchAudioBuffer = async (sentence: string): Promise<AudioBuffer | null> => {
        if (quotaBlockedUntil > Date.now()) return null;

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
            if (res.status === 429) {
              quotaBlockedUntil = Date.now() + TTS_QUOTA_FALLBACK_MS;
              sessionStorage.setItem(TTS_QUOTA_BLOCKED_UNTIL_KEY, String(quotaBlockedUntil));
            }

            throw new Error(`TTS status ${res.status}`);
          }

          const bytes = await res.arrayBuffer();
          return await ctx.decodeAudioData(bytes);
        } catch (error) {
          console.warn("TTS fetch/decode error:", error);
          return null;
        }
      };

      try {
        for (const sentence of sentences) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
            return;
          }

          const buffer = await fetchAudioBuffer(sentence);

          if (!buffer) {
            await speakWithBrowser(sentence, token);
            continue;
          }

          await new Promise<void>((resolve) => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = 1.06;
            source.connect(playbackAnalyser);
            currentSourceNodeRef.current = source;

            source.onended = () => {
              if (currentSourceNodeRef.current === source) {
                currentSourceNodeRef.current = null;
              }
              resolve();
            };

            try {
              source.start();
            } catch {
              resolve();
            }
          });
        }
      } finally {
        if (token === speakTokenRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setWaveformAnalyser(null);

          if (isVoiceSessionRef.current) {
            startListeningContinuousRef.current?.();
          }
        }
      }
    },
    [cleanForSpeech, getAudioContext, speakWithBrowser, stopAudioOnly],
  );

  /* ---------- Continuous speech recognition ---------- */

  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current || isLoadingRef.current) return;

    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      stopVoiceSession();
      return;
    }

    try {
      const audio = getAudioContext();

      if (!audio) throw new Error("Web Audio API is unavailable.");

      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (audio.micAnalyser) {
          micSourceRef.current = audio.ctx.createMediaStreamSource(micStreamRef.current);
          micSourceRef.current.connect(audio.micAnalyser);
        }
      }

      if (!isVoiceSessionRef.current) return;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
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
      transcriptRef.current = "";

      recognition.onstart = () => {
        if (!isVoiceSessionRef.current) return;

        setIsListening(true);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setWaveformAnalyser(micAnalyserRef.current);
        transcriptRef.current = "";
      };

      const submitTranscript = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const text = transcriptRef.current.trim();
        if (!text || !isVoiceSessionRef.current) return;

        try {
          recognition.stop();
        } catch {
          /* noop */
        }

        setIsListening(false);
        handleSubmitRef.current?.(undefined, text, true);
      };

      recognition.onresult = (event: any) => {
        let combined = "";

        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0]?.transcript ?? "";
        }

        transcriptRef.current = combined;

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(submitTranscript, SILENCE_MS);
      };

      recognition.onerror = (event: any) => {
        if (event?.error !== "no-speech") {
          console.warn("Speech recognition error:", event?.error);
        }

        setIsListening(false);
        setWaveformAnalyser(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setWaveformAnalyser(null);

        if (!isVoiceSessionRef.current) return;
        if (isLoadingRef.current || isSpeakingRef.current) return;

        const text = transcriptRef.current.trim();

        if (text) {
          transcriptRef.current = "";
          handleSubmitRef.current?.(undefined, text, true);
          return;
        }

        /*
         * Chrome/Safari can end recognition spontaneously. Restarting from
         * here keeps the "conversation" continuous without creating a new
         * mic stream every time.
         */
        window.setTimeout(() => {
          if (isVoiceSessionRef.current && !isLoadingRef.current && !isSpeakingRef.current) {
            startListeningContinuousRef.current?.();
          }
        }, 120);
      };

      try {
        recognition.start();
      } catch {
        /* start() can throw if the recognizer is already starting */
      }
    } catch (error) {
      console.warn("Microphone setup failed:", error);
      stopVoiceSession();
    }
  }, [getAudioContext, stopVoiceSession]);

  startListeningContinuousRef.current = startListeningContinuous;

  /* ---------- Unified submit ---------- */

  const handleSubmit = useCallback(
    async (e?: FormEvent, customQuery?: string, fromVoice = false) => {
      e?.preventDefault();

      const text = (customQuery ?? query).trim();
      if (!text || isLoadingRef.current) return;

      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);

      if (!customQuery) setQuery("");

      if (!fromVoice) {
        stopVoiceSession();
        stopAudioOnly();
      }

      if (response || suggestions.length > 0) {
        setIsCollapsingToThink(true);

        await new Promise((resolve) => setTimeout(resolve, 320));

        setResponse(null);
        setSuggestions([]);
        setIsCollapsingToThink(false);
      } else {
        setResponse(null);
        setSuggestions([]);
      }

      setIsLoading(true);
      isLoadingRef.current = true;

      try {
        const result = await sendChatMessage(text);
        const answer = String((result as any)?.response ?? "");
        const nextSuggestions = Array.isArray((result as any)?.suggestions) ? (result as any).suggestions : [];

        if (fromVoice && isVoiceSessionRef.current) {
          void speakVoiceResponse(answer);
        } else {
          setResponse(answer);
          setSuggestions(nextSuggestions);
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
        isLoadingRef.current = false;
      }
    },
    [onSearch, query, response, suggestions.length, speakVoiceResponse, stopAudioOnly, stopVoiceSession],
  );

  handleSubmitRef.current = handleSubmit;

  /* ---------- Hold / click search button ---------- */

  const startHold = useCallback(() => {
    if (isLoadingRef.current || isVoiceSessionRef.current) return;

    stopAudioOnly();
    isHoldingRef.current = true;
    wasVoiceGestureRef.current = false;

    /*
     * getUserMedia is intentionally called from the pointer gesture. This
     * preserves browser permission behavior while the actual voice session
     * still waits for the hold threshold.
     */
    let pendingStream: MediaStream | null = null;

    const micPromise = navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        pendingStream = stream;
      })
      .catch((error) => {
        console.warn("Microphone permission failed:", error);
      });

    holdTimerRef.current = setTimeout(async () => {
      if (!isHoldingRef.current) {
        if (pendingStream) {
          pendingStream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      wasVoiceGestureRef.current = true;
      inputRef.current?.blur();

      await micPromise;

      if (!isHoldingRef.current) {
        if (pendingStream) {
          pendingStream.getTracks().forEach((track) => track.stop());
        }
        return;
      }

      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);
      setResponse(null);
      setSuggestions([]);

      isVoiceSessionRef.current = true;
      setIsVoiceSession(true);

      if (pendingStream) {
        micStreamRef.current = pendingStream;
      }

      startListeningContinuousRef.current?.();
    }, HOLD_THRESHOLD_MS);
  }, [stopAudioOnly]);

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

      if (isVoiceSessionRef.current) return;

      /*
       * Short click = search/submit.
       * Long hold = voice and therefore must not also submit the existing
       * query on release.
       */
      if (wasHolding && !wasVoiceGestureRef.current && query.trim()) {
        handleSubmitRef.current?.();
      }
    },
    [query],
  );

  /* ---------- Desktop Shift shortcut ---------- */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift" || event.repeat || isLoadingRef.current || isVoiceSessionRef.current) {
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }

      event.preventDefault();
      startHold();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        handleHoldEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleHoldEnd, startHold]);

  /* ---------- First-visit intro ---------- */

  useEffect(() => {
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY) && !response && suggestions.length === 0 && !isLoading) {
        localStorage.setItem(FIRST_VISIT_KEY, "true");

        const timer = setTimeout(() => {
          handleSubmitRef.current?.(undefined, "introduce the website to the new user", false);
        }, 1500);

        return () => clearTimeout(timer);
      }
    } catch {
      /* noop */
    }
  }, []);

  /* ---------- Outside click collapse ---------- */

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (searchBarRef.current?.contains(target)) return;

      const element = event.target as Element | null;
      const navigationClick =
        Boolean(element?.closest?.('[class*="fixed top-6"]')) ||
        Boolean(element?.closest?.('[class*="fixed bottom-6 right-6"]')) ||
        Boolean(element?.closest?.('button[aria-label*="Scroll to top"]')) ||
        Boolean(element?.closest?.('button[aria-label*="Close modal"]'));

      if (navigationClick) return;

      if (isVoiceSessionRef.current) {
        stopVoiceSession();
        return;
      }

      if (query.trim() && !response && suggestions.length === 0) {
        setQuery("");
        inputRef.current?.blur();
        return;
      }

      if (!response && suggestions.length === 0) return;

      setIsCollapsing(true);
      setShowExpandedSuggestions(false);

      if (outsideCollapseTimerRef.current) {
        clearTimeout(outsideCollapseTimerRef.current);
      }

      outsideCollapseTimerRef.current = setTimeout(() => {
        setResponse(null);
        setSuggestions([]);
        setIsCollapsing(false);
        clearPersistedState();
      }, 650);
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);

      if (outsideCollapseTimerRef.current) {
        clearTimeout(outsideCollapseTimerRef.current);
      }
    };
  }, [clearPersistedState, query, response, suggestions.length, stopVoiceSession]);

  /* ---------- Unmount cleanup ---------- */

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (outsideCollapseTimerRef.current) {
        clearTimeout(outsideCollapseTimerRef.current);
      }

      isVoiceSessionRef.current = false;

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
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (currentSourceNodeRef.current) {
        try {
          currentSourceNodeRef.current.stop();
        } catch {
          /* noop */
        }
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  /* ---------- UI helpers ---------- */

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    handleSubmitRef.current?.(undefined, suggestion, false);
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

  const layout = useMemo(() => {
    const hasContent = Boolean(response || suggestions.length);
    const expanded = hasContent && !isLoading && !isVoiceSession;

    if (isVoiceSession) {
      return {
        width: "min(500px, 92vw)",
        radius: "999px",
        expanded: false,
      };
    }

    /*
     * Keep the original responsive feel, but use a bounded CSS clamp instead
     * of repeatedly measuring DOM width or causing layout thrash.
     */
    const queryWidth = Math.min(580, Math.max(420, 420 + query.length * 4));

    return {
      width: expanded ? "580px" : `${queryWidth}px`,
      radius: expanded ? "18px" : "999px",
      expanded,
    };
  }, [isLoading, isVoiceSession, query.length, response, suggestions.length]);

  const isWaveActive = isListening || isSpeaking;
  const waveMode = isSpeaking ? "speaking" : "listening";

  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 z-50 flex w-full -translate-x-1/2 flex-col items-center gap-3 px-4"
    >
      {/* ---------- Floating typewriter suggestion ---------- */}
      <Fade
        show={showTypewriter && Boolean(fullText) && suggestionPhase !== "hidden" && !isVoiceSession}
        duration={360}
      >
        <button
          type="button"
          onClick={() => handleSuggestionClick(fullText)}
          className={`suggestion-bubble suggestion-${suggestionPhase}`}
          aria-label={`Try ${fullText}`}
        >
          <span>{fullText}</span>
        </button>
      </Fade>

      {/* ---------- Main container ---------- */}
      <div
        className={[
          "search-shell",
          isLoading ? "search-shell-thinking" : "",
          isVoiceSession ? "search-shell-voice" : "",
          isCollapsing ? "search-shell-collapsing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          width: layout.width,
          maxWidth: "92vw",
          borderRadius: layout.radius,
        }}
      >
        <div className={`search-inner ${layout.expanded ? "search-inner-expanded" : ""}`}>
          {/* ---------- Delayed suggestion chips ---------- */}
          <Fade show={showExpandedSuggestions && suggestions.length > 0 && !isVoiceSession} duration={420}>
            <div className="suggestion-list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-chip"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Fade>

          {/* ---------- Response ---------- */}
          <div
            className={`response-shell ${
              response && !isVoiceSession && !isCollapsing && !isCollapsingToThink
                ? "response-shell-visible"
                : "response-shell-hidden"
            }`}
            style={{
              maxHeight: response && !isVoiceSession && !isCollapsingToThink ? `${RESPONSE_MAX_HEIGHT}px` : "0px",
            }}
          >
            {response && !isVoiceSession && (
              <div
                className={`response-content ${isRestoredFromStorage ? "" : "response-content-enter"}`}
                dangerouslySetInnerHTML={{
                  __html: convertMarkdownToHtml(response),
                }}
              />
            )}
          </div>

          {/* ---------- Input / voice row ---------- */}
          <form
            onSubmit={(event) => handleSubmit(event, undefined, false)}
            className="search-row"
            onFocus={handleInputFocus}
          >
            {!isVoiceSession ? (
              <div className="input-wrap">
                <Input
                  ref={inputRef}
                  type="text"
                  value={query}
                  placeholder={isLoading ? "Thinking…" : placeholderText}
                  onChange={handleInputChange}
                  className={`search-input ${isLoading ? "search-input-thinking" : ""}`}
                  disabled={isLoading}
                  aria-label="Ask anything"
                />
              </div>
            ) : (
              <div className="voice-status">
                <div className="voice-copy">
                  <span className="voice-status-label">
                    {isLoading ? "Thinking…" : isSpeaking ? "GDx is speaking" : "Listening…"}
                  </span>
                  <RecordingTimer isActive={isListening} />
                </div>

                <BarWaveform analyser={waveformAnalyser} isActive={isWaveActive} mode={waveMode} />
              </div>
            )}

            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                className="voice-stop-button"
                aria-label="End voice conversation"
                title="End voice conversation"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className={`search-button ${isLoading ? "search-button-thinking" : ""}`}
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
                onContextMenu={(event) => event.preventDefault()}
                aria-label={query.trim() ? "Search, or hold to talk" : "Hold to talk"}
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ---------- Local component styles ---------- */}
      <style>{`
        .search-shell {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.085);
          color: inherit;
          box-shadow:
            0 12px 40px rgba(0,0,0,.16),
            inset 0 1px 0 rgba(255,255,255,.10);
          backdrop-filter: blur(22px) saturate(125%);
          -webkit-backdrop-filter: blur(22px) saturate(125%);
          transform: translateZ(0);
          will-change: width, border-radius, box-shadow, background-color;
          transition:
            width 720ms cubic-bezier(.22,1,.36,1),
            border-radius 720ms cubic-bezier(.22,1,.36,1),
            background-color 360ms ease,
            box-shadow 500ms cubic-bezier(.22,1,.36,1),
            border-color 360ms ease;
        }

        .search-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(
              115deg,
              rgba(255,255,255,.08),
              transparent 34%,
              transparent 68%,
              rgba(255,255,255,.035)
            );
          opacity: .7;
        }

        .search-shell-thinking {
          border-color: rgba(255,255,255,.30);
          background: rgba(255,255,255,.075);
          animation: thinkingGlow 2.8s ease-in-out infinite;
        }

        .search-shell-voice {
          border-color: rgba(255,255,255,.34);
          background: rgba(255,255,255,.115);
          animation: voiceGlow 3.2s ease-in-out infinite;
        }

        .search-shell-collapsing {
          transform: translateZ(0) scale(.985);
          opacity: .96;
          transition:
            width 600ms cubic-bezier(.22,1,.36,1),
            border-radius 600ms cubic-bezier(.22,1,.36,1),
            opacity 300ms ease,
            transform 600ms cubic-bezier(.22,1,.36,1);
        }

        .search-inner {
          position: relative;
          z-index: 1;
          padding: 8px;
          transition:
            padding 600ms cubic-bezier(.22,1,.36,1),
            transform 600ms cubic-bezier(.22,1,.36,1);
        }

        .search-inner-expanded {
          padding: 18px 18px 12px;
        }

        .search-row {
          display: flex;
          align-items: center;
          min-height: 40px;
          gap: 8px;
        }

        .input-wrap {
          min-width: 0;
          flex: 1;
        }

        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 14px;
          border: 0 !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          color: inherit !important;
          font-size: 15px;
          user-select: text;
        }

        .search-input::placeholder {
          color: rgba(255,255,255,.54);
          opacity: 1;
          transition: color 300ms ease;
        }

        .search-input-thinking::placeholder {
          color: rgba(255,255,255,.72);
          animation: thinkingText 2.2s ease-in-out infinite;
        }

        .search-button,
        .voice-stop-button {
          position: relative;
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          color: rgba(255,255,255,.62);
          background: transparent;
          cursor: pointer;
          transform: translateZ(0);
          transition:
            transform 260ms cubic-bezier(.22,1,.36,1),
            background-color 220ms ease,
            color 220ms ease,
            box-shadow 300ms ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          user-select: none;
        }

        .search-button:hover {
          color: rgba(255,255,255,.92);
          background: rgba(255,255,255,.11);
          transform: scale(1.08);
        }

        .search-button:active {
          transform: scale(.92);
        }

        .search-button-thinking {
          animation: iconPulse 2.3s ease-in-out infinite;
        }

        .voice-stop-button {
          color: rgba(255,255,255,.88);
          background: rgba(255,255,255,.14);
        }

        .voice-stop-button:hover {
          background: rgba(255,255,255,.22);
          transform: scale(1.06);
        }

        .voice-stop-button:active {
          transform: scale(.92);
        }

        .voice-status {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
          padding-left: 8px;
        }

        .voice-copy {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
          min-width: 108px;
        }

        .voice-status-label {
          white-space: nowrap;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .075em;
          text-transform: uppercase;
          color: rgba(255,255,255,.72);
        }

        .recording-timer {
          flex: 0 0 auto;
          min-width: 38px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          color: rgba(255,255,255,.48);
        }

        .waveform-container {
          min-width: 0;
          height: 30px;
          flex: 1;
          overflow: hidden;
        }

        .suggestion-bubble {
          position: relative;
          max-width: min(90vw, 680px);
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          padding: 9px 15px;
          color: rgba(255,255,255,.88);
          background: rgba(255,255,255,.10);
          box-shadow:
            0 10px 30px rgba(0,0,0,.12),
            inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          cursor: pointer;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 13px;
          transform: translateZ(0);
          transition:
            background-color 220ms ease,
            border-color 220ms ease,
            transform 240ms cubic-bezier(.22,1,.36,1);
        }

        .suggestion-bubble:hover {
          background: rgba(255,255,255,.15);
          border-color: rgba(255,255,255,.25);
          transform: translateY(-2px);
        }

        .suggestion-bubble:active {
          transform: scale(.97);
        }

        .suggestion-emerging {
          animation: suggestionIn 560ms cubic-bezier(.16,1,.3,1) both;
        }

        .suggestion-retreating {
          animation: suggestionOut 500ms cubic-bezier(.4,0,.2,1) both;
        }

        .suggestion-list {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 7px;
          margin: 0 0 12px;
          animation: chipsIn 420ms cubic-bezier(.22,1,.36,1) both;
        }

        .suggestion-chip {
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 999px;
          padding: 6px 11px;
          color: rgba(255,255,255,.76);
          background: rgba(255,255,255,.075);
          font-size: 12px;
          cursor: pointer;
          transition:
            transform 220ms cubic-bezier(.22,1,.36,1),
            background-color 180ms ease,
            border-color 180ms ease;
        }

        .suggestion-chip:hover:not(:disabled) {
          border-color: rgba(255,255,255,.20);
          background: rgba(255,255,255,.13);
          transform: translateY(-1px);
        }

        .suggestion-chip:active:not(:disabled) {
          transform: scale(.96);
        }

        .suggestion-chip:disabled {
          cursor: default;
          opacity: .55;
        }

        .response-shell {
          overflow: hidden;
          transform-origin: bottom center;
          transition:
            max-height 620ms cubic-bezier(.22,1,.36,1),
            opacity 400ms ease,
            margin-bottom 620ms cubic-bezier(.22,1,.36,1),
            transform 620ms cubic-bezier(.22,1,.36,1);
        }

        .response-shell-visible {
          opacity: 1;
          margin-bottom: 14px;
          transform: translateY(0) scaleY(1);
        }

        .response-shell-hidden {
          opacity: 0;
          margin-bottom: 0;
          transform: translateY(5px) scaleY(.985);
          pointer-events: none;
        }

        .response-content {
          max-height: ${RESPONSE_MAX_HEIGHT}px;
          overflow-y: auto;
          padding: 0 8px;
          color: rgba(255,255,255,.88);
          font-size: 13px;
          line-height: 1.65;
          scrollbar-width: none;
        }

        .response-content::-webkit-scrollbar {
          display: none;
        }

        .response-content-enter {
          animation: responseIn 520ms cubic-bezier(.22,1,.36,1) 90ms both;
        }

        .response-content p {
          margin: 0 0 9px;
        }

        .response-content h1,
        .response-content h2,
        .response-content h3 {
          margin: 14px 0 7px;
          color: rgba(255,255,255,.96);
          line-height: 1.25;
        }

        .response-content h1 {
          font-size: 21px;
        }

        .response-content h2 {
          font-size: 17px;
        }

        .response-content h3 {
          font-size: 15px;
        }

        .response-content ul {
          margin: 0 0 10px;
          padding-left: 18px;
        }

        .response-content li {
          margin: 3px 0;
        }

        .inline-code {
          padding: .10rem .32rem;
          border-radius: 5px;
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.92);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: .9em;
        }

        .code-block {
          margin: 10px 0;
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          padding: 10px 12px;
          background: rgba(0,0,0,.18);
          color: rgba(255,255,255,.82);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          line-height: 1.55;
          scrollbar-width: none;
        }

        .code-block::-webkit-scrollbar {
          display: none;
        }

        .response-link {
          color: rgba(140,190,255,.92);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .response-spacer {
          height: 4px;
        }

        .fade-shell {
          will-change: opacity, transform;
          transition:
            opacity var(--fade-duration) cubic-bezier(.22,1,.36,1),
            transform var(--fade-duration) cubic-bezier(.22,1,.36,1);
        }

        .fade-shell-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .fade-shell-hidden {
          opacity: 0;
          transform: translateY(5px);
          pointer-events: none;
        }

        @keyframes responseIn {
          from {
            opacity: 0;
            transform: translateY(9px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes chipsIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes suggestionIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(.965);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes suggestionOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(8px) scale(.965);
          }
        }

        @keyframes thinkingGlow {
          0%, 100% {
            box-shadow:
              0 12px 40px rgba(0,0,0,.16),
              0 0 8px rgba(255,255,255,.08),
              inset 0 1px 0 rgba(255,255,255,.08);
          }
          50% {
            box-shadow:
              0 12px 44px rgba(0,0,0,.18),
              0 0 24px rgba(255,255,255,.19),
              inset 0 0 18px rgba(255,255,255,.06);
          }
        }

        @keyframes voiceGlow {
          0%, 100% {
            box-shadow:
              0 12px 42px rgba(0,0,0,.18),
              0 0 10px rgba(255,255,255,.12),
              inset 0 1px 0 rgba(255,255,255,.10);
          }
          50% {
            box-shadow:
              0 12px 48px rgba(0,0,0,.20),
              0 0 28px rgba(255,255,255,.22),
              inset 0 0 20px rgba(255,255,255,.08);
          }
        }

        @keyframes thinkingText {
          0%, 100% { opacity: .58; }
          50% { opacity: .92; }
        }

        @keyframes iconPulse {
          0%, 100% { opacity: .55; }
          50% { opacity: .95; }
        }

        @media (prefers-reduced-motion: reduce) {
          .search-shell,
          .search-inner,
          .response-shell,
          .suggestion-bubble,
          .suggestion-chip,
          .fade-shell {
            transition-duration: 1ms !important;
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
          }
        }

        @media (max-width: 640px) {
          .search-inner-expanded {
            padding: 14px 12px 10px;
          }

          .voice-copy {
            min-width: 88px;
          }

          .voice-status-label {
            font-size: 10px;
          }

          .recording-timer {
            display: none;
          }

          .response-content {
            font-size: 12.5px;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
