import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SiteAction, streamChatMessage } from "@/lib/api";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
const TTS_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-tts`;
const TRANSCRIBE_ENDPOINT = `${SUPABASE_URL}/functions/v1/gdx-transcribe`;

type OrbState = "idle" | "listening" | "thinking" | "speaking";

const cleanForSpeech = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\`([^\`]+)\`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s<>()]+/gi, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const findSentence = (buffer: string) => {
  const match = buffer.match(/^(.*?[.!?])(?:\s+|$)/s);
  if (!match) return null;
  const sentence = match[1].trim();
  return sentence.length >= 8 ? { sentence, rest: buffer.slice(match[0].length).trimStart() } : null;
};

const inferLocalAction = (message: string): SiteAction | null => {
  const q = message.toLowerCase();
  const routeFor = (path: SiteAction["path"], section?: string, label?: string): SiteAction => ({ type: "navigate", path, section, label });

  if (/\b(experience|work experience|career|career history|roles?|employment|companies)\b/.test(q)) {
    return routeFor("/hobbies", "experience", "Experience");
  }
  if (/\b(education|degree|college|university|academic|academics)\b/.test(q)) {
    return routeFor("/hobbies", "education", "Education");
  }
  if (/\b(skills?|technolog(?:y|ies)|stack|tools?|platforms?)\b/.test(q)) {
    return routeFor("/hobbies", "skills", "Skills");
  }
  if (/\b(recommendations?|testimonials?)\b/.test(q)) {
    return routeFor("/hobbies", "recommendations", "Recommendations");
  }
  if (/\b(github|open source|contributions?)\b/.test(q)) {
    return routeFor("/hobbies", "github", "GitHub Activity");
  }
  if (/\b(training|workouts?|gym|running|cycling|fitness|exercise|outside work)\b/.test(q)) {
    return routeFor("/hobbies", "outside-work", "Outside Work");
  }
  if (/\b(hobbies?|interests?|free time)\b/.test(q)) {
    return routeFor("/hobbies", undefined, "Classic");
  }
  if (/\b(writing|articles?|posts?|notions?|blog)\b/.test(q)) {
    return routeFor("/blog", undefined, "Notions");
  }
  if (/\b(photos?|photography|visuals?|travel|pictures?)\b/.test(q)) {
    return routeFor("/visuals", undefined, "Visuals");
  }
  if (/\b(home|homepage|main page|gdx)\b/.test(q)) {
    return routeFor("/", undefined, "GDx");
  }
  if (/\b(more|other experiments?)\b/.test(q)) {
    return routeFor("/others", undefined, "More");
  }

  return null;
};

const Orb = ({ state, onClick }: { state: OrbState; onClick: () => void }) => {
  const isActive = state !== "idle";

  return (
    <button
      type="button"
      data-gdx-orb
      onClick={onClick}
      aria-label={state === "listening" ? "Listening to you" : state === "speaking" ? "GDx is speaking" : "Talk with GDx"}
      className={`relative shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-white/30 bg-white/[0.10] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.22)] transition-transform duration-300 active:scale-95 ${isActive ? "gdx-orb-active" : "hover:scale-105"}`}
    >
      <span className="absolute inset-1 rounded-full bg-white/[0.08]" />
      <span className="absolute inset-[7px] rounded-full border border-white/10" />
      <span className="gdx-orb-core absolute inset-[12px] rounded-full" />
      <span className="gdx-orb-wave gdx-orb-wave-1 absolute inset-[6px] rounded-full" />
      <span className="gdx-orb-wave gdx-orb-wave-2 absolute inset-[3px] rounded-full" />
      <span className="gdx-orb-wave gdx-orb-wave-3 absolute inset-0 rounded-full" />
      {state === "thinking" && (
        <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white/90" strokeWidth={1.6} />
      )}
    </button>
  );
};

const GDxAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [pendingAction, setPendingAction] = useState<SiteAction | null>(null);
  const [error, setError] = useState("");
  const [ttsUnavailable, setTtsUnavailable] = useState(false);

  const recognitionRef = useRef<any>(null);
  const voiceSessionRef = useRef(false);
  const transcriptRef = useRef("");
  const ttsTokenRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackTimeRef = useRef(0);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceBufferRef = useRef("");
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRouteRef = useRef<SiteAction | null>(null);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error("Web Audio is not supported");
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
    }
    if (audioContextRef.current.state === "suspended") void audioContextRef.current.resume();
    return audioContextRef.current;
  }, []);

  const stopPlayback = useCallback(() => {
    ttsTokenRef.current += 1;
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      currentSourceRef.current = null;
    }
    setOrbState((s) => (s === "speaking" ? "idle" : s));
  }, []);

  const enqueueTts = useCallback(
    (text: string) => {
      const clean = cleanForSpeech(text);
      if (!clean) return;

      const token = ttsTokenRef.current;
      ttsQueueRef.current = ttsQueueRef.current.then(async () => {
        if (!voiceSessionRef.current || token !== ttsTokenRef.current) return;

        try {
          const response = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ text: clean }),
          });

          if (!response.ok) throw new Error("TTS request failed");

          const bytes = await response.arrayBuffer();
          if (!bytes.byteLength || token !== ttsTokenRef.current || !voiceSessionRef.current) return;

          const ctx = getAudioContext();
          const buffer = await ctx.decodeAudioData(bytes.slice(0));

          await new Promise<void>((resolve) => {
            if (!voiceSessionRef.current || token !== ttsTokenRef.current) {
              resolve();
              return;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            currentSourceRef.current = source;
            const startAt = Math.max(ctx.currentTime + 0.02, playbackTimeRef.current);
            playbackTimeRef.current = startAt + buffer.duration;

            setOrbState("speaking");
            source.onended = () => {
              if (currentSourceRef.current === source) currentSourceRef.current = null;
              resolve();
            };

            try {
              source.start(startAt);
            } catch {
              resolve();
            }
          });
        } catch {
          setTtsUnavailable(true);
        }
      });
    },
    [getAudioContext],
  );

  const applyAction = useCallback(
    (action: SiteAction | null) => {
      if (!action || action.type !== "navigate") return;
      pendingRouteRef.current = action;

      if (location.pathname === action.path) {
        if (action.section) {
          window.setTimeout(() => document.getElementById(action.section!)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        }
      } else {
        navigate(action.path);
      }
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    const action = pendingRouteRef.current;
    if (!action) return;
    if (location.pathname !== action.path) return;

    pendingRouteRef.current = null;
    if (action.section) {
      window.setTimeout(() => document.getElementById(action.section!)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" }), 120);
    }
  }, [location.pathname, reducedMotion]);

  const stopListening = useCallback(() => {
    voiceSessionRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    transcriptRef.current = "";
    setOrbState("idle");
  }, []);

  const submit = useCallback(
    async (text: string, speakResponse: boolean) => {
      const clean = text.trim();
      if (!clean || isStreaming) return;

      setError("");
      setResponse("");
      setIsStreaming(true);
      setOrbState(speakResponse ? "thinking" : "thinking");

      voiceBufferRef.current = "";
      ttsQueueRef.current = Promise.resolve();

      const localAction = inferLocalAction(clean);
      if (localAction) applyAction(localAction);

      let voiceSentenceBuffer = "";

      try {
        const result = await streamChatMessage(clean, {
          onStart: () => {
            setIsStreaming(true);
          },
          onAction: (action) => {
            setPendingAction(action);
            applyAction(action);
          },
          onToken: (delta, accumulated) => {
            setResponse(accumulated);
            if (speakResponse) {
              voiceSentenceBuffer += delta;
              while (true) {
                const found = findSentence(voiceSentenceBuffer);
                if (!found) break;
                voiceSentenceBuffer = found.rest;
                enqueueTts(found.sentence);
              }
            }
          },
        });

        if (speakResponse && voiceSentenceBuffer.trim()) {
          enqueueTts(voiceSentenceBuffer);
        }

        setResponse(result.response || "");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "GDx could not complete that request.";
        setError(message);
      } finally {
        setIsStreaming(false);
        if (speakResponse && voiceSessionRef.current) {
          const check = window.setInterval(() => {
            if (!voiceSessionRef.current) {
              window.clearInterval(check);
              return;
            }
            if (ttsQueueRef.current && !isStreaming) {
              window.clearInterval(check);
              setOrbState("listening");
              startListening();
            }
          }, 120);
        } else {
          setOrbState("idle");
        }
      }
    },
    [applyAction, enqueueTts, isStreaming],
  );

  const startListening = useCallback(() => {
    if (voiceSessionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      setOrbState("idle");
      return;
    }

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      /* noop */
    }

    voiceSessionRef.current = true;
    transcriptRef.current = "";
    setError("");
    setOrbState("listening");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setOrbState("listening");
    recognition.onresult = (event: any) => {
      let value = "";
      for (let i = event.resultIndex ?? 0; i < event.results.length; i += 1) {
        value += event.results[i]?.[0]?.transcript ?? "";
      }
      transcriptRef.current = value.trim();
      setQuery(transcriptRef.current);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Voice input error: ${event.error || "unknown error"}`);
      }
      if (voiceSessionRef.current) setOrbState("listening");
    };
    recognition.onend = () => {
      if (!voiceSessionRef.current) return;
      const spoken = transcriptRef.current.trim();
      transcriptRef.current = "";
      if (spoken) {
        setQuery("");
        void submit(spoken, true);
      } else {
        setOrbState("idle");
        voiceSessionRef.current = false;
      }
    };

    try {
      recognition.start();
    } catch {
      voiceSessionRef.current = false;
      setOrbState("idle");
    }
  }, [getAudioContext, submit]);

  const toggleVoice = useCallback(() => {
    if (voiceSessionRef.current) {
      stopListening();
      stopPlayback();
      return;
    }

    stopPlayback();
    try {
      const ctx = getAudioContext();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      /* noop */
    }
    startListening();
  }, [getAudioContext, startListening, stopListening, stopPlayback]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim() || isStreaming) return;
    const text = query.trim();
    setQuery("");
    void submit(text, false);
  };

  useEffect(() => () => {
    stopListening();
    stopPlayback();
    try {
      audioContextRef.current?.close();
    } catch {
      /* noop */
    }
  }, [stopListening, stopPlayback]);

  return (
    <>
      {(response || isStreaming || error) && (
        <div
          data-gdx-response
          className="fixed left-1/2 top-1/2 z-[48] -translate-x-1/2 -translate-y-1/2 w-[min(720px,calc(100vw-28px))] max-h-[min(62dvh,560px)] overflow-y-auto rounded-[28px] border border-white/20 bg-white/[0.09] px-5 py-5 sm:px-7 sm:py-6 backdrop-blur-2xl shadow-[0_24px_90px_rgba(0,0,0,0.30)] text-white/90"
        >
          <div className="whitespace-pre-wrap text-[15px] sm:text-base leading-7 font-normal">
            {error ? error : response}
            {isStreaming && <span className="inline-block ml-1 align-baseline h-4 w-1 rounded-full bg-current animate-pulse" />}
          </div>
          {pendingAction?.label && (
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">
              Guiding you to {pendingAction.label}
            </div>
          )}
          {ttsUnavailable && !reducedMotion && (
            <div className="mt-3 text-xs text-white/40">Deepgram audio was unavailable for this response.</div>
          )}
        </div>
      )}

      <div
        data-gdx-controls
        className="fixed z-[50] left-1/2 -translate-x-1/2 bottom-[max(16px,env(safe-area-inset-bottom))] w-[min(720px,calc(100vw-24px))] flex items-center gap-3 pointer-events-none"
      >
        <div className="pointer-events-auto">
          <Orb state={orbState} onClick={toggleVoice} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto min-w-0 flex-1 rounded-full border border-white/20 bg-white/[0.09] backdrop-blur-2xl px-2 py-2 shadow-[0_10px_45px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Ask GDx anything"
              placeholder={orbState === "listening" ? "Listening…" : "Ask GDx anything…"}
              disabled={isStreaming || orbState === "listening"}
              className="min-w-0 flex-1 h-10 bg-transparent border-0 outline-none px-3 text-sm sm:text-base text-current placeholder:opacity-45"
            />
            <button
              type="submit"
              aria-label="Send to GDx"
              disabled={!query.trim() || isStreaming || orbState === "listening"}
              className="shrink-0 h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white/85 disabled:opacity-25 transition-all active:scale-95"
            >
              <ArrowUp className="mx-auto h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </form>
      </div>

      <style>{`
        [data-gdx-response] { scrollbar-width: thin; }
        [data-gdx-orb] { isolation: isolate; }
        .gdx-orb-core {
          background:
            radial-gradient(circle at 34% 30%, rgba(255,255,255,.9), rgba(255,255,255,.16) 28%, rgba(255,255,255,.05) 58%, transparent 74%);
          filter: blur(.2px);
        }
        .gdx-orb-wave {
          border: 1px solid rgba(255,255,255,.25);
          opacity: .28;
          transform: scale(.72);
        }
        .gdx-orb-wave-1 { animation: gdxOrbWave 2.8s ease-in-out infinite; }
        .gdx-orb-wave-2 { animation: gdxOrbWave 2.8s ease-in-out infinite .55s; }
        .gdx-orb-wave-3 { animation: gdxOrbWave 2.8s ease-in-out infinite 1.1s; }
        .gdx-orb-active .gdx-orb-wave { opacity: .75; }
        .gdx-orb-active .gdx-orb-core {
          animation: gdxOrbBreathe 1.3s ease-in-out infinite;
        }
        @keyframes gdxOrbWave {
          0%,100% { transform: scale(.72); opacity: .12; }
          50% { transform: scale(1); opacity: .42; }
        }
        @keyframes gdxOrbBreathe {
          0%,100% { transform: scale(.82); filter: blur(.2px); }
          50% { transform: scale(1); filter: blur(1px); }
        }
        :root[data-theme="minimal"] [data-gdx-orb] {
          background: rgba(0,0,0,.04);
          border-color: rgba(0,0,0,.28);
          box-shadow: none;
        }
        :root[data-theme="minimal"] [data-gdx-orb] .gdx-orb-core {
          background:
            radial-gradient(circle at 34% 30%, rgba(0,0,0,.9), rgba(0,0,0,.18) 28%, rgba(0,0,0,.05) 58%, transparent 74%);
        }
        :root[data-theme="minimal"] [data-gdx-orb] .gdx-orb-wave {
          border-color: rgba(0,0,0,.24);
        }
        :root[data-theme="minimal"] [data-gdx-response],
        :root[data-theme="minimal"] [data-gdx-controls] form {
          background: rgba(255,255,255,.82);
          border-color: rgba(0,0,0,.14);
          color: rgba(0,0,0,.92);
          box-shadow: 0 18px 60px rgba(0,0,0,.08);
        }
        :root[data-theme="minimal"] [data-gdx-response] .text-white,
        :root[data-theme="minimal"] [data-gdx-controls] input {
          color: rgba(0,0,0,.92) !important;
        }
        :root[data-theme="minimal"] [data-gdx-controls] button {
          background: rgba(0,0,0,.06);
          color: rgba(0,0,0,.92);
          border-color: rgba(0,0,0,.12);
        }
        @media (max-width: 640px) {
          [data-gdx-response] { border-radius: 22px; }
          [data-gdx-controls] { gap: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gdx-orb-wave, .gdx-orb-core { animation: none !important; }
        }
      `}</style>
    </>
  );
};

export default GDxAssistant;
