"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search, X, Mic } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ---------- Configuration & Endpoints ---------- */
const SUPABASE_URL = "https://zdrcjhohalgzhlbufwcl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcmNqaG9oYWxnemhsYnVmd2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQ4ODgsImV4cCI6MjA3MTQ2MDg4OH0.dCIOgyiibgCcXZr6OW2hkqGM3340ugtQivXTjofbEmo";
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

/* ---------- Markdown Formatter ---------- */
const formatMarkdown = (text: string): string => {
  if (!text) return "";

  const processInline = (str: string): string => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-neutral-300">$1</em>')
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-white/10 text-neutral-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>',
      )
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline underline-offset-2">$1</a>',
      );
  };

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="h-2"></div>';
      if (trimmed.startsWith("### ")) {
        return `<h3 class="text-sm font-semibold text-white mt-3 mb-1 tracking-wide">${processInline(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 class="text-base font-bold text-white mt-3 mb-1.5 tracking-wide">${processInline(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1 class="text-lg font-bold text-white mt-4 mb-2 tracking-wide">${processInline(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return `<li class="ml-4 list-disc text-neutral-300 leading-relaxed">${processInline(trimmed.slice(2))}</li>`;
      }
      return `<p class="text-neutral-300 leading-relaxed mb-1.5">${processInline(trimmed)}</p>`;
    })
    .join("");
};

/* ---------- Ultra-Smooth 60FPS Reactive Waveform ---------- */
const BarWaveform: React.FC<{ analyser: AnalyserNode | null; isActive: boolean }> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

  // Handle resizing outside of draw loop to prevent layout thrashing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dimensionsRef.current = { width: rect.width, height: rect.height, dpr };

      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;
      canvasRef.current.style.width = `${rect.width}px`;
      canvasRef.current.style.height = `${rect.height}px`;
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = analyser ? new Uint8Array(bufferLength) : null;

    const BAR_WIDTH = 3;
    const BAR_GAP = 3;
    const MIN_HEIGHT = 4;
    const TOTAL_BAR_SPACE = BAR_WIDTH + BAR_GAP;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      const { width, height, dpr } = dimensionsRef.current;
      if (width === 0 || height === 0) return;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.floor(width / TOTAL_BAR_SPACE);
      const totalUsedWidth = barCount * TOTAL_BAR_SPACE - BAR_GAP;
      const startX = (width - totalUsedWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (analyser && dataArray) {
          // Focus sampling on human voice range (lower-to-mid frequencies)
          const freqIndex = Math.floor((i / barCount) * (bufferLength * 0.65));
          value = dataArray[freqIndex] / 255;
        }

        const barHeight = Math.max(MIN_HEIGHT, value * (height * 0.9));
        const x = startX + i * TOTAL_BAR_SPACE;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + value * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyser, isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="flex-1 h-6 min-w-0 flex items-center overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
    </div>
  );
};

/* ---------- SearchBar Component ---------- */
interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const STORAGE_KEY = "gdx_searchbar_state";

  /* Persistent State */
  const [response, setResponse] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).response : null;
    } catch {
      return null;
    }
  });

  const [suggestions, setSuggestions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).suggestions || [] : [];
    } catch {
      return [];
    }
  });

  /* Interaction States */
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [suggestionPhase, setSuggestionPhase] = useState<"emerging" | "visible" | "retreating" | "hidden">("hidden");
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  /* Continuous Voice Session States */
  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isVoiceSessionRef = useRef(false);
  isVoiceSessionRef.current = isVoiceSession;

  /* Rotating Placeholder */
  const placeholderOptions = useMemo(() => ["Ask anything about Gaurav...", "Hold search or Shift to talk"], []);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState(placeholderOptions[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  /* Audio & Recognition Refs */
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string>("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speakTokenRef = useRef(0);

  /* Input & Gesture Refs */
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const suggestionIndexRef = useRef(0);
  const lastActivityTimeRef = useRef(Date.now());

  const rotatingSuggestions = useMemo(
    () => [
      "✨ Tell me about Gaurav's Experience",
      "✨ What is Gaurav's Education?",
      "✨ What are Gaurav's Skills?",
      "✨ Can you share Gaurav's Recommendations?",
      "✨ Show me Gaurav's Achievements",
      "✨ List Gaurav's Certifications",
      "✨ What Projects has Gaurav built?",
      "✨ What is Gaurav's Current Role?",
      "✨ What is Gaurav's Work Philosophy?",
    ],
    [],
  );

  /* Sync LocalStorage */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ response, suggestions }));
    } catch {
      /* ignore */
    }
  }, [response, suggestions]);

  /* Lazy Shared Audio Context */
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return { ctx: audioContextRef.current, analyser: analyserRef.current! };
  }, []);

  /* Typewriter Suggestion Cycle */
  useEffect(() => {
    if (response || isVoiceSession || hasInteracted) {
      setShowTypewriter(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowTypewriter(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [response, isVoiceSession, hasInteracted]);

  useEffect(() => {
    if (!showTypewriter || isVoiceSession) {
      setSuggestionPhase("hidden");
      return;
    }

    if (!currentSuggestion) {
      setCurrentSuggestion(rotatingSuggestions[suggestionIndexRef.current]);
    }
    setSuggestionPhase("emerging");
    const emergeTimer = setTimeout(() => setSuggestionPhase("visible"), 600);

    const interval = setInterval(() => {
      setSuggestionPhase("retreating");
      setTimeout(() => {
        suggestionIndexRef.current = (suggestionIndexRef.current + 1) % rotatingSuggestions.length;
        setCurrentSuggestion(rotatingSuggestions[suggestionIndexRef.current]);
        setSuggestionPhase("emerging");
        setTimeout(() => setSuggestionPhase("visible"), 600);
      }, 500);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(emergeTimer);
    };
  }, [showTypewriter, rotatingSuggestions, currentSuggestion, isVoiceSession]);

  /* Placeholder Typing Animation */
  useEffect(() => {
    if (isLoading || isVoiceSession || isListening || query) return;

    const target = placeholderOptions[placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && placeholderText === target) {
      timeout = setTimeout(() => setIsDeleting(true), 3000);
    } else if (isDeleting && placeholderText === "") {
      setIsDeleting(false);
      setPlaceholderIndex((prev) => (prev + 1) % placeholderOptions.length);
    } else {
      timeout = setTimeout(
        () => {
          setPlaceholderText((prev) =>
            isDeleting ? target.slice(0, prev.length - 1) : target.slice(0, prev.length + 1),
          );
        },
        isDeleting ? 25 : 45,
      );
    }

    return () => clearTimeout(timeout);
  }, [
    placeholderText,
    isDeleting,
    placeholderIndex,
    placeholderOptions,
    isLoading,
    isVoiceSession,
    isListening,
    query,
  ]);

  /* Voice Pipeline: Stop Audio & Session */
  const stopAudio = useCallback(() => {
    speakTokenRef.current += 1;
    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current.disconnect();
      } catch {
        /* noop */
      }
      currentSourceNodeRef.current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    setIsSpeaking(false);

  }, []);

  const stopVoiceSession = useCallback(() => {
    setIsVoiceSession(false);
    isVoiceSessionRef.current = false;
    stopAudio();

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

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    setIsListening(false);
  }, [stopAudio]);

  /* Voice Pipeline: Speak Response */
  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudio();
      const token = ++speakTokenRef.current;
      const { ctx, analyser } = getAudioContext();

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
        if (isVoiceSessionRef.current) startListeningContinuous();
        return;
      }

      const sentences = (clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean]).map((s) => s.trim()).filter(Boolean);

      setIsSpeaking(true);

      let ttsUnavailable = false;

      const speakWithSynthesis = (sentence: string) =>
        new Promise<void>((resolve) => {
          const synth = window.speechSynthesis;
          if (!synth) return resolve();
          const utterance = new SpeechSynthesisUtterance(sentence);
          utterance.rate = 1.05;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          synth.speak(utterance);
        });

      const fetchAudioBuffer = async (sentence: string): Promise<AudioBuffer | null> => {
        if (ttsUnavailable) return null;
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
            // 429 (rate limit) / 5xx: stop hammering the endpoint for this response
            if (res.status === 429 || res.status >= 500) ttsUnavailable = true;
            throw new Error(`TTS status ${res.status}`);
          }
          const arrayBuffer = await res.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
          console.warn("TTS fetch error:", err);
          return null;
        }
      };

      const bufferPromises = sentences.map((s) => fetchAudioBuffer(s));

      try {
        for (let i = 0; i < sentences.length; i++) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return;

          const buffer = await bufferPromises[i];
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return;
          if (!buffer) {
            // Fallback to the browser's built-in voice so playback never goes silent
            await speakWithSynthesis(sentences[i]);
            continue;
          }


          await new Promise<void>((resolve) => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = 1.06;
            source.connect(analyser);
            analyser.connect(ctx.destination);
            currentSourceNodeRef.current = source;

            source.onended = () => {
              if (currentSourceNodeRef.current === source) {
                currentSourceNodeRef.current = null;
              }
              resolve();
            };

            source.start(0);
          });
        }
      } finally {
        if (token === speakTokenRef.current) {
          setIsSpeaking(false);
          if (isVoiceSessionRef.current) {
            startListeningContinuous();
          }
        }
      }
    },
    [getAudioContext, stopAudio],
  );

  /* Continuous Speech Recognition Loop */
  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      stopVoiceSession();
      return;
    }

    try {
      const { ctx, analyser } = getAudioContext();
      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const source = ctx.createMediaStreamSource(micStreamRef.current);
        source.connect(analyser);
      }
    } catch (e) {
      console.warn("Mic setup error:", e);
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
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      transcriptRef.current = "";
    };

    const triggerSubmit = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const text = transcriptRef.current.trim();
      if (text) {
        recognition.stop();
        setIsListening(false);
        handleSubmit(undefined, text, true);
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      transcriptRef.current = transcript;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        triggerSubmit();
      }, 1300);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.warn("Recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      if (isVoiceSessionRef.current && !isLoading && !isSpeaking) {
        const text = transcriptRef.current.trim();
        if (text) {
          triggerSubmit();
        } else {
          try {
            recognition.start();
          } catch {
            /* noop */
          }
        }
      }
    };

    try {
      recognition.start();
    } catch {
      /* noop */
    }
  }, [getAudioContext, isLoading, isSpeaking, stopVoiceSession]);

  /* Start Voice Gesture */
  const triggerVoiceSession = useCallback(() => {
    if (isLoading) return;
    getAudioContext();
    setIsVoiceSession(true);
    isVoiceSessionRef.current = true;
    setResponse(null);
    setSuggestions([]);
    setShowTypewriter(false);
    setHasInteracted(true);
    startListeningContinuous();
  }, [getAudioContext, isLoading, startListeningContinuous]);

  const handleHoldStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      isHoldingRef.current = true;
      holdTimerRef.current = setTimeout(() => {
        if (isHoldingRef.current) {
          triggerVoiceSession();
        }
      }, 300);
    },
    [triggerVoiceSession],
  );

  const handleHoldEnd = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.preventDefault();
      const wasHolding = isHoldingRef.current;
      isHoldingRef.current = false;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (!isVoiceSession && wasHolding && query.trim()) {
        handleSubmit(undefined, undefined, false);
      }
    },
    [isVoiceSession, query],
  );

  /* Desktop Shift Shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || isListening || isLoading || isVoiceSession) return;
      const target = document.activeElement as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      e.preventDefault();
      triggerVoiceSession();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isListening, isLoading, isVoiceSession, triggerVoiceSession]);

  /* Unified Submit Function */
  const handleSubmit = async (e?: FormEvent, customQuery?: string, fromVoice = false) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    setHasInteracted(true);
    setShowTypewriter(false);
    if (!customQuery) setQuery("");

    if (!fromVoice) {
      stopVoiceSession();
      setResponse(null);
      setSuggestions([]);
    }

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
        onSearch?.(answer);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (fromVoice && isVoiceSessionRef.current) {
        void speakVoiceResponse(msg);
      } else {
        setResponse(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* Outside Click Handler */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBarRef.current && searchBarRef.current.contains(e.target as Node)) return;

      if (isVoiceSession) {
        stopVoiceSession();
        return;
      }

      if (response || suggestions.length > 0) {
        setIsCollapsing(true);
        window.setTimeout(() => {
          setResponse(null);
          setSuggestions([]);
          setIsCollapsing(false);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* noop */
          }
        }, 300);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [response, suggestions, isVoiceSession, stopVoiceSession]);

  /* Stable Target Width Calculation */
  const containerWidthClass = useMemo(() => {
    if (response && !isVoiceSession) return "w-[620px] max-w-[94vw] rounded-2xl";
    if (isVoiceSession) return "w-[440px] max-w-[94vw] rounded-full";
    return "w-[480px] max-w-[94vw] rounded-full";
  }, [response, isVoiceSession]);

  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3 font-sans antialiased"
    >
      {/* ── Typewriter Bubble ── */}
      {showTypewriter && currentSuggestion && suggestionPhase !== "hidden" && !isVoiceSession && (
        <div
          onClick={() => {
            setQuery("");
            setHasInteracted(true);
            setShowTypewriter(false);
            handleSubmit(undefined, currentSuggestion, false);
          }}
          className={`cursor-pointer px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-white/90 
                     bg-neutral-900/80 backdrop-blur-md border border-white/10 shadow-lg 
                     hover:bg-neutral-800/90 hover:border-white/20 transition-all duration-300
                     max-w-[90vw] truncate select-none ${
                       suggestionPhase === "emerging"
                         ? "opacity-100 translate-y-0 scale-100"
                         : suggestionPhase === "retreating"
                           ? "opacity-0 translate-y-2 scale-95"
                           : "opacity-100 translate-y-0 scale-100"
                     }`}
        >
          {currentSuggestion}
        </div>
      )}

      {/* ── Main Interactive Glass Container ── */}
      <div
        className={`mx-auto border bg-neutral-950/70 backdrop-blur-2xl text-white shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden select-none ${containerWidthClass} ${
          isLoading ? "border-sky-500/40 shadow-sky-500/10 shadow-lg" : "border-white/15"
        } ${isVoiceSession ? "border-sky-400/50 bg-neutral-950/85" : ""}`}
      >
        <div className={`p-2.5 transition-all duration-300 ${response && !isVoiceSession ? "p-5" : ""}`}>
          {/* ── Follow-up Suggestion Chips ── */}
          {suggestions.length > 0 && !isVoiceSession && !isLoading && (
            <div className="flex gap-1.5 flex-wrap justify-center mb-3.5 animate-fadeIn">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery("");
                    handleSubmit(undefined, s, false);
                  }}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/5 rounded-full text-xs text-neutral-300 hover:text-white transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Text Response Container (Text Mode Only) ── */}
          {response && !isVoiceSession && (
            <div
              className={`transition-all duration-300 overflow-hidden ${
                isCollapsing ? "max-h-0 opacity-0 mb-0" : "max-h-[360px] opacity-100 mb-4"
              }`}
            >
              <div
                className="text-xs sm:text-sm text-neutral-300 leading-relaxed px-2 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-white/20"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(response) }}
              />
            </div>
          )}

          {/* ── Search & Voice Row ── */}
          <form
            onSubmit={(e) => handleSubmit(e, undefined, false)}
            className="flex items-center gap-2 relative min-h-[38px]"
            onFocus={() => {
              setShowTypewriter(false);
              setHasInteracted(true);
            }}
          >
            {/* Standard Text Input */}
            {!isVoiceSession && (
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={isLoading ? "Thinking..." : placeholderText}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHasInteracted(true);
                    setShowTypewriter(false);
                  }}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-neutral-500 text-sm px-3.5 h-9 font-normal"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Voice Session Waveform & Real-time Indicator */}
            {isVoiceSession && (
              <div className="flex-1 flex items-center gap-3 pl-3 pr-2 min-w-0">
                <span className="text-xs tracking-wider uppercase font-medium text-sky-400 shrink-0">
                  {isLoading ? "Thinking" : isSpeaking ? "Speaking" : "Listening"}
                </span>
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession && (isListening || isSpeaking)} />
              </div>
            )}

            {/* Action Buttons */}
            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white transition-all duration-200 active:scale-95 shrink-0"
                title="End voice session"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div
                className="shrink-0"
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
              >
                <button
                  type="submit"
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer"
                  title="Search or hold to talk"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
