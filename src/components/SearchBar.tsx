"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ---------- 0️⃣ TTS endpoint (existing gdx-tts edge function) ---------- */
const SUPABASE_URL = "https://zdrcjhohalgzhlbufwcl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcmNqaG9oYWxnemhsYnVmd2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODQ4ODgsImV4cCI6MjA3MTQ2MDg4OH0.dCIOgyiibgCcXZr6OW2hkqGM3340ugtQivXTjofbEmo";
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;
const SILENT_MP3 =
  "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIUdyEqABJRAAA//tQxCADAAABIAAA";

/* ---------- 1️⃣ MARKDOWN → HTML (unchanged) ---------- */
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

/* ---------- 3️⃣ ChatGPT-style Vertical Bars Waveform ---------- */
const BarWaveform: React.FC<{ analyser: AnalyserNode | null; isActive: boolean }> = ({ analyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let bufferLength = 0;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    if (analyser) {
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const BAR_WIDTH = 2;
    const BAR_GAP = 2;
    const MIN_HEIGHT = 3;
    const start = performance.now();

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (analyser && dataArray) analyser.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      // Resize canvas to match container
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Calculate bar count based on available width
      const barCount = Math.max(8, Math.floor(w / (BAR_WIDTH + BAR_GAP)));
      const t = (performance.now() - start) / 1000;

      for (let i = 0; i < barCount; i++) {
        let value: number;
        if (analyser && dataArray) {
          const dataIndex = Math.floor((i / barCount) * bufferLength);
          value = dataArray[dataIndex] / 255;
        } else {
          // Synthetic "speaking" pulse when no analyser is available
          value =
            0.18 +
            0.32 * Math.abs(Math.sin(t * 3.1 + i * 0.35)) +
            0.2 * Math.abs(Math.sin(t * 5.7 + i * 0.13));
        }
        const barHeight = Math.max(MIN_HEIGHT, value * (h * 0.85));

        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (h - barHeight) / 2;

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
  const [suggestionVisible, setSuggestionVisible] = useState(true);
  const [suggestionPhase, setSuggestionPhase] = useState<"emerging" | "visible" | "retreating" | "hidden">("hidden");
  const [fullText, setFullText] = useState("");
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const suggestionIndexRef = useRef(0);
  const [hasInteracted, setHasInteracted] = useState(persistedState.hasInteracted);
  const [lastActivityTime, setLastActivityTime] = useState(persistedState.lastActivityTime);
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(persistedState.showExpandedSuggestions);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isRestoredFromStorage, setIsRestoredFromStorage] = useState(!!persistedState.response);
  const [isCollapsingToThink, setIsCollapsingToThink] = useState(false);
  const [isListening, setIsListening] = useState(false);

  /* ----- Rotating placeholder state ----- */
  const [placeholderText, setPlaceholderText] = useState("Ask anything...");
  const [placeholderPhase, setPlaceholderPhase] = useState<"typing" | "pause" | "deleting">("pause");
  const [placeholderTarget, setPlaceholderTarget] = useState(0); // 0 = "Ask anything...", 1 = "Hold to speak"
  const placeholderTexts = useMemo(() => ["Ask anything...", "hold search/shift to speak"], []);

  /* ----- Audio/waveform refs ----- */
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const transcriptRef = useRef<string>(""); // hold transcript during listening

  /* ----- Speech playback (TTS) state ----- */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakTokenRef = useRef(0);
  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string) => void>();
  const stopSpeakingRef = useRef<() => void>();


  /* ----- Hold-to-speak refs ----- */
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);

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

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ----- Typewriter suggestions ----- */
  const rotatingSuggestions = useMemo(() => [
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
  ], []);

  /* ----- Rotating placeholder effect ----- */
  useEffect(() => {
    if (isLoading || isListening || query) return;

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
  }, [placeholderText, placeholderPhase, placeholderTarget, placeholderTexts, isLoading, isListening, query]);

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
        handleSubmit(undefined, "introduce the website to the new user");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  /* ----- Show typewriter after 10s inactivity (first visit too) ----- */
  useEffect(() => {
    if (response || suggestions.length > 0) return;
    const timer = setTimeout(() => {
      if (!hasInteracted) setShowTypewriter(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [hasInteracted, response, suggestions]);

  /* ----- Re-show typewriter after inactivity ----- */
  useEffect(() => {
    const idleTimer = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      if (response || suggestions.length > 0) return;
      if (idle > 10000 && hasInteracted && !isLoading) {
        setShowTypewriter(true);
      }
    }, 2000);
    return () => clearInterval(idleTimer);
  }, [lastActivityTime, hasInteracted, isLoading, response, suggestions]);

  /* Delay expanded suggestions until 10s inactivity */
  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      const shouldShow = (response || suggestions.length > 0) && !isLoading && idle > 10000;
      setShowExpandedSuggestions(shouldShow);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastActivityTime, response, suggestions, isLoading]);


  /* ----- Suggestion emerge/retreat cycle ----- */
  useEffect(() => {
    if (!showTypewriter) {
      setSuggestionPhase("hidden");
      return;
    }

    // Set initial text and emerge
    if (!fullText) {
      setFullText(rotatingSuggestions[suggestionIndexRef.current]);
    }
    setSuggestionPhase("emerging");

    // After emerge animation completes, mark as visible
    const emergeTimer = setTimeout(() => setSuggestionPhase("visible"), 800);

    // Total cycle: 800ms emerge + 4000ms visible + 700ms retreat = ~5500ms
    const interval = setInterval(() => {
      // Retreat back into search bar
      setSuggestionPhase("retreating");

      // After retreat animation, swap text and emerge again
      setTimeout(() => {
        suggestionIndexRef.current = (suggestionIndexRef.current + 1) % rotatingSuggestions.length;
        setFullText(rotatingSuggestions[suggestionIndexRef.current]);
        setCurrentSuggestionIndex(suggestionIndexRef.current);
        setSuggestionPhase("emerging");

        setTimeout(() => setSuggestionPhase("visible"), 800);
      }, 700);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearTimeout(emergeTimer);
    };
  }, [showTypewriter, rotatingSuggestions]);

  /* ----- Hold-to-speak: start listening ----- */
  const startListening = useCallback((stream?: MediaStream) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    // Set up audio context for waveform using the already-acquired stream
    if (stream) {
      try {
        streamRef.current = stream;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        setAnalyserNode(analyser);
      } catch (err) {
        console.warn("Could not set up audio analyser:", err);
      }
    }

    recognition.onstart = () => {
      setIsListening(true);
      setHasInteracted(true);
      setShowTypewriter(false);
      setShowExpandedSuggestions(false);
      transcriptRef.current = "";
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      transcriptRef.current = transcript; // store in ref, don't show yet
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Show the transcribed text now
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript) {
        setQuery(finalTranscript);
      }
      transcriptRef.current = "";
      // Blur input to prevent cursor showing
      inputRef.current?.blur();

      // Cleanup audio
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setAnalyserNode(null);

      // Auto-submit the captured transcript
      if (finalTranscript) {
        handleSubmitRef.current?.(undefined, finalTranscript);
      }
    };


    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setAnalyserNode(null);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    // Force cleanup in case onend doesn't fire
    isHoldingRef.current = false;
  }, []);

  /* ----- Shared hold-to-speak logic ----- */
  const startHold = useCallback(() => {
    if (isLoading) return;

    stopSpeakingRef.current?.();
    isHoldingRef.current = true;

    // CRITICAL: Acquire microphone directly from user gesture context
    // to satisfy browser security policies, then wait for hold threshold
    let micStream: MediaStream | null = null;
    const micPromise = navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      .then((stream) => {
        micStream = stream;
      })
      .catch((err) => {
        console.warn("Microphone access denied:", err);
      });

    holdTimerRef.current = setTimeout(async () => {
      if (isHoldingRef.current) {
        inputRef.current?.blur();
        await micPromise; // ensure mic is ready
        if (micStream) {
          startListening(micStream);
        } else {
          // Fallback: try without stream (waveform won't work but speech might)
          startListening();
        }
      } else {
        // User released before threshold — clean up mic
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
        }
      }
    }, 400);
  }, [isLoading, startListening]);

  /* ----- Hold-to-speak handlers (on magnifying glass) ----- */
  const handleHoldStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent default to avoid iOS magnifying glass and form submission
      e.preventDefault();
      startHold();
    },
    [startHold],
  );

  const handleHoldEnd = useCallback((e?: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
    e?.preventDefault?.();
    const wasHolding = isHoldingRef.current;
    isHoldingRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isListening) {
      stopListening();
    } else if (wasHolding && !isListening) {
      // Short tap on search icon — submit if there's a query
      if (query.trim()) {
        handleSubmit(undefined);
      }
    }
  }, [isListening, stopListening, query]);

  /* ----- Desktop: hold Shift to speak ----- */
  useEffect(() => {
    const handleShiftDown = (e: KeyboardEvent) => {
      if (e.key !== "Shift" || isListening || isLoading) return;

      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true");

      if (isInputFocused) return;

      e.preventDefault();
      setShowTypewriter(false);
      setHasInteracted(true);
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
  }, [isListening, isLoading, startHold, handleHoldEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      stopSpeakingRef.current?.();
    };
  }, []);

  /* ----- Text-to-speech engine (gdx-tts + Web Speech fallback) ----- */
  const stopSpeaking = useCallback(() => {
    speakTokenRef.current += 1;
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {
      /* noop */
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
      } catch (e) {
        /* noop */
      }
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speakResponse = useCallback(
    async (raw: string) => {
      stopSpeaking();
      const token = speakTokenRef.current;

      // Strip markdown
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

      if (!clean) return;

      const sentences = (clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean])
        .map((s) => s.trim())
        .filter(Boolean);

      setIsSpeaking(true);

      const speakWithSynthesis = (from: number) =>
        new Promise<void>((resolve) => {
          const synth = window.speechSynthesis;
          if (!synth) return resolve();
          let i = from;
          const next = () => {
            if (token !== speakTokenRef.current || i >= sentences.length) return resolve();
            const utter = new SpeechSynthesisUtterance(sentences[i]);
            i += 1;
            utter.onend = next;
            utter.onerror = () => resolve();
            synth.speak(utter);
          };
          next();
        });

      try {
        for (let i = 0; i < sentences.length; i++) {
          if (token !== speakTokenRef.current) return;
          let url: string;
          try {
            const res = await fetch(`${TTS_ENDPOINT}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                apikey: SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ text: sentences[i] }),
            });
            if (!res.ok) throw new Error(`tts ${res.status}`);
            const blob = await res.blob();
            if (!blob.size) throw new Error("empty audio");
            url = URL.createObjectURL(blob);
          } catch (err) {
            console.warn("gdx-tts failed, falling back to speechSynthesis:", err);
            await speakWithSynthesis(i);
            return;
          }

          if (token !== speakTokenRef.current) {
            URL.revokeObjectURL(url);
            return;
          }

          await new Promise<void>((resolve) => {
            const audio = new Audio(url);
            currentAudioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(url);
              resolve();
            });
          });
        }
      } finally {
        if (token === speakTokenRef.current) {
          currentAudioRef.current = null;
          setIsSpeaking(false);
        }
      }
    },
    [stopSpeaking],
  );

  /* ----- Submit handler ----- */

  const handleSubmit = async (e?: FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    stopSpeaking();
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    if (!customQuery) setQuery("");

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

    setIsLoading(true);

    try {
      const result = await sendChatMessage(text);
      const answer = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];
      setResponse(String(answer));
      setSuggestions(suggs);
      setIsRestoredFromStorage(false);
      onSearch?.(String(answer));
      void speakResponse(String(answer));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setResponse(msg);
      setSuggestions([]);
      setIsRestoredFromStorage(false);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  handleSubmitRef.current = handleSubmit;
  stopSpeakingRef.current = stopSpeaking;

  /* ----- Interaction helpers ----- */
  const handleSuggestionClick = useCallback((s: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);
    handleSubmit(undefined, s);
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

      const el = target as Element;
      const isNavigationClick =
        !!el?.closest &&
        (el.closest('[class*="fixed top-6"]') ||
          el.closest('[class*="fixed bottom-6 right-6"]') ||
          el.closest('button[aria-label*="Scroll to top"]') ||
          el.closest('button[aria-label*="Close modal"]'));

      if (!isNavigationClick) {
        // If there's a query in the bar (after voice input), clear it and reset
        if (query.trim() && !response && suggestions.length === 0) {
          setQuery("");
          inputRef.current?.blur();
          return;
        }

        // If there's a response/suggestions, collapse them
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
  }, [response, suggestions, query, clearPersistedState]);

  /* ----- Layout calculations ----- */
  const layoutValues = useMemo(() => {
    const dynamicWidth = Math.min(300 + query.length * 8, 580);
    const hasContent = suggestions.length > 0 || response;
    const isExpanded = hasContent && !isLoading;
    // Ensure enough width for waveform + timer + icon when listening
    const listeningWidth = isListening ? Math.max(dynamicWidth, 380) : dynamicWidth;
    const targetWidth = isExpanded ? "580px" : `${listeningWidth}px`;
    const targetRadius = isExpanded ? "16px" : "999px";

    return { dynamicWidth, isExpanded, targetWidth, targetRadius };
  }, [query.length, suggestions.length, response, isLoading]);

  /* ----- Render ----- */
  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {/* ── Suggestion bubble (emerge/retreat from search bar) ── */}
      {showTypewriter && fullText && suggestionPhase !== "hidden" && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md
                     whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          style={{
            animation: suggestionPhase === "emerging"
              ? "suggestionEmerge 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : suggestionPhase === "retreating"
              ? "suggestionRetreat 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards"
              : undefined,
          }}
        >
          {fullText}
        </div>
      )}

      {/* ── Search bar container ── */}
      <div
        className={`mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 overflow-hidden select-none ${
          isLoading ? "thinking-container" : ""
        } ${isListening ? "listening-container" : ""}`}
        style={{
          width: layoutValues.targetWidth,
          maxWidth: "90vw",
          borderRadius: layoutValues.targetRadius,
          transition: "width 1.2s cubic-bezier(0.25, 1, 0.3, 1), border-radius 1.2s cubic-bezier(0.25, 1, 0.3, 1), background-color 0.6s ease, box-shadow 0.6s ease",
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
          <Fade show={showExpandedSuggestions && suggestions.length > 0} duration={800}>
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

          {/* ── Assistant response ── */}
          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${
              response ? (isCollapsing || isCollapsingToThink ? "opacity-0 mb-0" : "opacity-100 mb-5") : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight: isCollapsing || isCollapsingToThink ? "0px" : response ? "384px" : "0px",
              transitionDuration: isCollapsingToThink ? "400ms" : "1000ms",
              transitionDelay: response && !isCollapsing && !isCollapsingToThink && !isRestoredFromStorage ? "900ms" : "0ms",
            }}
          >
            {response && (
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
          <form onSubmit={(e) => handleSubmit(e)} className="flex items-center gap-2 relative" onFocus={handleInputFocus}>
            {!isListening && !isSpeaking && (
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={isLoading ? "Thinking…" : "hold shift/search to talk with GDx"}
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
            {/* Waveform + timer fill available space when listening */}
            {(isListening || isSpeaking) && (
              <div className="flex-1 flex items-center gap-2 pl-3 min-w-0">
                <BarWaveform analyser={isListening ? analyserNode : null} isActive={isListening || isSpeaking} />
                <RecordingTimer isActive={isListening} />
              </div>
            )}
            {/* Search icon / hold-to-speak target */}
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
                <Search className={`h-4 w-4 text-white/50 ${isLoading ? "thinking-icon" : ""} ${isListening ? "!text-white" : ""}`} />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Shared CSS ── */}
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
