"use client";

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ---------- 1️⃣ MARKDOWN → HTML (unchanged) ---------- */
const convertMarkdownToHtml = (text: string): string => {
  let result = text;
  
  // Process inline formatting
  const processInline = (str: string): string => {
    const rules = [
      { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
      { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
      { pattern: /`([^`]+)`/g, replacement: '<code class="inline-code">$1</code>' },
      { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>' }
    ];
    
    rules.forEach(rule => {
      str = str.replace(rule.pattern, rule.replacement);
    });
    
    return str;
  };

  // Convert line breaks and process markdown
  result = result
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '<br>';
      
      // Headers
      if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold mt-4 mb-2">${processInline(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2 class="text-xl font-bold mt-4 mb-2">${processInline(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold mt-4 mb-2">${processInline(line.slice(2))}</h1>`;
      
      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li class="ml-4 list-disc">${processInline(line.slice(2))}</li>`;
      }
      
      // Regular paragraphs
      return `<p class="mb-2">${processInline(line)}</p>`;
    })
    .join('');

  return result;
};

/* ---------- 2️⃣ Fade helper (see above) ---------- */
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
    if (show) setVisible(true);
    else {
      const t = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(t);
    }
  }, [show, duration]);

  if (!visible && !show) return null;
  return (
    <div
      className={`transition-opacity duration-${duration} ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

/* ---------- 3️⃣ SearchBar component ---------- */
interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  /* ----- UI state ----- */
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showIntroBubble, setShowIntroBubble] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [showExpandedSuggestions, setShowExpandedSuggestions] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);

  /* ----- 4️⃣ Activity tracking ----- */
  useEffect(() => {
    const handleActivity = () => setLastActivityTime(Date.now());
    ["mousemove", "keypress", "click", "scroll"].forEach((e) =>
      window.addEventListener(e, handleActivity)
    );
    return () => {
      ["mousemove", "keypress", "click", "scroll"].forEach((e) =>
        window.removeEventListener(e, handleActivity)
      );
    };
  }, []);

  /* ----- 5️⃣ Intro bubble (first 3 visits) ----- */
  useEffect(() => {
    const visitCount =
      parseInt(localStorage.getItem("introBubbleVisits") || "0", 10);
    if (visitCount < 3) {
      const timer = setTimeout(() => setShowIntroBubble(true), 3000);
      localStorage.setItem("introBubbleVisits", String(visitCount + 1));
      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  /* Delay expanded suggestions until 10s inactivity */
  useEffect(() => {
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      if ((response || suggestions.length > 0) && !isLoading && idle > 10000) {
        setShowExpandedSuggestions(true);
      } else {
        setShowExpandedSuggestions(false);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lastActivityTime, response, suggestions, isLoading]);

  /* ----- Click outside handler ----- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        // Collapse the search bar by clearing response and suggestions
        setResponse(null);
        setSuggestions([]);
        setShowExpandedSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /* ----- 6️⃣ Submit handler ----- */
  const handleSubmit = async (e?: FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);
    setHasInteracted(true);
    if (!customQuery) setQuery("");

    try {
      const result = await sendChatMessage(text);
      const answer = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];
      setResponse(String(answer));
      setSuggestions(Array.isArray(suggs) ? suggs : []);
      onSearch?.(String(answer));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setResponse(msg);
      setSuggestions([]);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ----- 7️⃣ Interaction helpers ----- */
  const handleSuggestionClick = (s: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowExpandedSuggestions(false);
    handleSubmit(undefined, s);
    setShowIntroBubble(false);
  };

  const handleInputFocus = () => {
    setShowIntroBubble(false);
    setShowExpandedSuggestions(false);
    setHasInteracted(true);
  };

  /* ----- 8️⃣ Layout calculations ----- */
  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const isExpanded = suggestions.length > 0 || response;
  const targetWidth = isExpanded ? "700px" : `${dynamicWidth}px`;
  const targetRadius = isExpanded ? "16px" : "999px";

  /* ----- 🔒 Render ----- */
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3">
      {/* ── Intro bubble (with fade) ── */}
      <Fade show={showIntroBubble} duration={400}>
        <div
          onClick={() =>
            handleSuggestionClick(
              "✨ What are these sections on the website?"
            )
          }
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md opacity-0 animate-delayedFadeIn"
        >
          ✨ What are these sections on the website?
        </div>
      </Fade>

      {/* ── Search bar container ── */}
      <div
        ref={searchBarRef}
        className={`mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30 ${
          isLoading ? "thinking-container" : ""
        }`}
        style={{
          width: targetWidth,
          maxWidth: "90vw",
          borderRadius: targetRadius,
          transition: "all 0.8s cubic-bezier(0.25, 1, 0.3, 1)",
        }}
      >
        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.25,1,0.3,1)] ${
            isExpanded ? "p-5 pt-6" : "p-2"
          }`}
        >
          {/* ── Suggestion list (with fade) ── */}
          <Fade show={showExpandedSuggestions && suggestions.length > 0} duration={400}>
            <div
              className="flex gap-2 flex-wrap justify-center mb-3 animate-fadeIn"
              style={{ animation: "fadeIn 0.4s ease forwards" }}
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
            className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.3,1)] ${
              response ? "opacity-100 mb-5" : "opacity-0 mb-0"
            }`}
            style={{
              maxHeight: response ? "384px" : "0px",
              transitionDelay: response ? "300ms" : "0ms",
            }}
          >
            {response && (
              <div
                className="text-foreground text-sm leading-relaxed px-4 overflow-y-auto scrollbar-hide"
                style={{
                  animation: "fadeSlideIn 400ms cubic-bezier(0.25,1,0.3,1) both",
                  maxHeight: "300px",
                }}
                dangerouslySetInnerHTML={{
                  __html: convertMarkdownToHtml(response),
                }}
              />
            )}
          </div>

          {/* ── Input form ── */}
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="flex items-center gap-3"
            onFocus={handleInputFocus}
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={isLoading ? "Thinking…" : "Ask anything…"}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHasInteracted(true);
                  setShowExpandedSuggestions(false);
                }}
                className={`flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                           text-foreground placeholder:text-muted-foreground text-base px-4 h-10 ${
                             isLoading ? "thinking-placeholder" : ""
                           }`}
                disabled={isLoading}
                aria-label="Ask anything"
              />
            </div>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/20 rounded-full transition-all duration-300 
                         ease-[cubic-bezier(0.25,1,0.3,1)] hover:scale-110 active:scale-95 shrink-0"
              disabled={isLoading || !query.trim()}
              aria-label="Send"
            >
              <Search className={`h-4 w-4 ${isLoading ? "thinking-icon" : ""}`} />
            </Button>
          </form>
        </div>
      </div>

      {/* ── Shared CSS ── */}
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        @keyframes delayedFadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        .animate-fadeIn { animation: fadeIn 0.5s ease forwards; }
        .animate-delayedFadeIn { animation: delayedFadeIn 0.8s ease forwards; animation-delay: 0.1s; }

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
          animation: iconGlow 2s infinite ease-in-out;
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
      `}</style>
    </div>
  );
};

export default SearchBar;