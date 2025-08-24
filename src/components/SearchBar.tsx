"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]); // start empty

  // 🔥 Submit handler
  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();

    const text = (customQuery ?? query).trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);
    if (!customQuery) setQuery(""); // only clear if user typed manually

    try {
      const result = await sendChatMessage(text);
      const assistant = (result as any)?.response ?? "";
      const suggs = Array.isArray((result as any)?.suggestions)
        ? (result as any).suggestions
        : []; // only set suggestions if Gemini returns them

      setResponse(String(assistant));
      setSuggestions(suggs);
      onSearch?.(String(assistant));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setResponse(msg);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Suggestion click (calls API directly with that suggestion)
  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    handleSubmit(undefined, s);
  };

  // Dynamic UI transitions
  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const dynamicRadius = Math.max(24, 999 - query.length * 2);
  const targetWidth = response ? "700px" : `${dynamicWidth}px`;
  const targetRadius = response ? "16px" : `${dynamicRadius}px`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3">
      {/* 💡 Suggestion Pills: Show ONLY if suggestions exist */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="px-3 py-1 bg-white/20 text-xs sm:text-sm rounded-full 
                         hover:bg-white/30 transition cursor-pointer"
              disabled={isLoading}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 💬 Main Box */}
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl"
        style={{
          width: targetWidth,
          maxWidth: "90vw",
          transformOrigin: "center bottom",
          borderRadius: targetRadius,
          transition: "all 1.2s cubic-bezier(0.25, 1, 0.3, 1)",
        }}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
            response ? "p-5 pt-6" : "p-2"
          }`}
        >
          {/* 🔥 AI Response Section */}
          <div
            className={`overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
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
                  whiteSpace: "pre-wrap",
                  maxHeight: "300px",
                }}
              >
                {response}
              </div>
            )}
          </div>

          {/* ✍️ Input Section */}
          <form onSubmit={(e) => handleSubmit(e)} className="flex items-center gap-3">
            <Input
              type="text"
              placeholder={isLoading ? "Thinking…" : "Ask anything…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                         text-foreground placeholder:text-muted-foreground text-base px-4 h-10"
              disabled={isLoading}
              aria-label="Ask anything"
            />

            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/20 rounded-full 
                         transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)] 
                         hover:scale-110 active:scale-95 shrink-0"
              disabled={isLoading || !query.trim()}
              aria-label="Send"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* 🎨 Animations */}
      <style>
        {`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default SearchBar;
