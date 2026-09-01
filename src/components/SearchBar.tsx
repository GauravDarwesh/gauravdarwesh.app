"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ---------- 0️⃣ TTS endpoint (existing gdx-tts edge function) ---------- */
const SUPABASE_URL = "https://zdrcjhohalgzhlbufwcl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcmNqaG9oYWxnemhsYnVmd2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQ4ODgsImV4cCI6MjA3MTQ2MDg4OH0.dCIOgyiibgCcXZr6OW2hkqGM3340ugtQivXTjofbEmo";
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

/* ---------- 1️⃣ MARKDOWN → HTML (Original aesthetics) ---------- */
const convertMarkdownToHtml = (text: string): string => {
  let result = text;

  const processInline = (str: string): string => {
    const rules = [
      { pattern: /\*\*(.*?)\*\*/g, replacement: "<strong>$1</strong>" },
      { pattern: /\*(.*?)\*/g, replacement: "<em>$1</em>" },
      { pattern: /`([^`]+)`/g, replacement: '<code class="inline-code">$1</code>' },
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

  result = result
    .split("\n")
    .map((line) => {
      line = line.trim();
      if (!line) return "<br>";
      if (line.startsWith("### "))
        return `<h3 class="text-lg font-semibold mt-4 mb-2">${processInline(line.slice(4))}</h3>`;
      if (line.startsWith("## ")) return `<h2 class="text-xl font-bold mt-4 mb-2">${processInline(line.slice(3))}</h2>`;
      if (line.startsWith("# ")) return `<h1 class="text-2xl font-bold mt-4 mb-2">${processInline(line.slice(2))}</h1>`;
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<li class="ml-4 list-disc">${processInline(line.slice(2))}</li>`;
      }
      return `<p class="mb-2">${processInline(line)}</p>`;
    })
    .join("");

  return result;
};

/* ---------- 2️⃣ Fade helper ---------- */
function Fade({ show, duration = 300, children }: { show: boolean; duration?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(show);
  useEffect(() => {
    if (show) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(t);
    }
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

/* ---------- 3️⃣ Smooth Reactive Waveform (Zero Layout Thrashing) ---------- */
const BarWaveform: React.FC<{ analyser: AnalyserNode | null; isActive: boolean }> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dimsRef.current = { width: rect.width, height: rect.height, dpr };

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

    const BAR_WIDTH = 2.5;
    const BAR_GAP = 2.5;
    const MIN_HEIGHT = 3;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const { width, height, dpr } = dimsRef.current;
      if (width === 0 || height === 0) return;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.max(10, Math.floor(width / (BAR_WIDTH + BAR_GAP)));

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (analyser && dataArray) {
          const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.7));
          value = dataArray[dataIndex] / 255;
        }

        const barHeight = Math.max(MIN_HEIGHT, value * (height * 0.85));
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + value * 0.5})`;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyser, isActive]);

  if (!isActive) return null;

  return (
    <div ref={containerRef} className="flex-1 h-8 min-w-0">
      <canvas ref={canvasRef} className="pointer-events-none w-full h-full" />
    </div>
  );
};

/* ---------- 3️⃣b Timer Component ---------- */
const RecordingTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className="text-sm font-mono text-white/70 tabular-nums shrink-0">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
};

/* ---------- 4️⃣ SearchBar component ---------- */
interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const STORAGE_KEY = "searchbar_state";

  /* ----- Load persisted state ----- */
  const loadPersistedState = useCallback(() => {
    try {
      const isPageRefresh =
        (window.performance as any)?.navigation?.type === 1 ||
        (window.performance?.getEntriesByType("navigation")?.[0] as any)?.type === "reload";

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

  /* ----- UI state ----- */
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

  /* ----- Continuous Voice Session State ----- */
  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isVoiceSessionRef = useRef(false);
  isVoiceSessionRef.current = isVoiceSession;

  /* ----- Rotating placeholder state ----- */
  const placeholderTexts = useMemo(() => ["Ask anything...", "hold search/shift to talk with GDx"], []);
  const [placeholderText, setPlaceholderText] = useState(placeholderTexts[0]);
  const [placeholderPhase, setPlaceholderPhase] = useState<"typing" | "pause" | "deleting">("pause");
  const [placeholderTarget, setPlaceholderTarget] = useState(0);

  /* ----- Audio/waveform refs ----- */
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<string>("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const speakTokenRef = useRef(0);

  /* ----- Hold-to-speak refs ----- */
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();

  // Save state to localStorage
  useEffect(() => {
    const stateToSave = {
      response,
      suggestions,
      hasInteracted,
      showExpandedSuggestions,
      lastActivityTime,
    };
    saveState(stateToSave);
  }, [response, suggestions, hasInteracted, showExpandedSuggestions, lastActivityTime, saveState]);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear persisted search state:", error);
    }
  }, []);

  /* ----- Lazy AudioContext initialization ----- */
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return { ctx: audioContextRef.current, analyser: analyserRef.current! };
  }, []);

  /* ----- Typewriter suggestions ----- */
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

  /* ----- Rotating placeholder effect ----- */
  useEffect(() => {
    if (isLoading || isListening || isVoiceSession || query) return;

    const currentTarget = placeholderTexts[placeholderTarget];

    if (placeholderPhase === "pause") {
      const t = setTimeout(() => setPlaceholderPhase("deleting"), 2500);
      return () => clearTimeout(t);
    }

    if (placeholderPhase === "deleting") {
      if (placeholderText.length === 0) {
        setPlaceholderTarget((prev) => (prev + 1) % placeholderTexts.length);
        setPlaceholderPhase("typing");
        return;
      }
      const t = setTimeout(() => setPlaceholderText((p) => p.slice(0, -1)), 30);
      return () => clearTimeout(t);
    }

    if (placeholderPhase === "typing") {
      if (placeholderText === currentTarget) {
        setPlaceholderPhase("pause");
        return;
      }
      const t = setTimeout(() => setPlaceholderText(currentTarget.slice(0, placeholderText.length + 1)), 50);
      return () => clearTimeout(t);
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

  /* ----- Activity tracking ----- */
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSetActivity = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setLastActivityTime(Date.now());
    }, 100);
  }, []);

  useEffect(() => {
    const handleMouseMove = debouncedSetActivity;
    const handleImmediate = () => setLastActivityTime(Date.now());

    window.addEventListener("mousemove", handleMouseMove);
    ["keypress", "click", "scroll"].forEach((e) => window.addEventListener(e, handleImmediate));

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ["keypress", "click", "scroll"].forEach((e) => window.removeEventListener(e, handleImmediate));
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debouncedSetActivity]);

  /* ----- Auto-submit intro for first-time users ----- */
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

  /* ----- Show typewriter after 10s inactivity ----- */
  useEffect(() => {
    if (response || suggestions.length > 0 || isVoiceSession) return;
    const timer = setTimeout(() => {
      if (!hasInteracted) setShowTypewriter(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [hasInteracted, response, suggestions, isVoiceSession]);

  /* ----- Re-show typewriter after inactivity ----- */
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

  /* Delay expanded suggestions until 10s inactivity */
  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      const shouldShow = (response || suggestions.length > 0) && !isLoading && idle > 10000 && !isVoiceSession;
      setShowExpandedSuggestions(shouldShow);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivityTime, response, suggestions, isLoading, isVoiceSession]);

  /* ----- Suggestion emerge/retreat cycle ----- */
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

  /* ----- Stop Audio & Exit Voice Mode ----- */
  const stopAudioOnly = useCallback(() => {
    speakTokenRef.current += 1;
    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.stop();
        currentSourceNodeRef.current.disconnect();
      } catch (e) {
        /* noop */
      }
      currentSourceNodeRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const stopVoiceSession = useCallback(() => {
    setIsVoiceSession(false);
    isVoiceSessionRef.current = false;
    stopAudioOnly();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {
        /* noop */
      }
      recognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    setIsListening(false);
  }, [stopAudioOnly]);

  /* ----- Reactive Voice Playback via Web Audio ----- */
  const speakVoiceResponse = useCallback(
    async (raw: string) => {
      stopAudioOnly();
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

      const fetchAudioBuffer = async (sentence: string): Promise<AudioBuffer | null> => {
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
          if (!res.ok) throw new Error(`TTS status ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          return await ctx.decodeAudioData(arrayBuffer);
        } catch (err) {
          console.warn("TTS error:", err);
          return null;
        }
      };

      const bufferPromises = sentences.map((s) => fetchAudioBuffer(s));

      try {
        for (let i = 0; i < sentences.length; i++) {
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return;

          const buffer = await bufferPromises[i];
          if (token !== speakTokenRef.current || !isVoiceSessionRef.current || !buffer) continue;

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
    [getAudioContext, stopAudioOnly],
  );

  /* ----- Continuous Speech Recognition Loop ----- */
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
      console.warn("Mic stream warning:", e);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
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
        handleSubmitRef.current?.(undefined, text, true);
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
      }, 1400);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        console.warn("Speech error:", e.error);
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
          } catch (e) {
            /* noop */
          }
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      /* noop */
    }
  }, [getAudioContext, isLoading, isSpeaking, stopVoiceSession]);

  /* ----- Hold-to-speak trigger ----- */
  const startHold = useCallback(() => {
    if (isLoading) return;
    getAudioContext();
    isHoldingRef.current = true;

    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setIsVoiceSession(true);
        isVoiceSessionRef.current = true;
        setResponse(null);
        setSuggestions([]);
        setShowTypewriter(false);
        setHasInteracted(true);
        startListeningContinuous();
      }
    }, 350);
  }, [getAudioContext, isLoading, startListeningContinuous]);

  const handleHoldStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      startHold();
    },
    [startHold],
  );

  const handleHoldEnd = useCallback(
    (e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
      e?.preventDefault?.();
      const wasHolding = isHoldingRef.current;
      isHoldingRef.current = false;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (!isVoiceSession && wasHolding && query.trim()) {
        handleSubmitRef.current?.(undefined, undefined, false);
      }
    },
    [isVoiceSession, query],
  );

  /* ----- Desktop: hold Shift to speak ----- */
  useEffect(() => {
    const handleShiftDown = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || isListening || isLoading || isVoiceSession) return;

      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true");

      if (isInputFocused) return;

      e.preventDefault();
      startHold();
    };

    const handleShiftUp = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return;
      handleHoldEnd();
    };

    window.addEventListener("keydown", handleShiftDown);
    window.addEventListener("keyup", handleShiftUp);
    return () => {
      window.removeEventListener("keydown", handleShiftDown);
      window.removeEventListener("keyup", handleShiftUp);
    };
  }, [isListening, isLoading, isVoiceSession, startHold, handleHoldEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      stopAudioOnly();
    };
  }, [stopAudioOnly]);

  /* ----- Submit handler ----- */
  const handleSubmit = async (e?: FormEvent, customQuery?: string, fromVoice = false) => {
    e?.preventDefault();
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
        await new Promise((r) => setTimeout(r, 500));
        setResponse(null);
        setSuggestions([]);
        await new Promise((r) => setTimeout(r, 200));
        setIsCollapsingToThink(false);
      } else {
        setResponse(null);
        setSuggestions([]);
      }
    }

    setIsLoading(true);

    try {
      const result = await sendChatMessage(text);
      const answer = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];

      if (fromVoice && isVoiceSessionRef.current) {
        void speakVoiceResponse(String(answer));
      } else {
        setResponse(String(answer));
        setSuggestions(suggs);
        setIsRestoredFromStorage(false);
        onSearch?.(String(answer));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      if (fromVoice && isVoiceSessionRef.current) {
        void speakVoiceResponse(msg);
      } else {
        setResponse(msg);
        setSuggestions([]);
        setIsRestoredFromStorage(false);
        onSearch?.(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  /* ----- Interaction helpers ----- */
  const handleSuggestionClick = useCallback((s: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    handleSubmit(undefined, s, false);
  }, []);

  const handleInputFocus = useCallback(() => {
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
  }, []);

  /* Outside click handler */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBarRef.current && searchBarRef.current.contains(target)) return;

      if (isVoiceSession) {
        stopVoiceSession();
        return;
      }

      const el = target as Element;
      const isNavigationClick =
        !!el?.closest &&
        (el.closest('[class*="fixed top-6"]') ||
          el.closest('[class*="fixed bottom-6 right-6"]') ||
          el.closest('button[aria-label*="Scroll to top"]') ||
          el.closest('button[aria-label*="Close modal"]'));

      if (!isNavigationClick) {
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
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside as any);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as any);
    };
  }, [response, suggestions, query, isVoiceSession, stopVoiceSession, clearPersistedState]);

  /* ----- Layout calculations (Original dynamic style with fixed baseline) ----- */
  const layoutValues = useMemo(() => {
    const hasContent = (suggestions.length > 0 || response) && !isVoiceSession;
    const isExpanded = hasContent && !isLoading;
    const targetWidth = isExpanded ? "580px" : isVoiceSession ? "420px" : "460px";
    const targetRadius = isExpanded ? "16px" : "999px";

    return { isExpanded, targetWidth, targetRadius };
  }, [suggestions.length, response, isVoiceSession, isLoading]);

  /* ----- Render ----- */
  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {/* ── Suggestion bubble (emerge/retreat from search bar) ── */}
      {showTypewriter && fullText && suggestionPhase !== "hidden" && !isVoiceSession && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md
                     whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
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

      {/* ── Search bar container (Original authentic styling) ── */}
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
          {/* ── Suggestion list ── */}
          <Fade show={showExpandedSuggestions && suggestions.length > 0 && !isVoiceSession} duration={800}>
            <div
              className="flex gap-2 flex-wrap justify-center mb-3 animate-fadeIn"
              style={{ animation: "fadeIn 0.8s ease forwards" }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-1 bg-white/20 text-xs sm:text-sm rounded-full hover:bg-white/30 transition cursor-pointer"
                  disabled={isLoading}
                >
                  {s}
                </button>
              ))}
            </div>
          </Fade>

          {/* ── Assistant response (Text Mode Only) ── */}
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
                className="text-foreground text-sm leading-relaxed px-4 overflow-y-auto scrollbar-hide"
                style={{
                  animation: isRestoredFromStorage ? "none" : "fadeSlideIn 800ms cubic-bezier(0.25,1,0.3,1) both",
                  animationDelay: isRestoredFromStorage ? "0ms" : "1000ms",
                  maxHeight: "300px",
                }}
                dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
              />
            )}
          </div>

          {/* ── Input form ── */}
          <form
            onSubmit={(e) => handleSubmit(e, undefined, false)}
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
                  className={`flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                             text-foreground placeholder:text-muted-foreground text-base px-4 h-10 ${
                               isLoading ? "thinking-placeholder" : ""
                             }`}
                  disabled={isLoading}
                  aria-label="Ask anything"
                />
              </div>
            )}

            {/* Waveform fills available space when in Voice Mode */}
            {isVoiceSession && (
              <div className="flex-1 flex items-center gap-2 pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession && (isListening || isSpeaking)} />
                {isListening && <RecordingTimer isActive={isListening} />}
              </div>
            )}

            {/* Voice exit (✕) or Search icon / hold-to-speak target */}
            {isVoiceSession ? (
              <button
                type="button"
                onClick={stopVoiceSession}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="End voice mode"
              >
                <X className="h-4 w-4" />
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
                  className={`h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300 
                             ease-[cubic-bezier(0.25,1,0.3,1)] hover:scale-110 active:scale-95 cursor-pointer
                             ${isListening ? "bg-white/30" : "hover:bg-white/20"}`}
                >
                  <Search
                    className={`h-4 w-4 text-white/50 ${isLoading ? "thinking-icon" : ""} ${
                      isListening ? "!text-white" : ""
                    }`}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── Original Shared CSS ── */}
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes delayedFadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        .animate-fadeIn { animation: fadeIn 0.8s ease forwards; }
        .animate-delayedFadeIn { animation: delayedFadeIn 1s ease forwards; animation-delay: 0.1s; }

        .thinking-container{
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.05);
          animation: glowPulse 2s infinite ease-in-out;
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(255,255,255,0.1), inset 0 0 10px rgba(255,255,255,0.05);
          }
          50% { 
            box-shadow: 0 0 20px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.15);
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
        .thinking-placeholder::placeholder{
          color: rgba(255,255,255,0.6);
          animation: textGlow 2s infinite ease-in-out;
        }
        .thinking-placeholder[disabled]{caret-color:transparent;}
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

        .inline-code{background:rgba(255,255,255,.04);padding:.05rem .25rem;border-radius:4px;
                     font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,"Roboto Mono","Helvetica Neue",monospace;
                     font-size:.9em;}

        /* Typewriter cursor */
        @keyframes blink {0%,50%{opacity:1;}51%,100%{opacity:0;}}
        .typewriter-cursor{display:inline-block;animation:blink 1s infinite;margin-left:2px;font-weight:normal;}
        .typewriter-text{display:inline-block;min-height:1.2em;}

        /* Listening styles */
        .listening-container{
          border: 1px solid rgba(255,255,255,0.3);
          animation: listeningGlow 1.5s infinite ease-in-out;
        }
        @keyframes listeningGlow {
          0%, 100% { 
            box-shadow: 0 0 8px rgba(255,255,255,0.15), inset 0 0 12px rgba(255,255,255,0.08);
          }
          50% { 
            box-shadow: 0 0 25px rgba(255,255,255,0.4), inset 0 0 25px rgba(255,255,255,0.2);
          }
        }
        .listening-input{
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
      `}</style>
    </div>
  );
};

export default SearchBar;
