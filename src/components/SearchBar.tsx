"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

/* ------------------------------------------------------------------
   1️⃣  MARKDOWN → HTML (with protection for existing <a> tags)
   ------------------------------------------------------------------ */
const convertMarkdownToHtml = (text: string): string => {
  if (!text) return "";
  // Normalise line‑breaks
  let processed = text.replace(/\r\n/g, "\n");

  /* --------------------------------------------------------------
     PLACEHOLDER MAPS
     -------------------------------------------------------------- */
  const codeMap: Record<string, string> = {};
  let codeCounter = 0;

  const urlMap: Record<string, string> = {};
  let urlCounter = 0;

  // we keep a map for **any HTML that already exists** (especially <a> tags)
  const htmlMap: Record<string, string> = {};
  let htmlCounter = 0;

  /* --------------------------------------------------------------
     ①  MARKDOWN LINKS → direct <a>
     -------------------------------------------------------------- */
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, display, rawUrl) => {
    const href = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors">${display}</a>`;
  });

  /* --------------------------------------------------------------
     ②  INLINE CODE SPANS → placeholder (to keep them safe)
     -------------------------------------------------------------- */
  processed = processed.replace(/`([^`\n]+?)`/g, (_, code) => {
    const ph = `__CODE_SPAN_${codeCounter++}__`;
    codeMap[ph] = `<code class="inline-code">${code}</code>`;
    return ph;
  });

  /* --------------------------------------------------------------
     ③  INLINE PROCESSOR (bold, italic, existing HTML guard, URLs)
     -------------------------------------------------------------- */
  const processInline = (s: string): string => {
    if (!s) return "";

    // **bold**
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // *italic*
    s = s.replace(/(^|[\s>])\*([^*]+?)\*($|[\s<])/g, "$1<em>$2</em>$3");
    s = s.replace(/(^|[\s>])_([^_]+?)_($|[\s<])/g, "$1<em>$2</em>$3");

    /* ----------------------------------------------------------
       ③a. Protect existing HTML tags (especially <a> … </a>)
       ---------------------------------------------------------- */
    s = s.replace(/<a[\s\S]*?<\/a>/gi, (match) => {
      const ph = `__HTML_TAG_${htmlCounter++}__`;
      htmlMap[ph] = match;      // store the whole tag
      return ph;                // replace it with a harmless placeholder
    });

    /* ----------------------------------------------------------
       ③b. Bare URLs → placeholder (single‑pass conversion)
       ---------------------------------------------------------- */
    const urlRegex = /(?:https?:\/\/[^\s<]+|www\.[^\s<]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/g;
    s = s.replace(urlRegex, (rawMatch) => {
      // Skip anything that is already a placeholder or that looks like a placeholder
      if (
        rawMatch.startsWith("__CODE_SPAN_") ||
        rawMatch.startsWith("__URL_PLACEHOLDER_") ||
        rawMatch.startsWith("__HTML_TAG_") ||
        /PLACEHOLDER/i.test(rawMatch)
      ) {
        return rawMatch;
      }

      // Trim trailing punctuation that should not be part of the URL
      let match = rawMatch;
      let trailing = "";
      while (match.length && /[.,;:!?)\]]$/.test(match)) {
        trailing = match.slice(-1) + trailing;
        match = match.slice(0, -1);
      }

      const href = match.startsWith("http") ? match : `https://${match}`;
      const ph = `__URL_PLACEHOLDER_${urlCounter++}__`;
      urlMap[ph] = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors">${match}</a>${trailing}`;
      return ph;
    });

    // Restore code‑span placeholders (they were stored above)
    Object.entries(codeMap).forEach(([ph, html]) => {
      s = s.replace(new RegExp(ph, "g"), html);
    });

    // Restore **protected HTML tags** (the original <a> elements)
    Object.entries(htmlMap).forEach(([ph, html]) => {
      s = s.replace(new RegExp(ph, "g"), html);
    });

    return s;
  };

  /* --------------------------------------------------------------
     ④  LINE‑BY‑LINE → <ul>, <li>, <p>
     -------------------------------------------------------------- */
  const lines = processed.split(/\n/);
  let inList = false;
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // simple bullet list detection (‑, *, •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/s);
    if (bulletMatch) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1 my-2">');
        inList = true;
      }
      out.push(
        `<li class="list-disc list-inside">${processInline(bulletMatch[1].trim())}</li>`
      );
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        out.push("");
      } else {
        out.push(`<p class="mb-2 leading-relaxed">${processInline(trimmed)}</p>`);
      }
    }
  }
  if (inList) out.push("</ul>");

  /* --------------------------------------------------------------
     ⑤  FINAL REPLACEMENT OF URL PLACEHOLDERS
     -------------------------------------------------------------- */
  let result = out.join("\n");

  // URLs that we turned into placeholders
  Object.entries(urlMap).forEach(([ph, html]) => {
    result = result.replace(new RegExp(ph, "g"), html);
  });

  // (code spans were already restored; just clean any stray placeholders)
  result = result.replace(/__CODE_SPAN_\d+__/g, "");
  result = result.replace(/__HTML_TAG_\d+__/g, "");

  // safety nets – remove any generic placeholders that might have slipped through
  result = result.replace(/MD_LINK_PLACEHOLDER_\d+/g, "");
  result = result.replace(/URL_PLACEHOLDER_\d+/g, "");

  return result;
};

/* ------------------------------------------------------------------
   2️⃣  SEARCH BAR COMPONENT (unchanged)
   ------------------------------------------------------------------ */
interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showIntroBubble, setShowIntroBubble] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullText, setFullText] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [showTypewriter, setShowTypewriter] = useState(false);

  const rotatingSuggestions = [
    "✨ Tell me about Gaurav's Experience",
    "✨ What is Gaurav's Education?",
    "✨ What are Gaurav's Skills?",
    "✨ Can you share Recommendations?",
    "✨ Show me Achievements",
    "✨ List Certifications",
    "✨ What Projects has Gaurav done?",
    "✨ Any Hobbies?",
    "✨ How to Contact Gaurav?",
  ];

  /* ----------------------------------------------------------------
     Activity tracking (mouse, key, click, scroll)
     ---------------------------------------------------------------- */
  useEffect(() => {
    const handleActivity = () => setLastActivityTime(Date.now());

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, []);

  /* ----------------------------------------------------------------
     Intro bubble (first 2‑3 visits)
     ---------------------------------------------------------------- */
  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem("introBubbleVisits") || "0", 10);
    if (visitCount < 3) {
      const timer = setTimeout(() => setShowIntroBubble(true), 3000);
      localStorage.setItem("introBubbleVisits", String(visitCount + 1));
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        if (!hasInteracted) setShowTypewriter(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  /* ----------------------------------------------------------------
     Show typewriter again after inactivity
     ---------------------------------------------------------------- */
  useEffect(() => {
    const inactivityTimer = setInterval(() => {
      const idle = Date.now() - lastActivityTime;
      const visitCount = parseInt(localStorage.getItem("introBubbleVisits") || "0", 10);
      if (
        idle > 8000 &&
        hasInteracted &&
        !showIntroBubble &&
        visitCount >= 3 &&
        !isLoading &&
        !response
      ) {
        setShowTypewriter(true);
      }
    }, 1000);
    return () => clearInterval(inactivityTimer);
  }, [lastActivityTime, hasInteracted, showIntroBubble, isLoading, response]);

  /* ----------------------------------------------------------------
     Typewriter effect (rotates through suggestions)
     ---------------------------------------------------------------- */
  useEffect(() => {
    if (!showTypewriter || showIntroBubble) return;

    const typingSpeed = 40;
    const deletingSpeed = 20;
    const pauseBeforeDelete = 3000;
    const pauseAfterDelete = 500;

    let timeout: NodeJS.Timeout;

    if (!isDeleting && typewriterText === fullText && fullText !== "") {
      timeout = setTimeout(() => setIsDeleting(true), pauseBeforeDelete);
    } else if (isDeleting && typewriterText === "") {
      timeout = setTimeout(() => {
        const next = (currentSuggestionIndex + 1) % rotatingSuggestions.length;
        setCurrentSuggestionIndex(next);
        setFullText(rotatingSuggestions[next]);
        setIsDeleting(false);
      }, pauseAfterDelete);
    } else if (isDeleting) {
      timeout = setTimeout(() => setTypewriterText((p) => p.slice(0, -1)), deletingSpeed);
    } else {
      if (fullText === "") setFullText(rotatingSuggestions[currentSuggestionIndex]);
      else
        timeout = setTimeout(
          () => setTypewriterText((p) => fullText.slice(0, p.length + 1)),
          typingSpeed
        );
    }

    return () => clearTimeout(timeout);
  }, [
    typewriterText,
    isDeleting,
    fullText,
    currentSuggestionIndex,
    rotatingSuggestions,
    showIntroBubble,
    showTypewriter,
  ]);

  /* ----------------------------------------------------------------
     Submit handler (calls your API)
     ---------------------------------------------------------------- */
  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);
    setHasInteracted(true);
    setShowTypewriter(false);
    if (!customQuery) setQuery("");

    try {
      const result = await sendChatMessage(text);
      const answer = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];
      setResponse(String(answer));
      setSuggestions(suggs);
      onSearch?.(String(answer));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setResponse(msg);
      setSuggestions([]);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ----------------------------------------------------------------
     Interaction helpers
     ---------------------------------------------------------------- */
  const handleSuggestionClick = (s: string) => {
    setQuery("");
    setHasInteracted(true);
    setShowTypewriter(false);
    handleSubmit(undefined, s);
    setShowIntroBubble(false);
  };

  const handleInputFocus = () => {
    setShowIntroBubble(false);
    setShowTypewriter(false);
    setHasInteracted(true);
  };

  /* ----------------------------------------------------------------
     Layout calculations
     ---------------------------------------------------------------- */
  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const isExpanded = suggestions.length > 0 || response;
  const targetWidth = isExpanded ? "700px" : `${dynamicWidth}px`;
  const targetRadius = isExpanded ? "16px" : "999px";

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3">
      {/* Intro bubble */}
      {showIntroBubble && (
        <div
          onClick={() => handleSuggestionClick("✨ What are these sections on the website?")}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md opacity-0 animate-delayedFadeIn"
        >
          ✨ What are these sections on the website?
        </div>
      )}

      {/* Typewriter bubble (text changes, bubble stays) */}
      {!showIntroBubble && showTypewriter && (
        <div
          onClick={() => handleSuggestionClick(fullText)}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md opacity-0 animate-delayedFadeIn"
        >
          <span className="typewriter-text">
            {typewriterText}
            <span className="typewriter-cursor">|</span>
          </span>
        </div>
      )}

      <div
        className="mx-auto shadow-lg border bg-white/10 backdrop-blur-xl text-foreground border-foreground/30"
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
          {/* Suggestions */}
          {suggestions.length > 0 && (
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
          )}

          {/* Assistant response */}
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

          {/* Input form */}
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
                  setShowTypewriter(false);
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
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes delayedFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease forwards; }
        .animate-delayedFadeIn { animation: delayedFadeIn 0.8s ease forwards; animation-delay: 0.1s; }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .thinking-placeholder {
          background: linear-gradient(90deg, rgba(150,150,150,0.15) 25%, rgba(150,150,150,0.6) 50%, rgba(150,150,150,0.15) 75%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: shimmer 2s infinite linear;
        }
        .thinking-placeholder::placeholder { color: transparent; }
        .thinking-placeholder[disabled]::-webkit-text-fill-color { -webkit-text-fill-color: transparent; }
        .thinking-placeholder[disabled] { caret-color: transparent; }

        .inline-code { 
          background: rgba(255,255,255,0.04); 
          padding: 0.05rem 0.25rem; 
          border-radius: 4px; 
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace; 
          font-size: 0.9em; 
        }

        /* Typewriter cursor */
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .typewriter-cursor {
          display: inline-block;
          animation: blink 1s infinite;
          margin-left: 2px;
          font-weight: normal;
        }
        .typewriter-text { display: inline-block; min-height: 1.2em; }
      `}</style>
    </div>
  );
};

export default SearchBar;
