"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

// --- Improved getShortenedLinkText ---
const getShortenedLinkText = (url: string): string => {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname.replace(/^www\./i, "");

    const domainMap: { [key: string]: string } = {
      "linkedin.com": "LinkedIn",
      "twitter.com": "Twitter",
      "x.com": "Twitter",
      "facebook.com": "Facebook",
      "instagram.com": "Instagram",
      "youtube.com": "YouTube",
      "github.com": "GitHub",
      "google.com": "Google",
      "microsoft.com": "Microsoft",
      "apple.com": "Apple",
      "amazon.com": "Amazon",
      "netflix.com": "Netflix",
      "t.co": "Twitter",
      "youtu.be": "YouTube",
    };

    // Prefer exact or suffix match (handles subdomains like mobile.twitter.com)
    for (const key of Object.keys(domainMap)) {
      if (hostname === key || hostname.endsWith(`.${key}`)) {
        return domainMap[key];
      }
    }

    // Fallback: use first subdomain/label (gives descriptive names for long subdomains)
    const parts = hostname.split(".");
    const first = parts[0] || hostname;
    return first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    return "Link";
  }
};

// --- Improved markdown -> HTML converter ---
const convertMarkdownToHtml = (text: string): string => {
  if (!text) return "";

  let processed = text;

  // 1) Extract markdown links [text](url) into placeholders so further URL processing won't touch them
  const mdLinkMap: Record<string, string> = {};
  let mdLinkCounter = 0;
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, linkUrl) => {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    const anchor = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors">${linkText}</a>`;
    const placeholder = `__MD_LINK_PLACEHOLDER_${mdLinkCounter++}__`;
    mdLinkMap[placeholder] = anchor;
    return placeholder;
  });

  // 2) Simple inline conversions (bold, italic, inline code)
  // Bold first to avoid interfering with single-asterisk italics
  processed = processed.replace(/\*\*(.*?)\*\*/gs, "<strong>$1</strong>");
  processed = processed.replace(/\*(.*?)\*/gs, "<em>$1</em>");
  processed = processed.replace(/`([^`]+)`/g, "<code class=\"inline-code\">$1</code>");

  // 3) Replace bare URLs (http(s)://, www., or domain.tld/...). Trim trailing punctuation.
  const urlRegex = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  processed = processed.replace(urlRegex, (rawMatch) => {
    // If this exact match is already an md link placeholder, skip (shouldn't normally happen)
    if (mdLinkMap[rawMatch]) return mdLinkMap[rawMatch];

    // Trim common trailing punctuation that may follow a URL in plain text (.,;:!?) and unmatched closing paren
    let match = rawMatch;
    let trailing = "";
    while (match.length > 0 && /[.,;:!?)\]]$/.test(match)) {
      trailing = match.slice(-1) + trailing;
      match = match.slice(0, -1);
    }

    const href = match.startsWith("http") ? match : `https://${match}`;
    const linkText = getShortenedLinkText(match);

    const anchor = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors">${linkText}<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>`;

    return anchor + trailing;
  });

  // 4) Restore markdown link placeholders
  Object.keys(mdLinkMap).forEach((ph) => {
    processed = processed.split(ph).join(mdLinkMap[ph]);
  });

  // 5) Convert lines to lists and paragraphs.
  const lines = processed.split(/\r?\n/);
  let inList = false;
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match -, *, or • bullets
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/s);

    if (bulletMatch) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1 my-2">');
        inList = true;
      }
      out.push(`<li class="list-disc list-inside">${bulletMatch[1].trim()}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (trimmed === "") {
        // preserve paragraph breaks as a small gap
        out.push("");
      } else {
        // Wrap other lines in a paragraph for spacing and readable layout
        out.push(`<p class="mb-2 leading-relaxed">${trimmed}</p>`);
      }
    }
  }

  if (inList) out.push("</ul>");

  return out.join("\n");
};

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showIntroBubble, setShowIntroBubble] = useState(false);

  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem("introBubbleVisits") || "0", 10);
    if (visitCount < 3) {
      const timer = setTimeout(() => {
        setShowIntroBubble(true);
      }, 3000);
      localStorage.setItem("introBubbleVisits", String(visitCount + 1));
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);

    // Clear query only if it's user-typed, not a suggestion
    if (!customQuery) setQuery("");

    try {
      const result = await sendChatMessage(text);
      const assistant = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];

      setResponse(String(assistant));
      setSuggestions(suggs);
      onSearch?.(String(assistant));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setResponse(msg);
      setSuggestions([]);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (s: string) => {
    setQuery("");
    handleSubmit(undefined, s);
    setShowIntroBubble(false);
  };

  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const isExpanded = suggestions.length > 0 || response;
  const targetWidth = isExpanded ? "700px" : `${dynamicWidth}px`;
  const targetRadius = isExpanded ? "16px" : "999px";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3">
      {/* Intro Bubble */}
      {showIntroBubble && (
        <div
          onClick={() => handleSuggestionClick("✨ What are these sections on the website?")}
          className="cursor-pointer bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-2 rounded-full shadow-md opacity-0 animate-delayedFadeIn"
        >
          ✨ What are these sections on the website?
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

          {/* AI Response */}
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
                // We now generate reliable HTML for paragraphs, lists, links & inline formatting
                dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(response) }}
              />
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="flex items-center gap-3"
            onFocus={() => setShowIntroBubble(false)}
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={isLoading ? "Thinking…" : "Ask anything…"}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (showIntroBubble) setShowIntroBubble(false);
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes delayedFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease forwards; }
        .animate-delayedFadeIn { animation: delayedFadeIn 0.8s ease forwards; animation-delay: 0.1s; }

        /* Thinking shimmer */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .thinking-placeholder::placeholder {
          background: linear-gradient(90deg, rgba(150,150,150,0.2) 25%, rgba(150,150,150,0.6) 50%, rgba(150,150,150,0.2) 75%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s infinite linear;
        }
        /* small styling for inline code */
        .inline-code { background: rgba(255,255,255,0.04); padding: 0.05rem 0.25rem; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace; font-size: 0.9em; }
      `}</style>
    </div>
  );
};

export default SearchBar;