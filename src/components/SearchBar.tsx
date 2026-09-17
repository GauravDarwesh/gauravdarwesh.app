"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Mic, Check, X, ArrowRight } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* =========================================================
   0. TTS CONFIG
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
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

type VoiceLink = {
  label: string;
  url: string;
};

const getVoiceLinkLabel = (url: string, markdownLabel?: string): string => {
  const cleanMarkdownLabel = markdownLabel?.trim();
  if (cleanMarkdownLabel) return cleanMarkdownLabel;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("github.com")) return "GitHub";
    if (host.includes("twitter.com") || host.includes("x.com")) return "X";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("calendar.app.google") || host.includes("calendly.com")) return "Book a call";
    if (host.includes("wa.me") || host.includes("whatsapp.com")) return "WhatsApp";

    return host;
  } catch {
    return "Open link";
  }
};

const extractVoiceLinks = (text: string): VoiceLink[] => {
  const links: VoiceLink[] = [];
  const seen = new Set<string>();

  const addLink = (url: string, markdownLabel?: string) => {
    const normalized = url.trim().replace(/[),.!?;:]+$/g, "");
    if (!/^https?:\/\//i.test(normalized)) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    links.push({
      url: normalized,
      label: getVoiceLinkLabel(normalized, markdownLabel),
    });
  };

  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
  for (const match of text.matchAll(markdownLinkPattern)) {
    addLink(match[2], match[1]);
  }

  const plainUrlPattern = /https?:\/\/[^\s<>()]+/gi;
  for (const match of text.matchAll(plainUrlPattern)) {
    addLink(match[0]);
  }

  return links.slice(0, 4);
};

type VisualItem = {
  url: string;
  title?: string;
};

const extractVisualItems = (visuals: any): VisualItem[] => {
  if (!visuals) return [];

  const items: VisualItem[] = [];

  if (Array.isArray(visuals)) {
    items.push(
      ...visuals.map((item: any) => ({
        url: String(item?.url ?? "").trim(),
        title: String(item?.title ?? "").trim() || undefined,
      })),
    );
  } else if (Array.isArray(visuals?.collections)) {
    for (const collection of visuals.collections) {
      const title = String(collection?.title ?? "").trim() || undefined;
      const collectionImages = Array.isArray(collection?.imageUrls)
        ? collection.imageUrls
        : Array.isArray(collection?.items)
          ? collection.items
          : [];

      for (const url of collectionImages) {
        items.push({
          url: String(url ?? "").trim(),
          title,
        });
      }
    }
  }

  if (!items.length && Array.isArray(visuals?.image_urls)) {
    items.push(
      ...visuals.image_urls.map((url: any) => ({
        url: String(url ?? "").trim(),
        title: "Gaurav's Travels",
      })),
    );
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (!/^https?:\/\//i.test(item.url)) return false;
    const key = item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const waitForVisualReady = (items: VisualItem[]): Promise<void> => {
  const firstUrl = items[0]?.url;
  if (!firstUrl) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    image.onload = finish;
    image.onerror = finish;
    image.src = firstUrl;

    window.setTimeout(finish, 5000);
  });
};

const SearchVisualCarousel: React.FC<{
  items: VisualItem[];
  visible: boolean;
}> = ({ items, visible }) => {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!items.length) {
      setIndex(0);
      setLoaded(new Set());
      return;
    }

    setIndex(0);

    const preloaded: HTMLImageElement[] = [];
    const loadedUrls = new Set<string>();
    let cancelled = false;

    const markLoaded = (url: string) => {
      if (cancelled) return;
      loadedUrls.add(url);
      setLoaded(new Set(loadedUrls));
    };

    for (const item of items) {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => markLoaded(item.url);
      image.onerror = () => {
        /* Keep the current image visible; do not switch to a failed image. */
      };
      image.src = item.url;
      preloaded.push(image);

      if (image.complete && image.naturalWidth > 0) {
        markLoaded(item.url);
      }
    }

    return () => {
      cancelled = true;
      for (const image of preloaded) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [items]);

  useEffect(() => {
    if (!visible || items.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => {
        for (let step = 1; step <= items.length; step++) {
          const next = (current + step) % items.length;
          if (loaded.has(items[next].url)) {
            return next;
          }
        }

        return current;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [items, loaded, visible]);

  if (!items.length) return null;

  const current = items[index];

  return (
    <div className="w-full mb-4 overflow-hidden rounded-2xl border border-foreground/15 bg-white/5 shadow-lg backdrop-blur-sm">
      <div className="relative w-full h-[150px] sm:h-[160px] overflow-hidden bg-black/5">
        {items.map((item, itemIndex) => (
          <img
            key={item.url}
            src={item.url}
            alt={item.title || "Gaurav's travel visual"}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: itemIndex === index && loaded.has(item.url) ? 1 : 0,
              transition: "opacity 900ms cubic-bezier(0.25,1,0.3,1)",
              willChange: "opacity",
              pointerEvents: itemIndex === index ? "auto" : "none",
            }}
            loading={itemIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        ))}

        <div className="absolute left-3 bottom-3 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm text-white/90 text-[11px] border border-white/15">
          {current.title || "Visuals"}
        </div>

        <div className="absolute right-3 bottom-3 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm text-white/80 text-[11px] border border-white/15 tabular-nums">
          {index + 1} / {items.length}
        </div>
      </div>
    </div>
  );
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
   4. REACTIVE WAVEFORM (now synthetic-only for consistency)
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

    // Remove real analyser dependency for visual consistency
    // We will always use the synthetic speech animation when isSpeaking is true.

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

      for (let i = 0; i < barCount; i++) {
        let targetValue = 0.08;

        if (isSpeaking) {
          // Synthetic speech animation – identical for human and AI speech.
          const t = now * 0.005;
          const speechRhythm = Math.sin(t * 1.8) * Math.sin(t * 3.2) + 0.45 * Math.sin(t * 5.1 + 0.7);
          const modulation = Math.max(0.18, 0.58 + 0.22 * speechRhythm);
          const center = (barCount - 1) / 2;
          const distance = Math.abs(i - center) / Math.max(1, center);
          const barEnvelope = Math.max(0.18, 1 - Math.pow(distance, 1.6));
          const harmonic = Math.sin(t * 4.0 + i * 0.42) * 0.5 + Math.cos(t * 2.2 + i * 0.28) * 0.5;

          targetValue = Math.max(0.1, Math.min(0.92, 0.14 + (harmonic * 0.5 + 0.5) * modulation * barEnvelope * 0.92));
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

        const waveformColor = document.documentElement.dataset.theme === "minimal" ? "0, 0, 0" : "255, 255, 255";
        ctx.fillStyle = `rgba(${waveformColor}, ${0.3 + value * 0.5})`;
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
    <div ref={containerRef} className="flex-1 h-7 sm:h-8 min-w-0 overflow-hidden">
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
    <span className="text-xs sm:text-sm font-mono font-normal text-white/70 tabular-nums shrink-0">
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
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [streamPulse, setStreamPulse] = useState(false);
  const [searchVisuals, setSearchVisuals] = useState<VisualItem[]>([]);
  const [isPreparingToStream, setIsPreparingToStream] = useState(false);
  const streamPulseFrameRef = useRef<number | null>(null);

  /* -------------------------------------------------------
     Modes: Voice Session vs Transcribe
     ------------------------------------------------------- */

  const [isVoiceSession, setIsVoiceSession] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLinks, setVoiceLinks] = useState<VoiceLink[]>([]);
  const [voiceLinksVisible, setVoiceLinksVisible] = useState(false);
  const [voiceLinksExiting, setVoiceLinksExiting] = useState(false);

  const voiceLinksShownRef = useRef(false);
  const voiceLinksRef = useRef<VoiceLink[]>([]);
  const voiceLinksExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceVisualsExitTimerRef = useRef<number | null>(null);

  const isVoiceSessionRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isAndroidRef = useRef(typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || ""));
  const androidRecorderRef = useRef<MediaRecorder | null>(null);
  const androidRecordedChunksRef = useRef<Blob[]>([]);
  const androidRecordingMimeTypeRef = useRef<string>("");
  const androidRecordingPromiseRef = useRef<Promise<Blob> | null>(null);
  const isXiaomiRef = useRef(
    typeof navigator !== "undefined" && /Xiaomi|Redmi|POCO|MiuiBrowser|MIUI|Mi\s?Pad/i.test(navigator.userAgent || ""),
  );

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

  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const hostedAudioRef = useRef<HTMLAudioElement | null>(null);
  const androidPlaybackAudioRef = useRef<HTMLAudioElement | null>(null);
  const hostedObjectUrlRef = useRef<string | null>(null);
  const speakTokenRef = useRef(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<(e?: FormEvent, customQuery?: string, fromVoice?: boolean) => void>();
  const stopVoiceSessionRef = useRef<((collapseVisuals?: boolean) => void) | null>(null);
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
        } else {
          const prime = new SpeechSynthesisUtterance(" ");
          prime.volume = 0.01;
          window.speechSynthesis.speak(prime);
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
        /* Browser may block Audio construction */
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
     VOICE RESPONSE LINK BUBBLES
     ======================================================= */

  const hideVoiceLinkBubbles = useCallback(() => {
    if (voiceLinksExitTimerRef.current) {
      clearTimeout(voiceLinksExitTimerRef.current);
      voiceLinksExitTimerRef.current = null;
    }

    if (!voiceLinksVisible && !voiceLinks.length) return;

    setVoiceLinksExiting(true);

    voiceLinksExitTimerRef.current = setTimeout(() => {
      setVoiceLinksVisible(false);
      setVoiceLinksExiting(false);
      setVoiceLinks([]);
      voiceLinksRef.current = [];
      voiceLinksShownRef.current = false;
      voiceLinksExitTimerRef.current = null;
    }, 400);
  }, [voiceLinks.length, voiceLinksVisible]);

  const prepareVoiceLinkBubbles = useCallback(
    (links: VoiceLink[]) => {
      if (voiceLinksExitTimerRef.current) {
        clearTimeout(voiceLinksExitTimerRef.current);
        voiceLinksExitTimerRef.current = null;
      }

      if (voiceLinksVisible && voiceLinks.length > 0) {
        setVoiceLinksExiting(true);

        voiceLinksExitTimerRef.current = setTimeout(() => {
          voiceLinksRef.current = links;
          setVoiceLinks(links);
          setVoiceLinksVisible(false);
          setVoiceLinksExiting(false);
          voiceLinksShownRef.current = false;
          voiceLinksExitTimerRef.current = null;
        }, 400);

        return;
      }

      voiceLinksRef.current = links;
      setVoiceLinks(links);
      setVoiceLinksVisible(false);
      setVoiceLinksExiting(false);
      voiceLinksShownRef.current = false;
    },
    [voiceLinks.length, voiceLinksVisible],
  );

  const revealVoiceLinkBubbles = useCallback(() => {
    const links = voiceLinksRef.current;

    if (voiceLinksShownRef.current || !links.length || !isVoiceSessionRef.current) return;

    voiceLinksShownRef.current = true;
    setVoiceLinksExiting(false);
    setVoiceLinksVisible(true);
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

      const isAndroid = isAndroidRef.current;

      /* -----------------------------------------------------
         ANDROID LOCAL TTS
         ----------------------------------------------------- */
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
                revealVoiceLinkBubbles();

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

          if (!didSpeak) {
            return false;
          }

          if (index < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 70));
          }
        }

        return true;
      }

      /* -----------------------------------------------------
         EXISTING iOS / DESKTOP PATH — kept unchanged
         ----------------------------------------------------- */

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
          revealVoiceLinkBubbles();

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
          synthesis.speak(utterance);
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

          const decoded = await ctx.decodeAudioData(audioBytes.slice(0));

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
          console.warn("Xiaomi Web Audio TTS playback failed; using existing Android audio fallback:", error);
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
            playPromise
              .then(() => {
                revealVoiceLinkBubbles();
              })
              .catch((error) => finish(error instanceof Error ? error : new Error("Playback blocked")));
          } else {
            revealVoiceLinkBubbles();
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
        if (hostedAudioRef.current === androidPlaybackAudioRef.current) {
          hostedAudioRef.current = null;
        } else {
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
     FAST HOSTED TTS WITH SENTENCE QUEUE

     IMPORTANT:
     - The existing UI / waveform / transcription / Android logic remains untouched.
     - Voice responses are split into short natural chunks.
     - TTS for the next chunk is prefetched while the current chunk is speaking.
     - The first chunk is played as soon as its TTS request finishes.
     ======================================================= */

  const speakVoiceResponse = useCallback(
    async (raw: string, linkSource: string = raw) => {
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
      const extractedVoiceLinks = extractVoiceLinks(linkSource);
      prepareVoiceLinkBubbles(extractedVoiceLinks);

      const clean = raw
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/https?:\/\/[^\s<>()]+/gi, " ")
        .replace(/\bwww\.[^\s<>()]+/gi, " ")
        .replace(/\b(?:linkedin|instagram|github|twitter|x|youtube|facebook)\.com\/[^\s<>()]+/gi, " ")
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

      /*
       * Keep chunks fairly small so the first TTS response is fast, while
       * keeping enough words together that speech still sounds natural.
       */
      const splitForRealtimeSpeech = (text: string): string[] => {
        const sentenceParts = text
          .split(/(?<=[.!?])\s+/)
          .map((part) => part.trim())
          .filter(Boolean);

        const chunks: string[] = [];
        let pending = "";

        const flush = () => {
          const value = pending.trim();
          if (value) chunks.push(value);
          pending = "";
        };

        for (const sentence of sentenceParts) {
          if (!pending) {
            if (sentence.length <= 150) {
              pending = sentence;
            } else {
              const words = sentence.split(/\s+/);
              let current = "";

              for (const word of words) {
                const candidate = current ? `${current} ${word}` : word;
                if (candidate.length > 150 && current) {
                  chunks.push(current);
                  current = word;
                } else {
                  current = candidate;
                }
              }

              pending = current;
            }
          } else if (`${pending} ${sentence}`.length <= 190) {
            pending = `${pending} ${sentence}`;
          } else {
            flush();

            if (sentence.length <= 150) {
              pending = sentence;
            } else {
              const words = sentence.split(/\s+/);
              let current = "";

              for (const word of words) {
                const candidate = current ? `${current} ${word}` : word;
                if (candidate.length > 150 && current) {
                  chunks.push(current);
                  current = word;
                } else {
                  current = candidate;
                }
              }

              pending = current;
            }
          }
        }

        flush();

        return chunks.length ? chunks : [text];
      };

      const chunks = splitForRealtimeSpeech(clean);
      if (!chunks.length) {
        reconnectMicAfterPlayback();
        return;
      }

      /*
       * Fetch only the requested TTS chunk here. Playback is deliberately
       * separated so later chunks can be generated while the current one plays.
       */
      const fetchHostedAudio = async (text: string): Promise<ArrayBuffer | null> => {
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return null;

        try {
          const res = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ text }),
          });

          if (!res.ok) {
            const body = await res.text().catch(() => "");
            if (res.status === 429) rememberTtsQuotaLimit(body);
            return null;
          }

          const contentType = res.headers.get("content-type") || "";
          const bytes = await res.arrayBuffer();

          if (!bytes.byteLength || /application\/(json|text)/i.test(contentType)) {
            return null;
          }

          return bytes;
        } catch {
          return null;
        }
      };

      const playDesktopAudio = async (audioBytes: ArrayBuffer): Promise<boolean> => {
        try {
          const audioGraph = getAudioContext();
          if (audioGraph.ctx.state === "suspended") await audioGraph.ctx.resume();

          const audioBuffer = await audioGraph.ctx.decodeAudioData(audioBytes.slice(0));

          if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

          await new Promise<void>((resolve) => {
            const source = audioGraph.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = 1.0;

            const monitor = analyserMonitorRef.current;
            if (monitor && !analyserDestinationConnectedRef.current) {
              try {
                audioGraph.analyser.connect(monitor);
                monitor.connect(audioGraph.ctx.destination);
                analyserDestinationConnectedRef.current = true;
              } catch {
                /* noop */
              }
            }

            source.connect(audioGraph.analyser);
            currentSourceNodeRef.current = source;

            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              source.onended = null;
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

            source.onended = finish;

            try {
              revealVoiceLinkBubbles();
              source.start(0);
            } catch {
              finish();
            }
          });

          return true;
        } catch {
          return false;
        }
      };

      const playOneChunk = async (text: string, audioBytesPromise?: Promise<ArrayBuffer | null>): Promise<boolean> => {
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

        const audioBytes = audioBytesPromise ? await audioBytesPromise : await fetchHostedAudio(text);

        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) return false;

        if (audioBytes) {
          disconnectMicForPlayback();
          isSpeakingRef.current = true;
          setIsSpeaking(true);

          let didPlay = false;

          if (isAndroidRef.current) {
            didPlay = await playHostedAudioOnAndroid(audioBytes, token);
          } else {
            didPlay = await playDesktopAudio(audioBytes);
          }

          if (didPlay) {
            return true;
          }

          isSpeakingRef.current = false;
          setIsSpeaking(false);
        }

        /*
         * Only this individual chunk falls back to browser TTS. This keeps a
         * provider hiccup from making the user wait for the whole response.
         */
        disconnectMicForPlayback();
        isSpeakingRef.current = true;
        setIsSpeaking(true);

        const fallbackWorked = await speakWithBrowserTTS(text, token);

        isSpeakingRef.current = false;
        setIsSpeaking(false);
        return fallbackWorked;
      };

      /*
       * Start the first TTS request immediately. As soon as it is playing,
       * request the next chunk so its network + TTS latency is hidden behind
       * the user's current audio.
       */
      const prefetches: Array<Promise<ArrayBuffer | null> | null> = Array(chunks.length).fill(null);

      prefetches[0] = fetchHostedAudio(chunks[0]);

      disconnectMicForPlayback();

      let allPlayed = true;

      for (let index = 0; index < chunks.length; index++) {
        if (token !== speakTokenRef.current || !isVoiceSessionRef.current) {
          allPlayed = false;
          break;
        }

        if (index + 1 < chunks.length && !prefetches[index + 1]) {
          prefetches[index + 1] = fetchHostedAudio(chunks[index + 1]);
        }

        const didPlay = await playOneChunk(chunks[index], prefetches[index] ?? undefined);

        if (!didPlay) {
          allPlayed = false;
          break;
        }

        /* Fire the following request while this chunk is still fresh in the queue. */
        if (index + 2 < chunks.length && !prefetches[index + 2]) {
          prefetches[index + 2] = fetchHostedAudio(chunks[index + 2]);
        }

        /* Tiny natural transition; no long artificial delay. */
        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
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
      reconnectMicAfterPlayback();

      if (isVoiceSessionRef.current && allPlayed) {
        setTimeout(() => {
          if (isVoiceSessionRef.current && !isLoadingRef.current && !isSpeakingRef.current) {
            transcriptRef.current = "";
            reconnectMicAfterPlayback();
            void startListeningContinuousRef.current?.();
          }
        }, 250);
      } else if (isVoiceSessionRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isVoiceSessionRef.current && !isLoadingRef.current && !isSpeakingRef.current) {
            transcriptRef.current = "";
            reconnectMicAfterPlayback();
            void startListeningContinuousRef.current?.();
          }
        }, 250);
      }
    },
    [
      getAudioContext,
      playHostedAudioOnAndroid,
      speakWithBrowserTTS,
      stopAudioOnly,
      prepareVoiceLinkBubbles,
      revealVoiceLinkBubbles,
      hideVoiceLinkBubbles,
    ],
  );

  /* =======================================================
     XIAOMI TRANSCRIPTION REQUEST
     ======================================================= */

  const requestXiaomiTranscription = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    const mime = (audioBlob.type || "").toLowerCase();
    const extension = mime.includes("mp4")
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

    formData.append("audio", audioBlob, `gdx-xiaomi.${extension}`);
    formData.append("language", "en-IN");

    const response = await fetch(TRANSCRIBE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Xiaomi transcription failed (${response.status})${body ? `: ${body}` : ""}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json") ? await response.json() : { text: await response.text() };

    return String(result?.text ?? result?.transcript ?? result?.data?.text ?? result?.data?.transcript ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  /* =======================================================
     CONTINUOUS SPEECH RECOGNITION (VOICE AGENT)
     ======================================================= */

  const startListeningContinuous = useCallback(async () => {
    if (!isVoiceSessionRef.current || isSpeakingRef.current) return;

    const generation = ++recognitionGenerationRef.current;

    /* -------------------------------------------------------
       XIAOMI ONLY: MediaRecorder -> Supabase transcription
       ------------------------------------------------------- */
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
          if (generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current || isSpeakingRef.current)
            return;

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

          if (!blob || !blob.size || generation !== recognitionGenerationRef.current || !isVoiceSessionRef.current)
            return;

          try {
            const transcript = await requestXiaomiTranscription(blob);
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
  }, [getAudioContext, requestXiaomiTranscription]);

  startListeningContinuousRef.current = startListeningContinuous;

  /* =======================================================
     STOP VOICE SESSION (AGENT)
     ======================================================= */

  const stopVoiceSession = useCallback(
    (collapseVisuals = true) => {
      const shouldCollapseVoiceVisuals = collapseVisuals && searchVisuals.length > 0;

      isVoiceSessionRef.current = false;
      recognitionGenerationRef.current += 1;

      setIsVoiceSession(false);
      setIsListening(false);

      if (shouldCollapseVoiceVisuals) {
        setIsCollapsing(true);
        setShowExpandedSuggestions(false);

        if (voiceVisualsExitTimerRef.current) {
          clearTimeout(voiceVisualsExitTimerRef.current);
        }

        voiceVisualsExitTimerRef.current = window.setTimeout(() => {
          setSearchVisuals([]);
          setIsCollapsing(false);
          voiceVisualsExitTimerRef.current = null;
        }, 1400);
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
      hideVoiceLinkBubbles();
    },
    [searchVisuals.length, stopAudioOnly, hideVoiceLinkBubbles],
  );

  stopVoiceSessionRef.current = stopVoiceSession;

  /* =======================================================
     START VOICE SESSION (AGENT)
     ======================================================= */

  const startVoiceSession = useCallback(async () => {
    if (isLoading) return;

    if (isTranscribing) {
      stopTranscribeRef.current?.();
    }

    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);

    if (response || suggestions.length > 0) {
      setIsCollapsing(true);
      await new Promise((resolve) => setTimeout(resolve, 1400));
      setResponse(null);
      setSuggestions([]);
      setIsCollapsing(false);
    } else {
      setResponse(null);
      setSuggestions([]);
    }

    isVoiceSessionRef.current = true;
    setIsVoiceSession(true);

    primeMobileAudioSession();

    void startListeningContinuousRef.current?.();
  }, [isLoading, isTranscribing, response, suggestions.length, primeMobileAudioSession, dismissSuggestionBubble]);

  /* =======================================================
     TRANSCRIBE (SPEECH TO TEXT)
     ======================================================= */

  const finishAndroidTranscription = useCallback(() => {
    if (!isAndroidRef.current || !isTranscribingRef.current) return;

    transcribeManualStopRef.current = true;
    transcribeGenerationRef.current += 1;
    isTranscribingRef.current = false;

    if (transcribeRestartTimerRef.current) {
      clearTimeout(transcribeRestartTimerRef.current);
      transcribeRestartTimerRef.current = null;
    }

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

    setIsTranscribing(false);
    setIsListening(false);

    transcribeTranscriptRef.current = query.trim();

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [query]);

  const stopTranscribe = useCallback(() => {
    transcribeManualStopRef.current = true;
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

    const recorder = androidRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* noop */
      }
    }
    androidRecorderRef.current = null;
    androidRecordingPromiseRef.current = null;
    androidRecordedChunksRef.current = [];

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

  const startTranscribe = useCallback(async () => {
    if (isLoading) return;

    if (isVoiceSessionRef.current) {
      stopVoiceSession();
    }

    dismissSuggestionBubble();
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
    setQuery("");

    const generation = ++transcribeGenerationRef.current;
    transcribeManualStopRef.current = false;
    transcribeTranscriptRef.current = "";

    /* -------------------------------------------------------
       ANDROID: native browser SpeechRecognition
       ------------------------------------------------------- */
    if (isAndroidRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Speech recognition is not supported on this Android browser.");
        return;
      }

      primeMobileAudioSession();

      setIsTranscribing(true);
      isTranscribingRef.current = true;
      setIsListening(true);
      transcribeManualStopRef.current = false;
      transcribeTranscriptRef.current = "";
      setQuery("");

      const localGeneration = generation;

      const startAndroidRecognition = () => {
        if (
          localGeneration !== transcribeGenerationRef.current ||
          !isTranscribingRef.current ||
          transcribeManualStopRef.current
        ) {
          return;
        }

        if (recognitionRef.current) {
          try {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.stop();
          } catch {
            /* noop */
          }
          recognitionRef.current = null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognitionRef.current = recognition;

        let interimTranscript = "";

        recognition.onstart = () => {
          if (
            localGeneration !== transcribeGenerationRef.current ||
            !isTranscribingRef.current ||
            transcribeManualStopRef.current
          ) {
            try {
              recognition.stop();
            } catch {
              /* noop */
            }
            return;
          }

          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          if (
            localGeneration !== transcribeGenerationRef.current ||
            !isTranscribingRef.current ||
            transcribeManualStopRef.current
          ) {
            return;
          }

          interimTranscript = "";

          for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result?.[0]?.transcript || "";

            if (result?.isFinal) {
              transcribeTranscriptRef.current = `${transcribeTranscriptRef.current} ${transcript}`
                .replace(/\s+/g, " ")
                .trim();
            } else {
              interimTranscript += transcript;
            }
          }

          const visibleText = `${transcribeTranscriptRef.current} ${interimTranscript}`.replace(/\s+/g, " ").trim();

          if (visibleText) {
            setQuery(visibleText);
          }
        };

        recognition.onerror = (event: any) => {
          if (
            localGeneration !== transcribeGenerationRef.current ||
            !isTranscribingRef.current ||
            transcribeManualStopRef.current
          ) {
            return;
          }

          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.warn("Android speech recognition error:", event.error);
          }

          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            stopTranscribe();
            return;
          }

          if (transcribeRestartTimerRef.current) {
            clearTimeout(transcribeRestartTimerRef.current);
          }

          transcribeRestartTimerRef.current = setTimeout(() => {
            transcribeRestartTimerRef.current = null;
            startAndroidRecognition();
          }, 250);
        };

        recognition.onend = () => {
          if (
            localGeneration !== transcribeGenerationRef.current ||
            !isTranscribingRef.current ||
            transcribeManualStopRef.current
          ) {
            return;
          }

          if (transcribeRestartTimerRef.current) {
            clearTimeout(transcribeRestartTimerRef.current);
          }

          transcribeRestartTimerRef.current = setTimeout(() => {
            transcribeRestartTimerRef.current = null;
            startAndroidRecognition();
          }, 150);
        };

        try {
          recognition.start();
        } catch {
          // Chrome can report an already-started recognition object.
        }
      };

      startAndroidRecognition();
      return;
    }

    /* -------------------------------------------------------
       EXISTING iOS / DESKTOP PATH — kept as before
       ------------------------------------------------------- */

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    primeMobileAudioSession();

    try {
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
        }
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
        if (isTranscribingRef.current && !transcribeManualStopRef.current) {
          try {
            recognition.start();
          } catch {
            /* Browser may already be restarting */
          }
        }
      };

      recognition.start();
    } catch (error) {
      console.warn("Transcribe setup warning:", error);
      stopTranscribe();
    }
  }, [
    getAudioContext,
    isLoading,
    stopVoiceSession,
    stopTranscribe,
    dismissSuggestionBubble,
    primeMobileAudioSession,
    requestXiaomiTranscription,
  ]);

  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      recognitionGenerationRef.current += 1;

      if (voiceLinksExitTimerRef.current) clearTimeout(voiceLinksExitTimerRef.current);
      voiceLinksExitTimerRef.current = null;

      if (voiceVisualsExitTimerRef.current) clearTimeout(voiceVisualsExitTimerRef.current);
      voiceVisualsExitTimerRef.current = null;

      voiceLinksRef.current = [];

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (transcribeRestartTimerRef.current) clearTimeout(transcribeRestartTimerRef.current);

      transcribeManualStopRef.current = true;
      transcribeGenerationRef.current += 1;

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
    setSearchVisuals([]);

    if (!customQuery) setQuery("");

    if (!fromVoice) {
      stopVoiceSession(false);
      hideVoiceLinkBubbles();

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
      setSearchVisuals([]);
      setIsStreamingResponse(false);

      if (fromVoice) {
        const result = await sendChatMessage(text);
        const answer = String((result as any)?.response ?? "");
        const voiceAnswer = String((result as any)?.voice_response ?? answer);
        const returnedVisuals = extractVisualItems((result as any)?.visuals);
        const suggs = (result as any)?.suggestions || [];

        if (returnedVisuals.length > 0) {
          await waitForVisualReady(returnedVisuals);

          if (voiceVisualsExitTimerRef.current) {
            clearTimeout(voiceVisualsExitTimerRef.current);
            voiceVisualsExitTimerRef.current = null;
          }

          setIsCollapsing(false);
          setSearchVisuals(returnedVisuals);

          // Let the SearchBar commit the expanded visual state first so
          // TTS always starts after the normal horizontal-then-vertical open.
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        if (isVoiceSessionRef.current) {
          void speakVoiceResponse(voiceAnswer, answer);
        }

        return;
      }

      /*
       * Wait for the complete response before expanding the SearchBar.
       * For visual requests, the first image is also loaded before the
       * response is released to the UI.
       */
      setIsPreparingToStream(true);

      const result = await sendChatMessage(text);
      const answer = String((result as any)?.response ?? "");
      const suggs = (result as any)?.suggestions || [];
      const returnedVisuals = extractVisualItems((result as any)?.visuals);

      if (returnedVisuals.length > 0) {
        await waitForVisualReady(returnedVisuals);
        setSearchVisuals(returnedVisuals);
      }

      setResponse(answer || null);
      setSuggestions(suggs);
      setIsRestoredFromStorage(false);
      onSearch?.(answer);
    } catch (error) {
      setIsPreparingToStream(false);
      setIsStreamingResponse(false);
      setSearchVisuals([]);

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
      setIsPreparingToStream(false);
      setIsStreamingResponse(false);
      setStreamPulse(false);

      if (streamPulseFrameRef.current !== null) {
        cancelAnimationFrame(streamPulseFrameRef.current);
        streamPulseFrameRef.current = null;
      }

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

      if (response || suggestions.length > 0 || searchVisuals.length > 0) {
        const COLLAPSE_MS = 1400;
        setIsCollapsing(true);
        setShowExpandedSuggestions(false);

        // Keep the existing close animation intact, but clear visual results
        // at the same end point so the image frame cannot re-expand afterward.
        window.setTimeout(() => {
          setResponse(null);
          setSuggestions([]);
          setSearchVisuals([]);
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
  }, [response, suggestions, searchVisuals.length, query, stopVoiceSession, stopTranscribe, clearPersistedState]);

  /* =======================================================
     LAYOUT
     ======================================================= */

  const layoutValues = useMemo(() => {
    const hasContent =
      ((suggestions.length > 0 || response) && !isVoiceSession && !isTranscribing) ||
      (searchVisuals.length > 0 && !isTranscribing);

    const isExpanded = hasContent && !isPreparingToStream;

    const targetWidth = isExpanded ? "460px" : isVoiceSession || isTranscribing ? "320px" : "360px";

    const targetRadius = isExpanded ? "16px" : "999px";

    return {
      isExpanded,
      targetWidth,
      targetRadius,
    };
  }, [
    suggestions.length,
    response,
    searchVisuals.length,
    isVoiceSession,
    isTranscribing,
    isLoading,
    isStreamingResponse,
    isPreparingToStream,
  ]);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      ref={searchBarRef}
      data-gdx-search
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-3 sm:px-4 z-50 w-full flex flex-col items-center gap-3"
    >
      {showTypewriter && fullText && suggestionPhase !== "hidden" && !isVoiceSession && !isTranscribing && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="gdx-suggestion-bubble cursor-pointer bg-white/20 backdrop-blur-sm text-sm font-normal text-white px-4 py-2 rounded-full border border-white/20 shadow-md whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis transition-all"
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

      {voiceLinks.length > 0 && voiceLinksVisible && isVoiceSession && !isTranscribing && (
        <div
          className="flex flex-wrap justify-center gap-2 max-w-[92vw]"
          style={{
            animation: voiceLinksExiting
              ? "suggestionBlurOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards"
              : "suggestionEmerge 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {voiceLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.assign(link.url);
              }}
              className="gdx-voice-link-bubble cursor-pointer bg-white/20 backdrop-blur-sm text-sm font-normal text-white px-4 py-2 rounded-full shadow-md whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis hover:bg-white/30 active:scale-95 transition-all"
              aria-label={`Open ${link.label}`}
            >
              ↗ {link.label}
            </a>
          ))}
        </div>
      )}

      <div
        className={`gdx-search-container mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 overflow-hidden select-none ${
          isLoading ? "thinking-container" : ""
        } ${isVoiceSession || isTranscribing || isListening ? "listening-container" : ""}`}
        style={
          {
            width: layoutValues.targetWidth,
            borderRadius: layoutValues.targetRadius,
            transition:
              "width 0.8s cubic-bezier(0.25, 1, 0.3, 1), border-radius 0.8s cubic-bezier(0.25, 1, 0.3, 1), background-color 0.6s ease, box-shadow 0.6s ease",
            cursor: isListening ? "default" : undefined,
            WebkitTouchCallout: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
          } as React.CSSProperties
        }
      >
        <div
          className={`transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${layoutValues.isExpanded ? "p-3.5 pt-4 sm:p-5 sm:pt-6" : "p-1.5 sm:p-2"}`}
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
              className="flex gap-1.5 sm:gap-2 flex-wrap justify-center mb-2.5 sm:mb-3 animate-fadeIn"
              style={{ animation: "fadeIn 0.8s ease forwards" }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2.5 sm:px-3 py-1 bg-white/20 text-[11px] sm:text-sm font-normal rounded-full hover:bg-white/30 transition cursor-pointer"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Fade>

          <div
            className={`overflow-hidden transition-all ease-[cubic-bezier(0.25,1,0.3,1)] ${
              (response && !isVoiceSession && !isTranscribing) || (searchVisuals.length > 0 && !isTranscribing)
                ? isCollapsing || isCollapsingToThink
                  ? "opacity-0 mb-0"
                  : "opacity-100 mb-5"
                : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight:
                isCollapsing || isCollapsingToThink
                  ? "0px"
                  : (response && !isVoiceSession && !isTranscribing) || (searchVisuals.length > 0 && !isTranscribing)
                    ? "600px"
                    : "0px",
              transitionDuration: isCollapsingToThink ? "400ms" : "1000ms",
              transitionDelay:
                response && !isCollapsing && !isCollapsingToThink && !isRestoredFromStorage
                  ? "900ms"
                  : searchVisuals.length > 0 && isVoiceSession && !isCollapsing
                    ? "900ms"
                    : "0ms",
            }}
          >
            {searchVisuals.length > 0 && !isTranscribing && (
              <SearchVisualCarousel items={searchVisuals} visible={searchVisuals.length > 0 && !isTranscribing} />
            )}

            {response && !isVoiceSession && !isTranscribing && (
              <>
                <div
                  className="text-foreground text-[13px] sm:text-sm leading-relaxed font-normal px-3 sm:px-4 overflow-y-auto scrollbar-hide"
                  style={{
                    animation: isRestoredFromStorage ? "none" : "fadeSlideIn 800ms cubic-bezier(0.25,1,0.3,1) both",
                    animationDelay: "0ms",
                    maxHeight: "300px",
                    fontWeight: 400,
                  }}
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
                />
              </>
            )}
          </div>

          <form
            onSubmit={(event) => handleSubmit(event, undefined, false)}
            className="flex items-center gap-1.5 sm:gap-2 relative min-h-[36px] sm:min-h-[40px]"
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
                  className={`flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-sm sm:text-base font-normal px-2.5 sm:px-4 h-9 sm:h-10 ${
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
              <div className="flex-1 flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isVoiceSession} isSpeaking={isSpeaking || isListening} />
              </div>
            )}

            {/* Transcribe mode: Waveform WITH timer */}
            {isTranscribing && (
              <div className="flex-1 flex items-center gap-1.5 sm:gap-3 pl-1.5 sm:pl-3 min-w-0">
                <BarWaveform analyser={analyserNode} isActive={isTranscribing} isSpeaking={isListening} />
                <RecordingTimer isActive={isTranscribing} />
              </div>
            )}

            {/* Action buttons */}
            {isVoiceSession ? (
              <button
                type="button"
                onClick={() => stopVoiceSession()}
                className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="End voice session"
                aria-label="End voice session"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" strokeWidth={2} />
              </button>
            ) : isTranscribing ? (
              <button
                type="button"
                onClick={isAndroidRef.current ? finishAndroidTranscription : stopTranscribe}
                className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 cursor-pointer"
                title="Done transcribing"
                aria-label="Done transcribing"
              >
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" strokeWidth={2.5} />
              </button>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pr-0.5 sm:pr-1">
                {/* Transcribe mic button */}
                <button
                  type="button"
                  onClick={startTranscribe}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  title="Transcribe speech"
                  aria-label="Transcribe speech"
                >
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                </button>

                {/* Talk with agent button (ChatGPT style) */}
                <button
                  type="button"
                  onClick={() => {
                    if (query.trim()) {
                      void handleSubmit(undefined, undefined, false);
                    } else {
                      startVoiceSession();
                    }
                  }}
                  className={`gdx-tts-button h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full border border-transparent transition-all duration-500 ease-[cubic-bezier(0.25,1,0.3,1)] active:scale-95 shadow-sm cursor-pointer ${
                    query.trim() ? "bg-[#0084FF] hover:bg-[#0074E8]" : "bg-[#0084FF] hover:bg-[#0074E8]"
                  }`}
                  title={query.trim() ? "Search" : "Talk with GDx"}
                  aria-label={query.trim() ? "Search" : "Talk with GDx"}
                >
                  <span
                    className={`absolute flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.3,1)] ${
                      query.trim() ? "opacity-0 scale-75 -translate-x-1.5" : "opacity-100 scale-100 translate-x-0"
                    }`}
                  >
                    <ChatGPTWaveformIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </span>
                  <span
                    className={`absolute flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.3,1)] ${
                      query.trim() ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-75 translate-x-1.5"
                    }`}
                  >
                    <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white" strokeWidth={2.25} />
                  </span>
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

        @keyframes streamTextPulse {
          from {
            opacity: 0.86;
            filter: blur(1.2px);
          }
          to {
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes searchVisualsReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes searchVisualImage {
          from {
            opacity: 0.7;
          }
          to {
            opacity: 1;
          }
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

        /* Monochrome mode: keep the existing thinking UI visible on the white surface. */
        :root[data-theme="minimal"] [data-gdx-search] .thinking-container {
          border-color: rgba(0,0,0,0.18);
          background: rgba(0,0,0,0.04);
          animation: glowPulseMinimal 2s infinite ease-in-out;
        }

        @keyframes glowPulseMinimal {
          0%, 100% {
            box-shadow:
              0 0 5px rgba(0,0,0,0.06),
              inset 0 0 10px rgba(0,0,0,0.03);
          }
          50% {
            box-shadow:
              0 0 20px rgba(0,0,0,0.18),
              inset 0 0 20px rgba(0,0,0,0.08);
          }
        }

        /* Monochrome mode: make voice response link bubbles visible with a black border. */
        :root[data-theme="minimal"] [data-gdx-search] .gdx-voice-link-bubble {
          border: 1px solid #000 !important;
        }

        /* Monochrome mode: make the voice-session exit X a visible black circle. */
        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="End voice session"] {
          background-color: #000 !important;
          border: 1px solid #000 !important;
          color: #fff !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="End voice session"]:hover {
          background-color: #111 !important;
          border-color: #111 !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="End voice session"] svg {
          color: #fff !important;
        }

        /* Monochrome mode: keep the transcribe Done/check button visible in every interaction state. */
        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="Done transcribing"] {
          background-color: #000 !important;
          border: 1px solid #000 !important;
          color: #fff !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="Done transcribing"]:hover,
        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="Done transcribing"]:active {
          background-color: #111 !important;
          border-color: #111 !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] button[aria-label="Done transcribing"] svg {
          color: #fff !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] .thinking-placeholder::placeholder {
          color: rgba(0,0,0,0.48) !important;
          animation: textGlowMinimal 2s infinite ease-in-out;
        }

        @keyframes textGlowMinimal {
          0%, 100% {
            color: rgba(0,0,0,0.32);
            text-shadow: 0 0 1px rgba(0,0,0,0.08);
          }
          50% {
            color: rgba(0,0,0,0.72);
            text-shadow: 0 0 3px rgba(0,0,0,0.18);
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

        .gdx-tts-button {
          position: relative;
          overflow: hidden;
        }

        :root[data-theme="minimal"] [data-gdx-search] .gdx-tts-button {
          background-color: #000 !important;
          border-color: #000 !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] .gdx-tts-button:hover {
          background-color: #111 !important;
          border-color: #111 !important;
        }

        :root[data-theme="minimal"] [data-gdx-search] .gdx-tts-button svg {
          color: #fff !important;
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
