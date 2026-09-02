"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* =========================================================
   0. TTS CONFIG
   ========================================================= */

const SUPABASE_URL = import.meta.env
  .VITE_SUPABASE_URL as string;

const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;

const TTS_QUOTA_BLOCK_KEY = "gdx_tts_quota_blocked_until";
const TTS_QUOTA_FALLBACK_MS = 24 * 60 * 60 * 1000;

const getTtsQuotaBlockedUntil = (): number => {
  if (typeof window === "undefined") return 0;

  try {
    const value = Number(
      window.localStorage.getItem(TTS_QUOTA_BLOCK_KEY)
    );

    if (Number.isFinite(value) && value > Date.now()) {
      return value;
    }

    window.localStorage.removeItem(TTS_QUOTA_BLOCK_KEY);
  } catch {
    /* Storage can be unavailable in private browsing. */
  }

  return 0;
};

const rememberTtsQuotaLimit = (responseBody: string) => {
  const resetMatch = responseBody.match(
    /X-RateLimit-Reset[^0-9]*(\d{10,13})/i
  );
  const parsedReset = resetMatch ? Number(resetMatch[1]) : 0;
  const resetAt =
    Number.isFinite(parsedReset) && parsedReset > Date.now()
      ? parsedReset
      : Date.now() + TTS_QUOTA_FALLBACK_MS;

  try {
    window.localStorage.setItem(
      TTS_QUOTA_BLOCK_KEY,
      String(resetAt)
    );
  } catch {
    /* The in-flight response still falls back safely. */
  }
};

/* =========================================================
   1. MARKDOWN → HTML
   ========================================================= */

const convertMarkdownToHtml = (text: string): string => {
  let result = text;

  const processInline = (str: string): string => {
    const rules = [
      {
        pattern: /\*\*(.*?)\*\*/g,
        replacement: "<strong class=\"font-normal\">$1</strong>",
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

  result = result
    .split("\n")
    .map((line) => {
      line = line.trim();

      if (!line) return "<br>";

      if (line.startsWith("### ")) {
        return `<h3 class="text-lg font-normal mt-4 mb-2">${processInline(
          line.slice(4)
        )}</h3>`;
      }

      if (line.startsWith("## ")) {
        return `<h2 class="text-xl font-normal mt-4 mb-2">${processInline(
          line.slice(3)
        )}</h2>`;
      }

      if (line.startsWith("# ")) {
        return `<h1 class="text-2xl font-normal mt-4 mb-2">${processInline(
          line.slice(2)
        )}</h1>`;
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<li class="ml-4 list-disc font-normal">${processInline(
          line.slice(2)
        )}</li>`;
      }

      return `<p class="mb-2 font-normal">${processInline(line)}</p>`;
    })
    .join("");

  return result;
};

/* =========================================================
   2. FADE HELPER
   ========================================================= */

function Fade({
  show,
  duration = 300,
  children,
}: {
  show: boolean;
  duration?: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(t);
    }
  }, [show, duration]);

  if (!visible && !show) return null;

  return (
    <div
      className={`transition-opacity ${
        show ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   3. SMOOTH REACTIVE WAVEFORM
   ========================================================= */

const BarWaveform: React.FC<{
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking?: boolean;
}> = ({ analyser, isActive, isSpeaking = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const dimsRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const phaseRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      dimsRef.current = {
        width: rect.width,
        height: rect.height,
        dpr,
      };

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

    const bufferLength = analyser?.frequencyBinCount ?? 0;
    const dataArray = analyser
      ? new Uint8Array(bufferLength)
      : null;

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

      phaseRef.current += 0.045;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const barCount = Math.max(
        10,
        Math.floor(width / (BAR_WIDTH + BAR_GAP))
      );

      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (analyser && dataArray) {
          const dataIndex = Math.floor(
            (i / barCount) * (bufferLength * 0.7)
          );

          value = dataArray[dataIndex] / 255;
        } else if (isSpeaking) {
          /*
           * Browser speechSynthesis doesn't expose an audio stream,
           * so we create a very subtle organic waveform while the
           * native voice is speaking.
           *
           * This is intentionally restrained so it visually matches
           * the real analyser waveform rather than looking like a
           * separate animation.
           */
          const center = barCount / 2;
          const distance = Math.abs(i - center) / center;

          const envelope =
            Math.max(0, 1 - distance * 0.85);

          const wave =
            Math.sin(
              phaseRef.current * 2.1 + i * 0.52
            ) *
            0.22;

          const wave2 =
            Math.sin(
              phaseRef.current * 3.7 + i * 0.18
            ) *
            0.12;

          value = Math.max(
            0.025,
            envelope * (0.16 + wave + wave2)
          );
        }

        const barHeight = Math.max(
          MIN_HEIGHT,
          value * (height * 0.85)
        );

        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = `rgba(255,255,255,${
          0.3 + value * 0.5
        })`;

        ctx.beginPath();
        ctx.roundRect(
          x,
          y,
          BAR_WIDTH,
          barHeight,
          1
        );
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyser, isActive, isSpeaking]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-8 min-w-0"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none w-full h-full"
      />
    </div>
  );
};

/* =========================================================
   3b. RECORDING TIMER
   ========================================================= */

const RecordingTimer: React.FC<{
  isActive: boolean;
}> = ({ isActive }) => {
  const [seconds, setSeconds] = useState(0);

  const intervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      setSeconds(0);

      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
}) => {
  const STORAGE_KEY = "searchbar_state";

  /* -------------------------------------------------------
     Persisted state
     ------------------------------------------------------- */

  const loadPersistedState = useCallback(() => {
    try {
      const isPageRefresh =
        (window.performance as any)?.navigation?.type === 1 ||
        (
          window.performance?.getEntriesByType(
            "navigation"
          )?.[0] as any
        )?.type === "reload";

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

      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        return {
          response: parsed.response || null,
          suggestions: parsed.suggestions || [],
          hasInteracted:
            parsed.hasInteracted || false,
          showExpandedSuggestions:
            parsed.showExpandedSuggestions || false,
          lastActivityTime:
            parsed.lastActivityTime || Date.now(),
        };
      }
    } catch (error) {
      console.warn(
        "Failed to load persisted search state:",
        error
      );
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
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(state)
        );
      } catch (error) {
        console.warn(
          "Failed to save search state:",
          error
        );
      }
    },
    []
  );

  const persistedState = useMemo(
    () => loadPersistedState(),
    [loadPersistedState]
  );

  /* -------------------------------------------------------
     UI state
     ------------------------------------------------------- */

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] =
    useState(false);

  const [response, setResponse] =
    useState<string | null>(
      persistedState.response
    );

  const [suggestions, setSuggestions] =
    useState<string[]>(
      persistedState.suggestions
    );

  const [showTypewriter, setShowTypewriter] =
    useState(false);

  const [suggestionPhase, setSuggestionPhase] =
    useState<
      "emerging" | "visible" | "retreating" | "hidden"
    >("hidden");

  const [fullText, setFullText] = useState("");

  const suggestionIndexRef =
    useRef(0);

  const [hasInteracted, setHasInteracted] =
    useState(
      persistedState.hasInteracted
    );

  const [lastActivityTime, setLastActivityTime] =
    useState(
      persistedState.lastActivityTime
    );

  const [
    showExpandedSuggestions,
    setShowExpandedSuggestions,
  ] = useState(
    persistedState.showExpandedSuggestions
  );

  const [isCollapsing, setIsCollapsing] =
    useState(false);

  const [
    isRestoredFromStorage,
    setIsRestoredFromStorage,
  ] = useState(!!persistedState.response);

  const [
    isCollapsingToThink,
    setIsCollapsingToThink,
  ] = useState(false);

  /* -------------------------------------------------------
     Voice state
     ------------------------------------------------------- */

  const [isVoiceSession, setIsVoiceSession] =
    useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const isVoiceSessionRef =
    useRef(false);

  isVoiceSessionRef.current =
    isVoiceSession;

  /* -------------------------------------------------------
     Placeholder
     ------------------------------------------------------- */

  const placeholderTexts = useMemo(
    () => [
      "Ask anything...",
      "hold search/shift to talk with GDx",
    ],
    []
  );

  const [placeholderText, setPlaceholderText] =
    useState(placeholderTexts[0]);

  const [placeholderPhase, setPlaceholderPhase] =
    useState<
      "typing" | "pause" | "deleting"
    >("pause");

  const [placeholderTarget, setPlaceholderTarget] =
    useState(0);

  /* -------------------------------------------------------
     Audio refs
     ------------------------------------------------------- */

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const analyserRef =
    useRef<AnalyserNode | null>(null);

  const [analyserNode, setAnalyserNode] =
    useState<AnalyserNode | null>(null);

  const analyserDestinationConnectedRef =
    useRef(false);

  const recognitionRef =
    useRef<any>(null);

  const micStreamRef =
    useRef<MediaStream | null>(null);

  const micSourceRef =
    useRef<MediaStreamAudioSourceNode | null>(null);

  const transcriptRef =
    useRef<string>("");

  const silenceTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const currentSourceNodeRef =
    useRef<AudioBufferSourceNode | null>(null);

  const speakTokenRef =
    useRef(0);

  /* -------------------------------------------------------
     Hold-to-speak
     ------------------------------------------------------- */

  const holdTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const isHoldingRef =
    useRef(false);

  const searchBarRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const handleSubmitRef =
    useRef<
      (
        e?: FormEvent,
        customQuery?: string,
        fromVoice?: boolean
      ) => void
    >();

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
  }, [
    response,
    suggestions,
    hasInteracted,
    showExpandedSuggestions,
    lastActivityTime,
    saveState,
  ]);

  const clearPersistedState =
    useCallback(() => {
      try {
        localStorage.removeItem(
          STORAGE_KEY
        );
      } catch (error) {
        console.warn(
          "Failed to clear persisted search state:",
          error
        );
      }
    }, []);

  /* =======================================================
     AUDIO CONTEXT
     ======================================================= */

  const getAudioContext =
    useCallback(() => {
      if (!audioContextRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as any).webkitAudioContext;

        const ctx = new AudioCtx();

        const analyser =
          ctx.createAnalyser();

        analyser.fftSize = 256;

        /*
         * Slightly smoother than the original without
         * changing the visual character.
         */
        analyser.smoothingTimeConstant = 0.8;

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        /*
         * Connect analyser → speakers ONCE.
         *
         * Previously this was being done for every
         * sentence, which could create redundant
         * audio graph connections.
         */
        if (!analyserDestinationConnectedRef.current) {
          analyser.connect(ctx.destination);
          analyserDestinationConnectedRef.current =
            true;
        }

        setAnalyserNode(analyser);
      }

      if (
        audioContextRef.current.state ===
        "suspended"
      ) {
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
    []
  );

  /* =======================================================
     PLACEHOLDER
     ======================================================= */

  useEffect(() => {
    if (
      isLoading ||
      isListening ||
      isVoiceSession ||
      query
    ) {
      return;
    }

    const currentTarget =
      placeholderTexts[placeholderTarget];

    if (placeholderPhase === "pause") {
      const t = setTimeout(
        () =>
          setPlaceholderPhase(
            "deleting"
          ),
        2500
      );

      return () => clearTimeout(t);
    }

    if (
      placeholderPhase === "deleting"
    ) {
      if (
        placeholderText.length === 0
      ) {
        setPlaceholderTarget(
          (prev) =>
            (prev + 1) %
            placeholderTexts.length
        );

        setPlaceholderPhase("typing");

        return;
      }

      const t = setTimeout(
        () =>
          setPlaceholderText((p) =>
            p.slice(0, -1)
          ),
        30
      );

      return () => clearTimeout(t);
    }

    if (
      placeholderPhase === "typing"
    ) {
      if (
        placeholderText === currentTarget
      ) {
        setPlaceholderPhase("pause");
        return;
      }

      const t = setTimeout(
        () =>
          setPlaceholderText(
            currentTarget.slice(
              0,
              placeholderText.length + 1
            )
          ),
        50
      );

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

  /* =======================================================
     ACTIVITY TRACKING
     ======================================================= */

  const debounceTimeoutRef =
    useRef<
      ReturnType<typeof setTimeout> | undefined
    >();

  const debouncedSetActivity =
    useCallback(() => {
      if (debounceTimeoutRef.current) {
        clearTimeout(
          debounceTimeoutRef.current
        );
      }

      debounceTimeoutRef.current =
        setTimeout(() => {
          setLastActivityTime(Date.now());
        }, 100);
    }, []);

  useEffect(() => {
    const handleMouseMove =
      debouncedSetActivity;

    const handleImmediate = () =>
      setLastActivityTime(Date.now());

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    ["keypress", "click", "scroll"].forEach(
      (e) =>
        window.addEventListener(
          e,
          handleImmediate
        )
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      ["keypress", "click", "scroll"].forEach(
        (e) =>
          window.removeEventListener(
            e,
            handleImmediate
          )
      );

      if (debounceTimeoutRef.current) {
        clearTimeout(
          debounceTimeoutRef.current
        );
      }
    };
  }, [debouncedSetActivity]);

  /* =======================================================
     FIRST VISIT
     ======================================================= */

  useEffect(() => {
    const FIRST_VISIT_KEY =
      "gd_ai_first_visit";

    const isFirstVisit =
      !localStorage.getItem(
        FIRST_VISIT_KEY
      );

    if (
      isFirstVisit &&
      !response &&
      suggestions.length === 0 &&
      !isLoading
    ) {
      localStorage.setItem(
        FIRST_VISIT_KEY,
        "true"
      );

      const timer = setTimeout(() => {
        handleSubmit(
          undefined,
          "introduce the website to the new user",
          false
        );
      }, 1500);

      return () =>
        clearTimeout(timer);
    }
  }, []);

  /* =======================================================
     TYPEWRITER
     ======================================================= */

  useEffect(() => {
    if (
      response ||
      suggestions.length > 0 ||
      isVoiceSession
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setShowTypewriter(true);
      }
    }, 10000);

    return () =>
      clearTimeout(timer);
  }, [
    hasInteracted,
    response,
    suggestions,
    isVoiceSession,
  ]);

  useEffect(() => {
    const idleTimer = setInterval(() => {
      const idle =
        Date.now() - lastActivityTime;

      if (
        response ||
        suggestions.length > 0 ||
        isVoiceSession
      ) {
        return;
      }

      if (
        idle > 10000 &&
        hasInteracted &&
        !isLoading
      ) {
        setShowTypewriter(true);
      }
    }, 2000);

    return () =>
      clearInterval(idleTimer);
  }, [
    lastActivityTime,
    hasInteracted,
    isLoading,
    response,
    suggestions,
    isVoiceSession,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const idle =
        Date.now() - lastActivityTime;

      const shouldShow =
        (response ||
          suggestions.length > 0) &&
        !isLoading &&
        idle > 10000 &&
        !isVoiceSession;

      setShowExpandedSuggestions(
        shouldShow
      );
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [
    lastActivityTime,
    response,
    suggestions,
    isLoading,
    isVoiceSession,
  ]);

  useEffect(() => {
    if (
      !showTypewriter ||
      isVoiceSession
    ) {
      setSuggestionPhase("hidden");
      return;
    }

    if (!fullText) {
      setFullText(
        rotatingSuggestions[
          suggestionIndexRef.current
        ]
      );
    }

    setSuggestionPhase("emerging");

    const emergeTimer = setTimeout(
      () =>
        setSuggestionPhase("visible"),
      800
    );

    const interval = setInterval(() => {
      setSuggestionPhase("retreating");

      setTimeout(() => {
        suggestionIndexRef.current =
          (suggestionIndexRef.current + 1) %
          rotatingSuggestions.length;

        setFullText(
          rotatingSuggestions[
            suggestionIndexRef.current
          ]
        );

        setSuggestionPhase("emerging");

        setTimeout(
          () =>
            setSuggestionPhase(
              "visible"
            ),
          800
        );
      }, 700);
    }, 5500);

    return () => {
      clearInterval(interval);
      clearTimeout(emergeTimer);
    };
  }, [
    showTypewriter,
    rotatingSuggestions,
    fullText,
    isVoiceSession,
  ]);

  /* =======================================================
     STOP AUDIO
     ======================================================= */

  const stopAudioOnly =
    useCallback(() => {
      speakTokenRef.current += 1;

      /*
       * Stop native browser speech too.
       */
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      }

      if (
        currentSourceNodeRef.current
      ) {
        try {
          currentSourceNodeRef.current.stop();
          currentSourceNodeRef.current.disconnect();
        } catch {
          /* noop */
        }

        currentSourceNodeRef.current =
          null;
      }

      setIsSpeaking(false);
    }, []);

  /* =======================================================
     NATIVE BROWSER TTS FALLBACK
     ======================================================= */

  const speakWithBrowserTTS =
    useCallback(
      async (
        text: string,
        token: number
      ): Promise<boolean> => {
        if (
          typeof window === "undefined" ||
          !("speechSynthesis" in window)
        ) {
          return false;
        }

        const synthesis =
          window.speechSynthesis;

        synthesis.cancel();

        const cleanText = text.trim();

        if (!cleanText) {
          return false;
        }

        return new Promise((resolve) => {
          let finished = false;

          const finish = (
            success: boolean
          ) => {
            if (finished) return;

            finished = true;

            if (
              token ===
              speakTokenRef.current
            ) {
              setIsSpeaking(false);
            }

            resolve(success);
          };

          const utterance =
            new SpeechSynthesisUtterance(
              cleanText
            );

          utterance.rate = 1.06;
          utterance.pitch = 1;
          utterance.volume = 1;

          utterance.onstart = () => {
            if (
              token !==
              speakTokenRef.current ||
              !isVoiceSessionRef.current
            ) {
              synthesis.cancel();
              finish(false);
              return;
            }

            setIsSpeaking(true);
          };

          utterance.onend = () =>
            finish(true);

          utterance.onerror = () =>
            finish(false);

          /*
           * Chrome/Safari occasionally benefit from
           * explicitly requesting voices before speaking.
           */
          const voices =
            synthesis.getVoices();

          if (voices.length > 0) {
            const preferred =
              voices.find((voice) =>
                /^en(-|_)/i.test(
                  voice.lang
                )
              );

            if (preferred) {
              utterance.voice =
                preferred;
            }
          }

          synthesis.speak(utterance);

          /*
           * Safety timeout in case a browser's
           * speech engine gets stuck.
           */
          setTimeout(() => {
            if (!finished) {
              finish(false);
            }
          }, Math.max(
            15000,
            cleanText.length * 120
          ));
        });
      },
      []
    );

  /* =======================================================
     TTS AUDIO
     ======================================================= */

  const speakVoiceResponse =
    useCallback(
      async (raw: string) => {
        stopAudioOnly();

        const token =
          ++speakTokenRef.current;

        const {
          ctx,
          analyser,
        } = getAudioContext();

        const clean = raw
          .replace(
            /```[\s\S]*?```/g,
            " "
          )
          .replace(
            /`([^`]+)`/g,
            "$1"
          )
          .replace(
            /!\[[^\]]*\]\([^)]*\)/g,
            " "
          )
          .replace(
            /\[([^\]]+)\]\([^)]+\)/g,
            "$1"
          )
          .replace(
            /^\s{0,3}#{1,6}\s*/gm,
            ""
          )
          .replace(
            /^\s{0,3}>\s?/gm,
            ""
          )
          .replace(
            /^\s*[-*+]\s+/gm,
            ""
          )
          .replace(
            /\*\*(.*?)\*\*/g,
            "$1"
          )
          .replace(
            /\*(.*?)\*/g,
            "$1"
          )
          .replace(
            /__(.*?)__/g,
            "$1"
          )
          .replace(
            /_(.*?)_/g,
            "$1"
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

        if (!clean) {
          if (
            isVoiceSessionRef.current
          ) {
            startListeningContinuous();
          }

          return;
        }

        /*
         * Break response into natural chunks.
         * Keeping these relatively short means the first
         * sentence can start playing almost immediately.
         */
        const sentences =
          (
            clean.match(
              /[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g
            ) || [clean]
          )
            .map((s) => s.trim())
            .filter(Boolean);

        setIsSpeaking(true);

        let ttsUnavailableForResponse =
          getTtsQuotaBlockedUntil() > Date.now();

        const fetchAudioBuffer = async (
          sentence: string
        ): Promise<AudioBuffer | null> => {
          if (ttsUnavailableForResponse) {
            return null;
          }

          try {
            const res = await fetch(
              TTS_ENDPOINT,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  apikey:
                    SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                  text: sentence,
                }),
              }
            );

            if (!res.ok) {
              const responseBody = await res.text();

              if (res.status === 429) {
                rememberTtsQuotaLimit(responseBody);
              }

              // Do not send the remaining sentences to an unavailable
              // provider. The caller immediately switches to native TTS.
              ttsUnavailableForResponse = true;
              return null;
            }

            const arrayBuffer =
              await res.arrayBuffer();

            if (!arrayBuffer.byteLength) {
              throw new Error(
                "Empty TTS response"
              );
            }

            return await ctx.decodeAudioData(
              arrayBuffer
            );
          } catch {
            ttsUnavailableForResponse = true;
            return null;
          }
        };

        let nativeFallbackUsed = false;

        try {
          for (
            let i = 0;
            i < sentences.length;
            i++
          ) {
            if (
              token !==
                speakTokenRef.current ||
              !isVoiceSessionRef.current
            ) {
              return;
            }

            const buffer =
              await fetchAudioBuffer(sentences[i]);

            /*
             * If the Supabase TTS request failed,
             * immediately switch to browser TTS.
             */
            if (!buffer) {
              nativeFallbackUsed = true;

              const fallbackText =
                sentences
                  .slice(i)
                  .join(" ");

              const success =
                await speakWithBrowserTTS(
                  fallbackText,
                  token
                );

              if (!success) {
                console.warn(
                  "Browser speech synthesis fallback also failed."
                );
              }

              return;
            }

            if (
              token !==
                speakTokenRef.current ||
              !isVoiceSessionRef.current
            ) {
              return;
            }

            await new Promise<void>(
              (resolve) => {
                const source =
                  ctx.createBufferSource();

                source.buffer = buffer;

                /*
                 * Preserve your existing slightly
                 * quicker voice.
                 */
                source.playbackRate.value =
                  1.06;

                /*
                 * analyser → destination is already
                 * connected once during context setup.
                 */
                source.connect(analyser);

                currentSourceNodeRef.current =
                  source;

                source.onended = () => {
                  if (
                    currentSourceNodeRef.current ===
                    source
                  ) {
                    currentSourceNodeRef.current =
                      null;
                  }

                  resolve();
                };

                source.start(0);
              }
            );
          }
        } finally {
          if (
            token ===
            speakTokenRef.current
          ) {
            if (!nativeFallbackUsed) {
              setIsSpeaking(false);
            }

            if (
              isVoiceSessionRef.current &&
              !nativeFallbackUsed
            ) {
              startListeningContinuous();
            }
          }
        }
      },
      [
        getAudioContext,
        stopAudioOnly,
        speakWithBrowserTTS,
      ]
    );

  /* =======================================================
     CONTINUOUS SPEECH RECOGNITION
     ======================================================= */

  const startListeningContinuous =
    useCallback(async () => {
      if (
        !isVoiceSessionRef.current
      ) {
        return;
      }

      const SpeechRecognition =
        (window as any)
          .SpeechRecognition ||
        (window as any)
          .webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn(
          "Speech recognition not supported"
        );

        stopVoiceSessionRef.current?.();
        return;
      }

      try {
        const {
          ctx,
          analyser,
        } = getAudioContext();

        if (!micStreamRef.current) {
          micStreamRef.current =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                },
              }
            );

          const source =
            ctx.createMediaStreamSource(
              micStreamRef.current
            );

          source.connect(analyser);

          micSourceRef.current =
            source;
        }
      } catch (e) {
        console.warn(
          "Mic stream warning:",
          e
        );
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
      }

      const recognition =
        new SpeechRecognition();

      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognitionRef.current =
        recognition;

      recognition.onstart = () => {
        setIsListening(true);
        transcriptRef.current = "";
      };

      const triggerSubmit = () => {
        if (silenceTimerRef.current) {
          clearTimeout(
            silenceTimerRef.current
          );
        }

        const text =
          transcriptRef.current.trim();

        if (text) {
          recognition.stop();

          setIsListening(false);

          handleSubmitRef.current?.(
            undefined,
            text,
            true
          );
        }
      };

      recognition.onresult = (
        event: any
      ) => {
        const transcript =
          Array.from(event.results)
            .map(
              (r: any) =>
                r[0].transcript
            )
            .join("");

        transcriptRef.current =
          transcript;

        if (silenceTimerRef.current) {
          clearTimeout(
            silenceTimerRef.current
          );
        }

        silenceTimerRef.current =
          setTimeout(() => {
            triggerSubmit();
          }, 1400);
      };

      recognition.onerror = (
        e: any
      ) => {
        if (
          e.error !== "no-speech"
        ) {
          console.warn(
            "Speech error:",
            e.error
          );
        }
      };

      recognition.onend = () => {
        if (
          isVoiceSessionRef.current &&
          !isLoading &&
          !isSpeaking
        ) {
          const text =
            transcriptRef.current.trim();

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
    }, [
      getAudioContext,
      isLoading,
      isSpeaking,
    ]);

  /* =======================================================
     HOLD TO SPEAK
     ======================================================= */

  const startHold =
    useCallback(() => {
      if (isLoading) return;

      getAudioContext();

      isHoldingRef.current = true;

      holdTimerRef.current =
        setTimeout(() => {
          if (
            isHoldingRef.current
          ) {
            setIsVoiceSession(true);

            isVoiceSessionRef.current =
              true;

            setResponse(null);
            setSuggestions([]);
            setShowTypewriter(false);
            setHasInteracted(true);

            startListeningContinuous();
          }
        }, 350);
    }, [
      getAudioContext,
      isLoading,
      startListeningContinuous,
    ]);

  const handleHoldStart =
    useCallback(
      (
        e:
          | React.MouseEvent
          | React.TouchEvent
      ) => {
        e.preventDefault();
        startHold();
      },
      [startHold]
    );

  const handleHoldEnd =
    useCallback(
      (
        e?:
          | React.MouseEvent
          | React.TouchEvent
          | KeyboardEvent
      ) => {
        e?.preventDefault?.();

        const wasHolding =
          isHoldingRef.current;

        isHoldingRef.current = false;

        if (holdTimerRef.current) {
          clearTimeout(
            holdTimerRef.current
          );

          holdTimerRef.current =
            null;
        }

        if (
          !isVoiceSession &&
          wasHolding &&
          query.trim()
        ) {
          handleSubmitRef.current?.(
            undefined,
            undefined,
            false
          );
        }
      },
      [isVoiceSession, query]
    );

  /* =======================================================
     SHIFT TO SPEAK
     ======================================================= */

  useEffect(() => {
    const handleShiftDown = (
      e: KeyboardEvent
    ) => {
      if (
        e.key !== "Shift" ||
        isListening ||
        isLoading ||
        isVoiceSession
      ) {
        return;
      }

      const activeElement =
        document.activeElement as HTMLElement;

      const isInputFocused =
        activeElement &&
        (
          activeElement.tagName ===
            "INPUT" ||
          activeElement.tagName ===
            "TEXTAREA" ||
          activeElement.contentEditable ===
            "true"
        );

      if (isInputFocused) return;

      e.preventDefault();

      startHold();
    };

    const handleShiftUp = (
      e: KeyboardEvent
    ) => {
      if (e.key !== "Shift") return;

      handleHoldEnd();
    };

    window.addEventListener(
      "keydown",
      handleShiftDown
    );

    window.addEventListener(
      "keyup",
      handleShiftUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleShiftDown
      );

      window.removeEventListener(
        "keyup",
        handleShiftUp
      );
    };
  }, [
    isListening,
    isLoading,
    isVoiceSession,
    startHold,
    handleHoldEnd,
  ]);

  /* =======================================================
     STOP VOICE SESSION
     ======================================================= */

  const stopVoiceSessionRef =
    useRef<(() => void) | null>(null);

  const stopVoiceSession =
    useCallback(() => {
      setIsVoiceSession(false);

      isVoiceSessionRef.current =
        false;

      stopAudioOnly();

      if (silenceTimerRef.current) {
        clearTimeout(
          silenceTimerRef.current
        );

        silenceTimerRef.current =
          null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend =
            null;

          recognitionRef.current.onerror =
            null;

          recognitionRef.current.stop();
        } catch {
          /* noop */
        }

        recognitionRef.current =
          null;
      }

      if (micStreamRef.current) {
        micStreamRef.current
          .getTracks()
          .forEach((t) => t.stop());

        micStreamRef.current =
          null;
      }

      if (micSourceRef.current) {
        try {
          micSourceRef.current.disconnect();
        } catch {
          /* noop */
        }

        micSourceRef.current =
          null;
      }

      setIsListening(false);
    }, [stopAudioOnly]);

  stopVoiceSessionRef.current =
    stopVoiceSession;



  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(
          holdTimerRef.current
        );
      }

      if (silenceTimerRef.current) {
        clearTimeout(
          silenceTimerRef.current
        );
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* noop */
        }
      }

      if (micStreamRef.current) {
        micStreamRef.current
          .getTracks()
          .forEach((t) => t.stop());
      }

      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis?.cancel();
        } catch {
          /* noop */
        }
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }

      stopAudioOnly();
    };
  }, [stopAudioOnly]);

  /* =======================================================
     SUBMIT
     ======================================================= */

  const handleSubmit = async (
    e?: FormEvent,
    customQuery?: string,
    fromVoice = false
  ) => {
    e?.preventDefault();

    const text =
      (customQuery ?? query).trim();

    if (!text) return;

    setHasInteracted(true);
    setShowTypewriter(false);
    setShowExpandedSuggestions(false);

    if (!customQuery) {
      setQuery("");
    }

    if (!fromVoice) {
      stopVoiceSession();

      if (
        response ||
        suggestions.length > 0
      ) {
        setIsCollapsingToThink(true);

        await new Promise((r) =>
          setTimeout(r, 500)
        );

        setResponse(null);
        setSuggestions([]);

        await new Promise((r) =>
          setTimeout(r, 200)
        );

        setIsCollapsingToThink(false);
      } else {
        setResponse(null);
        setSuggestions([]);
      }
    }

    setIsLoading(true);

    try {
      const result =
        await sendChatMessage(text);

      const answer =
        (result as any)?.response ??
        "";

      const suggs =
        (result as any)?.suggestions ||
        [];

      if (
        fromVoice &&
        isVoiceSessionRef.current
      ) {
        /*
         * Voice responses are spoken directly.
         * Text response remains hidden in voice mode.
         */
        void speakVoiceResponse(
          String(answer)
        );
      } else {
        setResponse(String(answer));
        setSuggestions(suggs);
        setIsRestoredFromStorage(false);

        onSearch?.(
          String(answer)
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again.";

      if (
        fromVoice &&
        isVoiceSessionRef.current
      ) {
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

  handleSubmitRef.current =
    handleSubmit;

  /* =======================================================
     INTERACTION HELPERS
     ======================================================= */

  const handleSuggestionClick =
    useCallback(
      (s: string) => {
        setQuery("");
        setHasInteracted(true);
        setShowTypewriter(false);
        setShowExpandedSuggestions(
          false
        );

        handleSubmit(
          undefined,
          s,
          false
        );
      },
      []
    );

  const handleInputFocus =
    useCallback(() => {
      setShowTypewriter(false);
      setShowExpandedSuggestions(
        false
      );
      setHasInteracted(true);
    }, []);

  const handleInputChange =
    useCallback(
      (
        e: ChangeEvent<HTMLInputElement>
      ) => {
        setQuery(e.target.value);
        setHasInteracted(true);
        setShowTypewriter(false);
        setShowExpandedSuggestions(
          false
        );
      },
      []
    );

  /* =======================================================
     OUTSIDE CLICK
     ======================================================= */

  useEffect(() => {
    const handleClickOutside = (
      e: MouseEvent
    ) => {
      const target =
        e.target as Node;

      if (
        searchBarRef.current &&
        searchBarRef.current.contains(
          target
        )
      ) {
        return;
      }

      if (isVoiceSession) {
        stopVoiceSession();
        return;
      }

      const el =
        target as Element;

      const isNavigationClick =
        !!el?.closest &&
        (
          el.closest(
            '[class*="fixed top-6"]'
          ) ||
          el.closest(
            '[class*="fixed bottom-6 right-6"]'
          ) ||
          el.closest(
            'button[aria-label*="Scroll to top"]'
          ) ||
          el.closest(
            'button[aria-label*="Close modal"]'
          )
        );

      if (!isNavigationClick) {
        if (
          query.trim() &&
          !response &&
          suggestions.length === 0
        ) {
          setQuery("");
          inputRef.current?.blur();
          return;
        }

        if (
          response ||
          suggestions.length > 0
        ) {
          const COLLAPSE_MS = 1400;

          setIsCollapsing(true);
          setShowExpandedSuggestions(
            false
          );

          window.setTimeout(() => {
            setResponse(null);
            setSuggestions([]);
            setIsCollapsing(false);
            clearPersistedState();
          }, COLLAPSE_MS);
        }
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener(
      "touchstart",
      handleClickOutside as any
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "touchstart",
        handleClickOutside as any
      );
    };
  }, [
    response,
    suggestions,
    query,
    isVoiceSession,
    stopVoiceSession,
    clearPersistedState,
  ]);

  /* =======================================================
     LAYOUT
     ======================================================= */

  const layoutValues = useMemo(() => {
    const hasContent =
      (suggestions.length > 0 ||
        response) &&
      !isVoiceSession;

    const isExpanded =
      hasContent && !isLoading;

    const targetWidth =
      isExpanded
        ? "580px"
        : isVoiceSession
        ? "420px"
        : "460px";

    const targetRadius =
      isExpanded
        ? "16px"
        : "999px";

    return {
      isExpanded,
      targetWidth,
      targetRadius,
    };
  }, [
    suggestions.length,
    response,
    isVoiceSession,
    isLoading,
  ]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      ref={searchBarRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {/* ===================================================
          SUGGESTION BUBBLE
          =================================================== */}

      {showTypewriter &&
        fullText &&
        suggestionPhase !== "hidden" &&
        !isVoiceSession && (
          <div
            onClick={() =>
              handleSuggestionClick(
                fullText
              )
            }
            className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm font-normal text-white px-4 py-2 rounded-full shadow-md whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
            style={{
              animation:
                suggestionPhase ===
                "emerging"
                  ? "suggestionEmerge 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                  : suggestionPhase ===
                    "retreating"
                  ? "suggestionRetreat 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                  : undefined,
            }}
          >
            {fullText}
          </div>
        )}

      {/* ===================================================
          SEARCH BAR CONTAINER
          =================================================== */}

      <div
        className={`mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 overflow-hidden select-none ${
          isLoading
            ? "thinking-container"
            : ""
        } ${
          isVoiceSession ||
          isListening
            ? "listening-container"
            : ""
        }`}
        style={{
          width:
            layoutValues.targetWidth,

          maxWidth: "90vw",

          borderRadius:
            layoutValues.targetRadius,

          transition:
            "width 0.8s cubic-bezier(0.25, 1, 0.3, 1), border-radius 0.8s cubic-bezier(0.25, 1, 0.3, 1), background-color 0.6s ease, box-shadow 0.6s ease",

          cursor: isListening
            ? "default"
            : undefined,

          WebkitTouchCallout:
            "none",

          WebkitUserSelect:
            "none",
        }}
      >
        <div
          className={`transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${
            layoutValues.isExpanded
              ? "p-5 pt-6"
              : "p-2"
          }`}
          style={{
            transitionDuration:
              "800ms",

            transitionDelay:
              layoutValues.isExpanded &&
              !isRestoredFromStorage
                ? "600ms"
                : "0ms",
          }}
        >
          {/* =================================================
              SUGGESTION LIST
              ================================================= */}

          <Fade
            show={
              showExpandedSuggestions &&
              suggestions.length > 0 &&
              !isVoiceSession
            }
            duration={800}
          >
            <div
              className="flex gap-2 flex-wrap justify-center mb-3 animate-fadeIn"
              style={{
                animation:
                  "fadeIn 0.8s ease forwards",
              }}
            >
              {suggestions.map(
                (s, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      handleSuggestionClick(
                        s
                      )
                    }
                    className="px-3 py-1 bg-white/20 text-xs sm:text-sm font-normal rounded-full hover:bg-white/30 transition cursor-pointer"
                    disabled={isLoading}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </Fade>

          {/* =================================================
              RESPONSE
              ================================================= */}

          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${
              response &&
              !isVoiceSession
                ? isCollapsing ||
                  isCollapsingToThink
                  ? "opacity-0 mb-0"
                  : "opacity-100 mb-5"
                : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight:
                isCollapsing ||
                isCollapsingToThink
                  ? "0px"
                  : response &&
                    !isVoiceSession
                  ? "384px"
                  : "0px",

              transitionDuration:
                isCollapsingToThink
                  ? "400ms"
                  : "1000ms",

              transitionDelay:
                response &&
                !isCollapsing &&
                !isCollapsingToThink &&
                !isRestoredFromStorage
                  ? "900ms"
                  : "0ms",
            }}
          >
            {response &&
              !isVoiceSession && (
                <div
                  className="text-foreground text-sm leading-relaxed font-normal px-4 overflow-y-auto scrollbar-hide"
                  style={{
                    animation:
                      isRestoredFromStorage
                        ? "none"
                        : "fadeSlideIn 800ms cubic-bezier(0.25,1,0.3,1) both",

                    animationDelay:
                      isRestoredFromStorage
                        ? "0ms"
                        : "1000ms",

                    maxHeight:
                      "300px",

                    fontWeight: 400,
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      convertMarkdownToHtml(
                        response
                      ),
                  }}
                />
              )}
          </div>

          {/* =================================================
              INPUT FORM
              ================================================= */}

          <form
            onSubmit={(e) =>
              handleSubmit(
                e,
                undefined,
                false
              )
            }
            className="flex items-center gap-2 relative min-h-[40px]"
            onFocus={
              handleInputFocus
            }
          >
            {!isVoiceSession && (
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    isLoading
                      ? "Thinking…"
                      : placeholderText
                  }
                  value={query}
                  onChange={
                    handleInputChange
                  }
                  className={`flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base font-normal px-4 h-10 ${
                    isLoading
                      ? "thinking-placeholder"
                      : ""
                  }`}
                  disabled={isLoading}
                  aria-label="Ask anything"
                  style={{
                    fontWeight: 400,
                  }}
                />
              </div>
            )}

            {/* =================================================
                VOICE WAVEFORM
                ================================================= */}

            {isVoiceSession && (
              <div className="flex-1 flex items-center gap-2 pl-3 min-w-0">
                <BarWaveform
                  analyser={analyserNode}
                  isActive={
                    isVoiceSession &&
                    (isListening ||
                      isSpeaking)
                  }
                  isSpeaking={
                    isSpeaking
                  }
                />

                {isListening && (
                  <RecordingTimer
                    isActive={
                      isListening
                    }
                  />
                )}
              </div>
            )}

            {/* =================================================
                VOICE EXIT / SEARCH
                ================================================= */}

            {isVoiceSession ? (
              /*
               * Minimal CSS X instead of the more
               * decorative-looking Lucide X.
               */
              <button
                type="button"
                onClick={
                  stopVoiceSession
                }
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all active:scale-95 cursor-pointer"
                title="End voice mode"
                aria-label="End voice mode"
              >
                <span
                  aria-hidden="true"
                  className="relative block h-3.5 w-3.5"
                >
                  <span className="absolute left-1/2 top-1/2 block h-[1px] w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white/70" />
                  <span className="absolute left-1/2 top-1/2 block h-[1px] w-3.5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-white/70" />
                </span>
              </button>
            ) : (
              <div
                className="shrink-0 select-none"
                onMouseDown={
                  handleHoldStart
                }
                onMouseUp={
                  handleHoldEnd
                }
                onMouseLeave={
                  handleHoldEnd
                }
                onTouchStart={
                  handleHoldStart
                }
                onTouchEnd={
                  handleHoldEnd
                }
                style={{
                  WebkitTouchCallout:
                    "none",
                  WebkitUserSelect:
                    "none",
                }}
              >
                <div
                  className={`h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)] hover:scale-110 active:scale-95 cursor-pointer ${
                    isListening
                      ? "bg-white/30"
                      : "hover:bg-white/20"
                  }`}
                >
                  <Search
                    className={`h-4 w-4 text-white/50 ${
                      isLoading
                        ? "thinking-icon"
                        : ""
                    } ${
                      isListening
                        ? "!text-white"
                        : ""
                    }`}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* =====================================================
          EXISTING CSS / ANIMATIONS
          ===================================================== */}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes delayedFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
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

          animation:
            glowPulse 2s infinite ease-in-out;
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

            text-shadow:
              0 0 1px rgba(255,255,255,0.2);
          }

          50% {
            color: rgba(255,255,255,0.8);

            text-shadow:
              0 0 3px rgba(255,255,255,0.6);
          }
        }

        .thinking-placeholder::placeholder {
          color: rgba(255,255,255,0.6);

          animation:
            textGlow 2s infinite ease-in-out;

          font-weight: 400;
        }

        .thinking-placeholder[disabled] {
          caret-color: transparent;
        }

        .thinking-icon {
          stroke: rgba(255,255,255,0.5);

          filter:
            drop-shadow(
              0 0 1px
              rgba(255,255,255,0.3)
            );

          animation:
            iconGlow 4s infinite ease-in-out;
        }

        @keyframes iconGlow {
          0%, 100% {
            stroke: rgba(255,255,255,0.3);

            filter:
              drop-shadow(
                0 0 1px
                rgba(255,255,255,0.2)
              );
          }

          50% {
            stroke: rgba(255,255,255,0.8);

            filter:
              drop-shadow(
                0 0 3px
                rgba(255,255,255,0.6)
              );
          }
        }

        .inline-code {
          background:
            rgba(255,255,255,.04);

          padding:
            .05rem .25rem;

          border-radius: 4px;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            "Roboto Mono",
            "Helvetica Neue",
            monospace;

          font-size: .9em;

          font-weight: 400;
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }

          51%, 100% {
            opacity: 0;
          }
        }

        .typewriter-cursor {
          display: inline-block;

          animation:
            blink 1s infinite;

          margin-left: 2px;

          font-weight: 400;
        }

        .typewriter-text {
          display: inline-block;
          min-height: 1.2em;
          font-weight: 400;
        }

        .listening-container {
          border:
            1px solid
            rgba(255,255,255,0.3);

          animation:
            listeningGlow
            1.5s
            infinite
            ease-in-out;
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

            transform:
              translateY(12px)
              scale(0.97);
          }

          100% {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes suggestionRetreat {
          0% {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }

          100% {
            opacity: 0;

            transform:
              translateY(12px)
              scale(0.97);
          }
        }

        /*
         * Keep all interactive text at normal weight.
         * This overrides browser/component defaults without
         * touching your animation system.
         */
        input,
        button {
          font-weight: 400;
        }

        strong {
          font-weight: 400;
        }

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
