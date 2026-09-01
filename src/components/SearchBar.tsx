"use client";

import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Sparkles } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ========================================================================== *
 * Configuration
 * ========================================================================== */
const SUPABASE_URL = "https://zdrcjhohalgzhlbufwcl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcmNqaG9oYWxnemhsYnVmd2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQ4ODgsImV4cCI6MjA3MTQ2MDg4OH0.dCIOgyiibgCcXZr6OW2hkqGM3340ugtQivXTjofbEmo";
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;
const STORAGE_KEY = "searchbar_state";
const FIRST_VISIT_KEY = "gd_ai_first_visit";
const HOLD_DELAY = 360;
const SILENCE_DELAY = 1350;
const COLLAPSE_DURATION = 620;

/* ========================================================================== *
 * Small utilities
 * ========================================================================== */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type SpeechRecognitionLike = any;

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  const clean = stripMarkdown(text);
  if (!clean) return [];
  return (clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean]).map((s) => s.trim()).filter(Boolean);
}

/* Escape model output before converting the intentionally-small markdown subset.
 * This keeps dangerouslySetInnerHTML from becoming an injection surface. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHref(value: string): string | null {
  try {
    const url = new URL(value, window.location.href);
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return url.href;
  } catch {
    // ignore malformed links
  }
  return null;
}

function convertMarkdownToHtml(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];
  let inList = false;

  const inline = (raw: string) => {
    let str = escapeHtml(raw);

    // Extract inline code first so formatting inside code is not interpreted.
    const codeTokens: string[] = [];
    str = str.replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODE_${codeTokens.length}@@`;
      codeTokens.push(`<code class="inline-code">${code}</code>`);
      return token;
    });

    str = str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    str = str.replace(/__(.*?)__/g, "<strong>$1</strong>");
    str = str.replace(/\*(.*?)\*/g, "<em>$1</em>");
    str = str.replace(/_(.*?)_/g, "<em>$1</em>");
    str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = safeHref(href);
      if (!safe) return label;
      return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer" class="gdx-link">${label}</a>`;
    });

    codeTokens.forEach((token, index) => {
      str = str.replace(`@@CODE_${index}@@`, token);
    });
    return str;
  };

  const closeList = () => {
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLanguage = line.slice(3).trim();
        codeLines = [];
      } else {
        output.push(
          `<pre class="code-block"><code${codeLanguage ? ` data-language="${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        );
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      closeList();
      output.push('<div class="md-spacer"></div>');
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      output.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      output.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      output.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      if (!inList) {
        output.push("<ul>");
        inList = true;
      }
      output.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${inline(line)}</p>`);
  }

  if (inCode) {
    output.push(`<pre class="code-block"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeList();
  return output.join("");
}

/* ========================================================================== *
 * Smooth mount/unmount. Unlike the old Fade helper, this does not cause a
 * surprise layout jump when React removes the child halfway through a tween.
 * ========================================================================== */
function Presence({ show, duration = 500, children }: { show: boolean; duration?: number; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), duration);
    return () => window.clearTimeout(timer);
  }, [show, duration]);

  if (!mounted) return null;

  return (
    <div
      className="gdx-presence"
      data-visible={show ? "true" : "false"}
      style={{ "--presence-duration": `${duration}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ========================================================================== *
 * Butter-smooth waveform
 *
 * Important performance fix: the old version changed canvas.width/height on
 * EVERY animation frame. That clears the canvas, reallocates its backing store
 * and forces expensive layout work. Here the canvas is resized only when the
 * container changes size, while audio values are exponentially interpolated.
 * ========================================================================== */
const BarWaveform: React.FC<{
  analyser: AnalyserNode | null;
  active: boolean;
  speaking?: boolean;
}> = ({ analyser, active, speaking = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const valuesRef = useRef<number[]>([]);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      sizeRef.current = { width, height, dpr };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (analyser) {
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.88;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } else {
      dataRef.current = null;
    }

    const draw = (now: number) => {
      const { width: w, height: h } = sizeRef.current;
      if (!w || !h) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = sizeRef.current.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barWidth = 2.1;
      const gap = 2.4;
      const count = Math.max(12, Math.floor(w / (barWidth + gap)));
      const current = valuesRef.current;
      if (current.length !== count) {
        const previous = current.slice();
        current.length = count;
        for (let i = 0; i < count; i++) current[i] = previous[i] ?? 0.08;
      }

      const data = dataRef.current;
      if (analyser && data) analyser.getByteFrequencyData(data);

      const t = now / 1000;
      const center = (count - 1) / 2;

      for (let i = 0; i < count; i++) {
        let target = 0.075;

        if (analyser && data) {
          // Concentrate the visual energy around the voice's useful frequency
          // range instead of making every high-frequency bin equally bright.
          const normalized = i / Math.max(1, count - 1);
          const index = Math.min(data.length - 1, Math.floor(Math.pow(normalized, 1.35) * data.length * 0.72));
          target = data[index] / 255;
        } else {
          // Gentle fallback motion for playback / unsupported analyser paths.
          const distance = Math.abs(i - center) / Math.max(1, center);
          const envelope = 1 - distance * 0.42;
          target = 0.09 + envelope * (0.16 + 0.13 * Math.sin(t * 2.2 + i * 0.24)) + 0.07 * Math.sin(t * 4.1 - i * 0.16);
        }

        // A tiny breathing floor keeps the waveform alive without looking like
        // a digital equalizer. Speaking gets a little more movement.
        target = Math.max(0.055, target * (speaking ? 1.12 : 0.9) + 0.035 * Math.sin(t * 2.8 + i * 0.31));

        // Different attack/release constants prevent twitching and make the
        // movement feel organic.
        const previous = current[i];
        const rate = target > previous ? 0.16 : 0.055;
        current[i] = previous + (target - previous) * rate;

        const edgeFalloff = 1 - Math.pow(Math.abs(i - center) / Math.max(1, center), 1.7) * 0.34;
        const height = Math.max(3.2, current[i] * h * 0.9 * edgeFalloff);
        const x = i * (barWidth + gap);
        const y = (h - height) / 2;
        const alpha = Math.min(0.92, 0.23 + current[i] * 0.75);

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, barWidth / 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      valuesRef.current = [];
    };
  }, [active, analyser, speaking]);

  if (!active) return null;

  return (
    <div ref={containerRef} className="gdx-wave-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="gdx-wave" />
    </div>
  );
};

/* ========================================================================== *
 * Recording timer
 * ========================================================================== */
const RecordingTimer: React.FC<{ active: boolean }> = ({ active }) => {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
      setSeconds(0);
      return;
    }

    const start = performance.now();
    setStartedAt(Date.now());
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - start) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active || !startedAt) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="gdx-timer">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

/* ========================================================================== *
 * Main component
 * ========================================================================== */
interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [suggestionPhase, setSuggestionPhase] = useState<"hidden" | "enter" | "visible" | "exit">("hidden");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionText, setSuggestionText] = useState("");
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const speakTokenRef = useRef(0);
  const transcriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMicRef = useRef<Promise<MediaStream | null> | null>(null);
  const isHoldingRef = useRef(false);
  const voiceSessionRef = useRef(false);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const loadingRef = useRef(false);
  const submitRef = useRef<(query: string, fromVoice?: boolean) => Promise<void>>(async () => {});
  const stopVoiceRef = useRef<() => void>(() => {});
  const collapseTimerRef = useRef<number | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* ------------------------------------------------------------------------ *
   * Restore state. A hard reload intentionally starts clean, matching the
   * original behavior. Navigation/back-forward retains the answer.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const isReload = navigation?.type === "reload" || (performance as any)?.navigation?.type === 1;

      if (isReload) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.response) {
        setResponse(String(parsed.response));
        setSuggestions(Array.isArray(parsed.suggestions) ? parsed.suggestions : []);
        setHasInteracted(Boolean(parsed.hasInteracted));
        setShowExpandedSuggestions(Boolean(parsed.showExpandedSuggestions));
        setLastActivity(Number(parsed.lastActivityTime) || Date.now());
        setIsRestored(true);
      }
    } catch (error) {
      console.warn("Failed to restore search state:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          response,
          suggestions,
          hasInteracted,
          showExpandedSuggestions,
          lastActivityTime: lastActivity,
        }),
      );
    } catch {
      // Storage can be unavailable in privacy modes; UI should keep working.
    }
  }, [response, suggestions, hasInteracted, showExpandedSuggestions, lastActivity]);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }, []);

  /* ------------------------------------------------------------------------ *
   * Reduced motion is respected without making the normal animation feel slow.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  /* ------------------------------------------------------------------------ *
   * Activity: throttled instead of updating React state on every mousemove.
   * ------------------------------------------------------------------------ */
  const markActivity = useCallback(() => {
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => setLastActivity(Date.now()), 180);
  }, []);

  useEffect(() => {
    const immediate = () => setLastActivity(Date.now());
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("click", immediate);
    window.addEventListener("keydown", immediate);
    window.addEventListener("scroll", immediate, { passive: true });
    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("click", immediate);
      window.removeEventListener("keydown", immediate);
      window.removeEventListener("scroll", immediate);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, [markActivity]);

  /* ------------------------------------------------------------------------ *
   * Audio context + mic analyser. One analyser is dedicated to the microphone;
   * TTS playback uses an ordinary HTMLAudioElement so the mic never receives
   * the speaker signal and creates a feedback-looking waveform.
   * ------------------------------------------------------------------------ */
  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch {
        // Browser may refuse until another gesture; recognition still works.
      }
    }
    return audioContextRef.current;
  }, []);

  const setupMicAnalyser = useCallback(
    async (stream: MediaStream) => {
      const ctx = await ensureAudioContext();
      if (!ctx) return;

      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {}
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.9;
      analyser.minDecibels = -72;
      analyser.maxDecibels = -5;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      micSourceRef.current = source;
      micAnalyserRef.current = analyser;
      setMicAnalyser(analyser);
    },
    [ensureAudioContext],
  );

  const cleanupMic = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {}
      micSourceRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    micAnalyserRef.current = null;
    setMicAnalyser(null);
    listeningRef.current = false;
    setIsListening(false);
  }, []);

  /* ------------------------------------------------------------------------ *
   * Voice session teardown / TTS teardown.
   * ------------------------------------------------------------------------ */
  const stopSpeaking = useCallback(() => {
    speakTokenRef.current += 1;
    speakingRef.current = false;

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.removeAttribute("src");
        currentAudioRef.current.load();
      } catch {}
      currentAudioRef.current = null;
    }

    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }

    setIsSpeaking(false);
  }, []);

  const stopVoiceSession = useCallback(() => {
    voiceSessionRef.current = false;
    setIsVoiceSession(false);
    stopSpeaking();
    cleanupMic();
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [cleanupMic, stopSpeaking]);

  stopVoiceRef.current = stopVoiceSession;

  /* ------------------------------------------------------------------------ *
   * TTS. Voice mode is the only place this is invoked. Text answers remain
   * silent, which avoids surprising autoplay and preserves the first version's
   * voice/text distinction.
   * ------------------------------------------------------------------------ */
  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopSpeaking();
      const token = speakTokenRef.current;
      const sentences = splitSentences(raw);
      if (!sentences.length || !voiceSessionRef.current) return;

      speakingRef.current = true;
      setIsSpeaking(true);

      const speakFallback = async (fromIndex: number) => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        for (let i = fromIndex; i < sentences.length; i++) {
          if (token !== speakTokenRef.current || !voiceSessionRef.current) return;
          await new Promise<void>((resolve) => {
            const utterance = new SpeechSynthesisUtterance(sentences[i]);
            utterance.rate = 1.04;
            utterance.pitch = 1;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            synth.speak(utterance);
          });
        }
      };

      try {
        for (let i = 0; i < sentences.length; i++) {
          if (token !== speakTokenRef.current || !voiceSessionRef.current) return;

          let url: string | null = null;
          try {
            const res = await fetch(TTS_ENDPOINT, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                apikey: SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ text: sentences[i] }),
            });
            if (!res.ok) throw new Error(`TTS ${res.status}`);
            const blob = await res.blob();
            if (!blob.size) throw new Error("Empty TTS response");
            url = URL.createObjectURL(blob);
          } catch (error) {
            console.warn("gdx-tts failed; using speech synthesis fallback:", error);
            await speakFallback(i);
            return;
          }

          if (!url || token !== speakTokenRef.current || !voiceSessionRef.current) {
            if (url) URL.revokeObjectURL(url);
            return;
          }

          await new Promise<void>((resolve) => {
            const audio = new Audio(url!);
            audio.preload = "auto";
            currentAudioRef.current = audio;
            playbackUrlRef.current = url;

            const finish = () => {
              if (currentAudioRef.current === audio) currentAudioRef.current = null;
              if (playbackUrlRef.current === url) playbackUrlRef.current = null;
              URL.revokeObjectURL(url!);
              resolve();
            };

            audio.onended = finish;
            audio.onerror = finish;
            audio.play().catch(finish);
          });
        }
      } finally {
        if (token === speakTokenRef.current) {
          speakingRef.current = false;
          setIsSpeaking(false);
          if (voiceSessionRef.current) {
            // Give the audio output a tiny breathing gap before re-opening the
            // microphone. This avoids cutting off the last syllable.
            await sleep(120);
            if (voiceSessionRef.current) startListeningContinuous();
          }
        }
      }
    },
    [stopSpeaking],
  );

  /* ------------------------------------------------------------------------ *
   * Continuous recognition. The important difference from the old code is
   * that recognition is represented by refs as well as state, so event handlers
   * never close over an old isLoading/isSpeaking value.
   * ------------------------------------------------------------------------ */
  const startListeningContinuous = useCallback(async () => {
    if (!voiceSessionRef.current || loadingRef.current || speakingRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      stopVoiceSession();
      return;
    }

    if (!micStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (!voiceSessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        micStreamRef.current = stream;
        await setupMicAnalyser(stream);
      } catch (error) {
        console.warn("Microphone access failed:", error);
        stopVoiceSession();
        return;
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    transcriptRef.current = "";

    const submitTranscript = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      const text = transcriptRef.current.trim();
      transcriptRef.current = "";
      if (!text || !voiceSessionRef.current) return;

      try {
        recognition.stop();
      } catch {}
      listeningRef.current = false;
      setIsListening(false);
      void submitRef.current(text, true);
    };

    recognition.onstart = () => {
      if (!voiceSessionRef.current) return;
      listeningRef.current = true;
      setIsListening(true);
      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);
    };

    recognition.onresult = (event: any) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0]?.transcript || "";
      }
      transcriptRef.current = combined;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (combined.trim()) {
        silenceTimerRef.current = setTimeout(submitTranscript, SILENCE_DELAY);
      }
    };

    recognition.onerror = (event: any) => {
      if (event?.error !== "no-speech" && event?.error !== "aborted") {
        console.warn("Speech recognition error:", event?.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      listeningRef.current = false;
      setIsListening(false);

      if (!voiceSessionRef.current || loadingRef.current || speakingRef.current) return;

      const text = transcriptRef.current.trim();
      if (text) {
        transcriptRef.current = "";
        void submitRef.current(text, true);
      } else {
        // Chrome/Safari can end recognition after a short silence even with
        // continuous=true. Restart without tearing down the microphone.
        window.setTimeout(() => {
          if (voiceSessionRef.current && !loadingRef.current && !speakingRef.current) {
            startListeningContinuous();
          }
        }, 90);
      }
    };

    try {
      recognition.start();
    } catch {
      // "already started" is harmless; onend will recover if necessary.
    }
  }, [setupMicAnalyser, stopVoiceSession]);

  /* ------------------------------------------------------------------------ *
   * Submit: request IDs prevent an older, slower response from replacing a
   * newer query. The UI also collapses using a short opacity/scale phase before
   * changing content, instead of fighting max-height with width transitions.
   * ------------------------------------------------------------------------ */
  const requestIdRef = useRef(0);

  const handleSubmit = useCallback(
    async (textInput: string, fromVoice = false) => {
      const text = textInput.trim();
      if (!text || loadingRef.current) return;

      const requestId = ++requestIdRef.current;
      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);
      setIsRestored(false);

      if (!fromVoice) stopVoiceSession();

      const hadContent = Boolean(response || suggestions.length);
      if (hadContent) {
        setIsCollapsing(true);
        await sleep(reducedMotion ? 0 : 280);
        if (requestId !== requestIdRef.current) return;
      }

      setResponse(null);
      setSuggestions([]);
      setIsCollapsing(false);
      setIsLoading(true);
      loadingRef.current = true;

      try {
        const result = await sendChatMessage(text);
        if (requestId !== requestIdRef.current) return;

        const answer = String((result as any)?.response ?? "");
        const nextSuggestions = Array.isArray((result as any)?.suggestions)
          ? (result as any).suggestions.map(String)
          : [];

        if (fromVoice && voiceSessionRef.current) {
          // Voice answers remain visually compact, but retain the response in
          // state so the next text interaction can still transition cleanly.
          setResponse(null);
          setSuggestions([]);
          void speakVoiceResponse(answer);
        } else {
          setResponse(answer);
          setSuggestions(nextSuggestions);
          onSearch?.(answer);
        }
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
        if (fromVoice && voiceSessionRef.current) {
          void speakVoiceResponse(message);
        } else {
          setResponse(message);
          setSuggestions([]);
          onSearch?.(message);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [onSearch, reducedMotion, response, speakVoiceResponse, stopVoiceSession, suggestions.length],
  );

  submitRef.current = handleSubmit;

  /* ------------------------------------------------------------------------ *
   * Hold-to-speak. getUserMedia begins during the actual gesture, satisfying
   * browser permission policies, but recognition waits for the hold threshold.
   * A short click remains a normal search submit.
   * ------------------------------------------------------------------------ */
  const startHold = useCallback(() => {
    if (loadingRef.current || voiceSessionRef.current) return;

    isHoldingRef.current = true;
    stopSpeaking();

    const micPromise = navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => stream)
      .catch((error) => {
        console.warn("Microphone permission denied:", error);
        return null;
      });

    pendingMicRef.current = micPromise;

    holdTimerRef.current = setTimeout(async () => {
      if (!isHoldingRef.current) {
        const stream = await micPromise;
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      const stream = await micPromise;
      if (!isHoldingRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      if (!stream) return;
      micStreamRef.current = stream;
      voiceSessionRef.current = true;
      setIsVoiceSession(true);
      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);
      setResponse(null);
      setSuggestions([]);
      setQuery("");
      inputRef.current?.blur();

      await setupMicAnalyser(stream);
      if (voiceSessionRef.current) startListeningContinuous();
    }, HOLD_DELAY);
  }, [setupMicAnalyser, startListeningContinuous, stopSpeaking]);

  const endHold = useCallback(() => {
    const wasHolding = isHoldingRef.current;
    isHoldingRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If the hold threshold was never reached, treat it as a search click.
    if (wasHolding && !voiceSessionRef.current && !listeningRef.current && query.trim()) {
      void submitRef.current(query);
    }
  }, [query]);

  const handleHoldStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
      startHold();
    },
    [startHold],
  );

  const handleHoldEnd = useCallback(
    (event?: React.PointerEvent<HTMLDivElement>) => {
      event?.preventDefault();
      if (event) {
        try {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        } catch {}
      }

      if (voiceSessionRef.current) {
        // In continuous voice mode, the X button ends the session; releasing
        // the search target does not terminate it.
        return;
      }
      endHold();
    },
    [endHold],
  );

  /* ------------------------------------------------------------------------ *
   * Shift shortcut
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift" || event.repeat || loadingRef.current || voiceSessionRef.current) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      event.preventDefault();
      startHold();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      endHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [endHold, startHold]);

  /* ------------------------------------------------------------------------ *
   * First visit intro
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    let timer: number | null = null;
    try {
      if (!localStorage.getItem(FIRST_VISIT_KEY) && !response && !suggestions.length) {
        localStorage.setItem(FIRST_VISIT_KEY, "true");
        timer = window.setTimeout(() => {
          void submitRef.current("introduce the website to the new user");
        }, 1300);
      }
    } catch {}
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
    // Deliberately run once: changing response after mount must not schedule a
    // second intro request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------------ *
   * Placeholder loop: reset cleanly whenever the user interacts.
   * ------------------------------------------------------------------------ */
  const placeholderTargets = useMemo(() => ["Ask anything...", "hold shift/search to talk with GDx"], []);
  const [placeholderText, setPlaceholderText] = useState(placeholderTargets[0]);
  const [placeholderTarget, setPlaceholderTarget] = useState(0);
  const [placeholderMode, setPlaceholderMode] = useState<"pause" | "delete" | "type">("pause");

  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || query) return;
    const target = placeholderTargets[placeholderTarget];

    if (placeholderMode === "pause") {
      const timer = window.setTimeout(() => setPlaceholderMode("delete"), 2800);
      return () => window.clearTimeout(timer);
    }

    if (placeholderMode === "delete") {
      if (!placeholderText.length) {
        setPlaceholderTarget((value) => (value + 1) % placeholderTargets.length);
        setPlaceholderMode("type");
        return;
      }
      const timer = window.setTimeout(() => setPlaceholderText((value) => value.slice(0, -1)), reducedMotion ? 0 : 22);
      return () => window.clearTimeout(timer);
    }

    if (placeholderText === target) {
      setPlaceholderMode("pause");
      return;
    }

    const timer = window.setTimeout(
      () => setPlaceholderText(target.slice(0, placeholderText.length + 1)),
      reducedMotion ? 0 : 38,
    );
    return () => window.clearTimeout(timer);
  }, [
    isLoading,
    isListening,
    isVoiceSession,
    placeholderMode,
    placeholderTarget,
    placeholderTargets,
    placeholderText,
    query,
    reducedMotion,
  ]);

  /* ------------------------------------------------------------------------ *
   * Typewriter suggestion bubble. One timeout chain instead of interval + nested
   * timeouts, so old timers cannot resurrect a previous suggestion.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (response || suggestions.length || isVoiceSession || isLoading) {
      setShowTypewriter(false);
      setSuggestionPhase("hidden");
      return;
    }

    const idle = Date.now() - lastActivity;
    if (idle < 10000 || !hasInteracted) return;

    setShowTypewriter(true);
  }, [hasInteracted, isLoading, isVoiceSession, lastActivity, response, suggestions.length]);

  useEffect(() => {
    if (!showTypewriter || isVoiceSession) {
      setSuggestionPhase("hidden");
      return;
    }

    let cancelled = false;
    const target = rotatingSuggestions[suggestionIndex];
    setSuggestionText(target);
    setSuggestionPhase("enter");

    const enterTimer = window.setTimeout(
      () => {
        if (cancelled) return;
        setSuggestionPhase("visible");
      },
      reducedMotion ? 0 : 520,
    );

    const cycleTimer = window.setTimeout(
      () => {
        if (cancelled) return;
        setSuggestionPhase("exit");

        const swapTimer = window.setTimeout(
          () => {
            if (cancelled) return;
            setSuggestionIndex((value) => (value + 1) % rotatingSuggestions.length);
          },
          reducedMotion ? 0 : 500,
        );

        // Store on the closure so cleanup below can cancel it.
        (cycleTimer as any).__swapTimer = swapTimer;
      },
      reducedMotion ? 2600 : 4200,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(enterTimer);
      window.clearTimeout(cycleTimer);
      const swapTimer = (cycleTimer as any).__swapTimer as number | undefined;
      if (swapTimer) window.clearTimeout(swapTimer);
    };
  }, [reducedMotion, rotatingSuggestions, showTypewriter, suggestionIndex, isVoiceSession]);

  /* ------------------------------------------------------------------------ *
   * Expanded answer suggestions appear after idle, but never alter dimensions
   * until their opacity/transform animation has begun.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!response || isLoading || isVoiceSession || !suggestions.length) {
      setShowExpandedSuggestions(false);
      return;
    }
    const idle = Date.now() - lastActivity;
    if (idle <= 10000) return;
    setShowExpandedSuggestions(true);
  }, [lastActivity, response, suggestions.length, isLoading, isVoiceSession]);

  /* ------------------------------------------------------------------------ *
   * Outside click. A generation token makes delayed collapse harmless if the
   * user starts another query while the old collapse is still running.
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && searchBarRef.current?.contains(target)) return;

      const element = target as Element | null;
      if (
        element?.closest?.('[class*="fixed top-6"]') ||
        element?.closest?.('[class*="fixed bottom-6 right-6"]') ||
        element?.closest?.('button[aria-label*="Scroll to top"]') ||
        element?.closest?.('button[aria-label*="Close modal"]')
      ) {
        return;
      }

      if (voiceSessionRef.current) {
        stopVoiceSession();
        return;
      }

      if (query.trim() && !response && !suggestions.length) {
        setQuery("");
        inputRef.current?.blur();
        return;
      }

      if (response || suggestions.length) {
        if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
        setShowExpandedSuggestions(false);
        setIsCollapsing(true);
        collapseTimerRef.current = window.setTimeout(
          () => {
            setResponse(null);
            setSuggestions([]);
            setIsCollapsing(false);
            clearPersistedState();
          },
          reducedMotion ? 0 : COLLAPSE_DURATION,
        );
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [clearPersistedState, query, reducedMotion, response, stopVoiceSession, suggestions.length]);

  /* ------------------------------------------------------------------------ *
   * Cleanup
   * ------------------------------------------------------------------------ */
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      voiceSessionRef.current = false;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current);
      cleanupMic();
      stopSpeaking();
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, [cleanupMic, stopSpeaking]);

  /* ------------------------------------------------------------------------ *
   * Input actions
   * ------------------------------------------------------------------------ */
  const onInputFocus = useCallback(() => {
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
    setLastActivity(Date.now());
  }, []);

  const onInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setLastActivity(Date.now());
  }, []);

  const onFormSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (query.trim()) void submitRef.current(query);
    },
    [query],
  );

  const clickSuggestion = useCallback((value: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    void submitRef.current(value);
  }, []);

  /* ------------------------------------------------------------------------ *
   * Geometry: no query-length-dependent width. That was a major source of
   * micro-jitter because every typed character changed the animated width.
   * We animate between a small set of stable states instead.
   * ------------------------------------------------------------------------ */
  const expanded = Boolean(response || suggestions.length) && !isLoading && !isVoiceSession;
  const voice = isVoiceSession;
  const compact = !expanded && !voice;

  const stateClass = [
    "gdx-shell",
    expanded ? "is-expanded" : "",
    voice ? "is-voice" : "",
    isListening ? "is-listening" : "",
    isSpeaking ? "is-speaking" : "",
    isLoading ? "is-thinking" : "",
    isCollapsing ? "is-collapsing" : "",
    reducedMotion ? "reduce-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={searchBarRef} className="gdx-root">
      {/* ------------------------------------------------------------------ */}
      {/* Floating suggestion                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Presence show={showTypewriter && Boolean(suggestionText) && suggestionPhase !== "hidden"} duration={500}>
        <button
          type="button"
          className={`gdx-floating-suggestion phase-${suggestionPhase}`}
          onClick={() => clickSuggestion(suggestionText)}
          aria-label="Use suggested question"
        >
          <Sparkles className="gdx-sparkle" />
          <span>{suggestionText.replace(/^✨\s*/, "")}</span>
        </button>
      </Presence>

      {/* ------------------------------------------------------------------ */}
      {/* Main glass shell                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={stateClass}
        style={
          {
            // CSS custom properties make the actual transitions live entirely
            // in CSS, avoiding React-driven inline transition churn.
            "--gdx-width": expanded ? "580px" : voice ? "430px" : "460px",
          } as React.CSSProperties
        }
      >
        <div className="gdx-aura" aria-hidden="true" />
        <div className="gdx-highlight" aria-hidden="true" />

        <div className="gdx-inner">
          {/* Answer / suggestions region */}
          <div className={`gdx-content ${expanded ? "content-visible" : "content-hidden"}`}>
            <Presence show={showExpandedSuggestions && suggestions.length > 0} duration={520}>
              <div className="gdx-suggestions">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    disabled={isLoading}
                    className="gdx-suggestion-chip"
                    onClick={() => clickSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </Presence>

            <Presence show={Boolean(response) && !isVoiceSession} duration={560}>
              {response && (
                <div className={`gdx-response ${isRestored ? "restored" : ""}`}>
                  <div
                    className="gdx-response-scroll"
                    dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
                  />
                </div>
              )}
            </Presence>
          </div>

          {/* Main input row */}
          <form onSubmit={onFormSubmit} className="gdx-form" onFocus={onInputFocus}>
            {!voice ? (
              <div className="gdx-input-wrap">
                <Input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={onInputChange}
                  disabled={isLoading}
                  placeholder={isLoading ? "Thinking…" : placeholderText}
                  aria-label="Ask anything"
                  className="gdx-input"
                  autoComplete="off"
                />
                <div className="gdx-input-sheen" aria-hidden="true" />
              </div>
            ) : (
              <div className="gdx-voice-row" aria-live="polite">
                <div className="gdx-status">
                  <span className="gdx-status-dot" />
                  <span>
                    {isLoading ? "Thinking" : isSpeaking ? "GDx is speaking" : isListening ? "Listening" : "Waking up"}
                  </span>
                </div>
                <BarWaveform analyser={micAnalyser} active={isListening || isSpeaking} speaking={isSpeaking} />
                <RecordingTimer active={isListening} />
              </div>
            )}

            {voice ? (
              <button
                type="button"
                className="gdx-action gdx-close"
                onClick={stopVoiceSession}
                aria-label="End voice conversation"
              >
                <X />
              </button>
            ) : (
              <div
                className="gdx-search-hitarea"
                onPointerDown={handleHoldStart}
                onPointerUp={handleHoldEnd}
                onPointerCancel={handleHoldEnd}
                onPointerLeave={(event) => {
                  // Pointer capture keeps normal holds alive. If capture is not
                  // active, leaving means the user released the gesture.
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) handleHoldEnd(event);
                }}
                role="button"
                tabIndex={-1}
                aria-label="Search or hold to speak"
              >
                <span className="gdx-action gdx-search-action">
                  <Search className={isLoading ? "is-loading-icon" : ""} />
                  <span className="gdx-action-ring" aria-hidden="true" />
                </span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Animation system                                                    */}
      {/* ================================================================== */}
      <style>{`
        :root {
          --gdx-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --gdx-ease-soft: cubic-bezier(0.16, 1, 0.3, 1);
          --gdx-ease-spring: cubic-bezier(0.2, 0.9, 0.25, 1);
        }

        .gdx-root {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          z-index: 50;
          width: 100%;
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 11px;
          pointer-events: none;
          isolation: isolate;
        }

        .gdx-root > * { pointer-events: auto; }

        /* Presence deliberately only fades/translates; the actual shell keeps
           its geometry stable, which removes the old layout snap. */
        .gdx-presence {
          --presence-duration: 500ms;
          transition:
            opacity var(--presence-duration) var(--gdx-ease-soft),
            transform var(--presence-duration) var(--gdx-ease-soft),
            filter var(--presence-duration) var(--gdx-ease-soft);
          will-change: opacity, transform, filter;
        }

        .gdx-presence[data-visible="false"] {
          opacity: 0;
          transform: translate3d(0, 9px, 0) scale(0.975);
          filter: blur(2px);
          pointer-events: none;
        }

        .gdx-floating-suggestion {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          max-width: min(90vw, 640px);
          padding: 9px 15px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: rgba(255,255,255,.92);
          background:
            linear-gradient(180deg, rgba(255,255,255,.15), rgba(255,255,255,.08));
          box-shadow:
            0 10px 34px rgba(0,0,0,.13),
            inset 0 1px 0 rgba(255,255,255,.11);
          backdrop-filter: blur(22px) saturate(125%);
          -webkit-backdrop-filter: blur(22px) saturate(125%);
          font-size: 13px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          transform-origin: 50% 100%;
          transition:
            transform 420ms var(--gdx-ease),
            background-color 320ms ease,
            box-shadow 420ms var(--gdx-ease);
          animation: gdxBubbleIn 560ms var(--gdx-ease-soft) both;
        }

        .gdx-floating-suggestion:hover {
          transform: translateY(-2px) scale(1.012);
          background: rgba(255,255,255,.13);
          box-shadow:
            0 15px 40px rgba(0,0,0,.16),
            inset 0 1px 0 rgba(255,255,255,.14);
        }

        .gdx-floating-suggestion:active { transform: scale(.985); }
        .gdx-floating-suggestion.phase-exit { animation: gdxBubbleOut 500ms var(--gdx-ease) both; }
        .gdx-sparkle { width: 13px; height: 13px; opacity: .72; flex: 0 0 auto; }

        @keyframes gdxBubbleIn {
          0% { opacity: 0; transform: translate3d(0, 11px, 0) scale(.965); filter: blur(3px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes gdxBubbleOut {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate3d(0, 8px, 0) scale(.975); filter: blur(2px); }
        }

        /* ------------------------------------------------------------------ */
        /* Shell: only compositor-friendly effects are animated continuously. */
        /* Width/radius have deliberately long, low-acceleration transitions. */
        /* ------------------------------------------------------------------ */
        .gdx-shell {
          --gdx-width: 460px;
          position: relative;
          width: var(--gdx-width);
          max-width: 92vw;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          color: var(--foreground, white);
          background: rgba(255,255,255,.075);
          box-shadow:
            0 12px 45px rgba(0,0,0,.10),
            0 2px 12px rgba(0,0,0,.06),
            inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(24px) saturate(135%);
          -webkit-backdrop-filter: blur(24px) saturate(135%);
          transform: translateZ(0);
          backface-visibility: hidden;
          will-change: width, border-radius, box-shadow, background-color;
          transition:
            width 760ms var(--gdx-ease),
            border-radius 700ms var(--gdx-ease),
            background-color 500ms ease,
            border-color 500ms ease,
            box-shadow 700ms var(--gdx-ease);
        }

        .gdx-shell.is-expanded {
          border-radius: 20px;
          background: rgba(255,255,255,.085);
          border-color: rgba(255,255,255,.18);
        }

        .gdx-shell.is-voice {
          border-color: rgba(255,255,255,.25);
          background: rgba(255,255,255,.105);
        }

        .gdx-aura,
        .gdx-highlight {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
        }

        .gdx-aura {
          opacity: .55;
          background: radial-gradient(circle at 50% 0%, rgba(255,255,255,.11), transparent 62%);
          filter: blur(12px);
          transition: opacity 700ms ease, transform 900ms var(--gdx-ease);
        }

        .gdx-highlight {
          opacity: .65;
          background: linear-gradient(115deg, transparent 15%, rgba(255,255,255,.055) 50%, transparent 85%);
          transform: translate3d(-55%,0,0);
          transition: transform 1100ms var(--gdx-ease), opacity 500ms ease;
        }

        .gdx-shell:hover .gdx-highlight { transform: translate3d(55%,0,0); }

        .gdx-inner {
          position: relative;
          z-index: 1;
          padding: 8px;
          transition:
            padding 700ms var(--gdx-ease),
            transform 700ms var(--gdx-ease);
        }

        .gdx-shell.is-expanded .gdx-inner { padding: 18px 18px 15px; }
        .gdx-shell.is-collapsing .gdx-inner { transform: scale(.992); }

        /* ------------------------------------------------------------------ */
        /* Content: avoid max-height animation. The content is clipped by the
           shell and its own region; opacity/translate are what users perceive. */
        /* ------------------------------------------------------------------ */
        .gdx-content {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transform: translate3d(0, -5px, 0);
          margin: 0;
          overflow: hidden;
          transition:
            grid-template-rows 620ms var(--gdx-ease),
            opacity 340ms ease,
            transform 620ms var(--gdx-ease),
            margin 620ms var(--gdx-ease);
          will-change: grid-template-rows, opacity, transform;
        }

        .gdx-content > .gdx-presence,
        .gdx-content > .gdx-response { min-height: 0; }
        .gdx-content.content-visible {
          grid-template-rows: 1fr;
          opacity: 1;
          transform: translate3d(0,0,0);
          margin-bottom: 7px;
        }
        .gdx-content.content-hidden { pointer-events: none; }

        .gdx-response {
          min-height: 0;
          animation: gdxResponseIn 620ms var(--gdx-ease-soft) both;
        }

        .gdx-response.restored { animation: none; }

        .gdx-response-scroll {
          max-height: 300px;
          overflow-y: auto;
          padding: 1px 8px 2px;
          scrollbar-width: none;
          color: rgba(255,255,255,.90);
          font-size: 14px;
          line-height: 1.58;
        }
        .gdx-response-scroll::-webkit-scrollbar { display: none; }
        .gdx-response-scroll p { margin: 0 0 8px; }
        .gdx-response-scroll p:last-child { margin-bottom: 0; }
        .gdx-response-scroll h1 { font-size: 22px; line-height: 1.25; font-weight: 700; margin: 8px 0 8px; }
        .gdx-response-scroll h2 { font-size: 18px; line-height: 1.3; font-weight: 700; margin: 8px 0 7px; }
        .gdx-response-scroll h3 { font-size: 15px; line-height: 1.35; font-weight: 650; margin: 8px 0 6px; }
        .gdx-response-scroll ul { margin: 4px 0 9px 18px; padding: 0; }
        .gdx-response-scroll li { margin: 3px 0; }
        .gdx-response-scroll .md-spacer { height: 3px; }
        .gdx-link { color: rgba(147,197,253,.95); text-decoration: underline; text-underline-offset: 2px; transition: opacity 180ms ease; }
        .gdx-link:hover { opacity: .75; }
        .inline-code {
          padding: 2px 5px;
          border-radius: 5px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.06);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: .88em;
        }
        .code-block {
          margin: 8px 0;
          padding: 10px 11px;
          max-width: 100%;
          overflow: auto;
          border-radius: 10px;
          background: rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.07);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        @keyframes gdxResponseIn {
          0% { opacity: 0; transform: translate3d(0, 8px, 0) scale(.992); filter: blur(2px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        /* ------------------------------------------------------------------ */
        /* Suggestion chips */
        /* ------------------------------------------------------------------ */
        .gdx-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 7px;
          padding: 0 0 8px;
        }
        .gdx-suggestion-chip {
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 999px;
          padding: 6px 11px;
          color: rgba(255,255,255,.78);
          background: rgba(255,255,255,.065);
          font-size: 12px;
          cursor: pointer;
          transition:
            transform 360ms var(--gdx-ease),
            background-color 260ms ease,
            border-color 260ms ease,
            color 260ms ease;
        }
        .gdx-suggestion-chip:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.17);
          color: rgba(255,255,255,.96);
        }
        .gdx-suggestion-chip:active { transform: scale(.975); }
        .gdx-suggestion-chip:disabled { opacity: .45; cursor: default; }

        /* ------------------------------------------------------------------ */
        /* Form/input */
        /* ------------------------------------------------------------------ */
        .gdx-form {
          position: relative;
          display: flex;
          align-items: center;
          min-height: 40px;
          gap: 5px;
        }
        .gdx-input-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
        .gdx-input {
          width: 100%;
          height: 40px !important;
          padding: 0 13px !important;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: transparent !important;
          color: rgba(255,255,255,.93) !important;
          font-size: 15px !important;
          caret-color: rgba(255,255,255,.8);
        }
        .gdx-input::placeholder {
          color: rgba(255,255,255,.43) !important;
          transition: color 350ms ease;
        }
        .gdx-input:focus::placeholder { color: rgba(255,255,255,.29) !important; }
        .gdx-input-sheen { position: absolute; inset: 0; pointer-events: none; border-radius: 12px; opacity: 0; background: linear-gradient(90deg, rgba(255,255,255,.04), transparent 55%); transition: opacity 400ms ease; }
        .gdx-input-wrap:focus-within .gdx-input-sheen { opacity: 1; }

        .gdx-action,
        .gdx-search-hitarea {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
        }
        .gdx-search-hitarea {
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          cursor: pointer;
        }
        .gdx-search-action {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: rgba(255,255,255,.58);
          transition:
            transform 480ms var(--gdx-ease-spring),
            color 320ms ease,
            background-color 320ms ease;
        }
        .gdx-search-hitarea:hover .gdx-search-action {
          transform: scale(1.09);
          color: rgba(255,255,255,.86);
          background: rgba(255,255,255,.075);
        }
        .gdx-search-hitarea:active .gdx-search-action { transform: scale(.91); }
        .gdx-search-action svg { width: 16px; height: 16px; stroke-width: 1.8; position: relative; z-index: 1; }
        .gdx-action-ring {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid rgba(255,255,255,0);
          transform: scale(.78);
          transition: transform 500ms var(--gdx-ease), border-color 350ms ease;
        }
        .gdx-search-hitarea:hover .gdx-action-ring { transform: scale(1); border-color: rgba(255,255,255,.08); }
        .gdx-close {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 999px;
          color: rgba(255,255,255,.75);
          background: rgba(255,255,255,.07);
          cursor: pointer;
          transition: transform 420ms var(--gdx-ease), background-color 300ms ease, color 300ms ease;
        }
        .gdx-close:hover { transform: rotate(8deg) scale(1.07); background: rgba(255,255,255,.13); color: white; }
        .gdx-close:active { transform: scale(.92); }
        .gdx-close svg { width: 15px; height: 15px; }

        /* ------------------------------------------------------------------ */
        /* Voice row + waveform */
        /* ------------------------------------------------------------------ */
        .gdx-voice-row {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          gap: 9px;
          padding-left: 9px;
        }
        .gdx-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
          color: rgba(255,255,255,.68);
          font-size: 10px;
          font-weight: 650;
          letter-spacing: .055em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .gdx-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.62);
          box-shadow: 0 0 0 0 rgba(255,255,255,.25);
          animation: gdxDot 2.2s ease-in-out infinite;
        }
        .gdx-shell.is-speaking .gdx-status-dot { animation-duration: 1.15s; }
        @keyframes gdxDot {
          0%,100% { opacity: .45; transform: scale(.85); box-shadow: 0 0 0 0 rgba(255,255,255,.16); }
          50% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 4px rgba(255,255,255,.025); }
        }
        .gdx-wave-wrap { flex: 1 1 auto; min-width: 30px; height: 28px; overflow: hidden; }
        .gdx-wave { display: block; width: 100%; height: 100%; }
        .gdx-timer {
          flex: 0 0 auto;
          min-width: 30px;
          color: rgba(255,255,255,.48);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
        }

        /* ------------------------------------------------------------------ */
        /* Thinking / listening atmosphere. No giant pulsing box-shadow. The
           old pulse was visually harsh; this one is slow and nearly subliminal. */
        /* ------------------------------------------------------------------ */
        .gdx-shell.is-thinking {
          border-color: rgba(255,255,255,.19);
          box-shadow:
            0 13px 48px rgba(0,0,0,.11),
            0 0 28px rgba(255,255,255,.045),
            inset 0 1px 0 rgba(255,255,255,.09);
          animation: gdxBreath 3.2s ease-in-out infinite;
        }
        .gdx-shell.is-listening {
          box-shadow:
            0 13px 48px rgba(0,0,0,.11),
            0 0 30px rgba(255,255,255,.07),
            inset 0 1px 0 rgba(255,255,255,.10);
        }
        @keyframes gdxBreath {
          0%,100% { box-shadow: 0 13px 48px rgba(0,0,0,.11), 0 0 20px rgba(255,255,255,.035), inset 0 1px 0 rgba(255,255,255,.08); }
          50% { box-shadow: 0 15px 52px rgba(0,0,0,.12), 0 0 34px rgba(255,255,255,.075), inset 0 1px 0 rgba(255,255,255,.105); }
        }
        .is-loading-icon { animation: gdxIconBreath 1.9s ease-in-out infinite; }
        @keyframes gdxIconBreath {
          0%,100% { opacity: .38; transform: scale(.96); }
          50% { opacity: .82; transform: scale(1.04); }
        }

        @media (max-width: 640px) {
          .gdx-root { bottom: 16px; padding: 0 11px; }
          .gdx-shell { max-width: calc(100vw - 22px); }
          .gdx-shell.is-expanded { border-radius: 17px; }
          .gdx-inner { padding: 7px; }
          .gdx-shell.is-expanded .gdx-inner { padding: 14px 12px 12px; }
          .gdx-status { font-size: 9px; gap: 5px; }
          .gdx-voice-row { gap: 6px; padding-left: 6px; }
          .gdx-response-scroll { font-size: 13px; max-height: 270px; }
          .gdx-floating-suggestion { max-width: calc(100vw - 32px); font-size: 12px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gdx-shell,
          .gdx-inner,
          .gdx-content,
          .gdx-presence,
          .gdx-floating-suggestion,
          .gdx-suggestion-chip,
          .gdx-search-action,
          .gdx-close,
          .gdx-aura,
          .gdx-highlight {
            transition-duration: 1ms !important;
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
          }
        }

        .reduce-motion .gdx-shell,
        .reduce-motion .gdx-presence,
        .reduce-motion .gdx-content { transition-duration: 1ms !important; }
      `}</style>
    </div>
  );
};

export default SearchBar;
