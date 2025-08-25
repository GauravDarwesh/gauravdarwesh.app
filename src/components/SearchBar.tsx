"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink } from "lucide-react";
import { sendChatMessage } from "@/lib/api";

// Interface for parsed content segments
interface ContentSegment {
  type: 'text' | 'link' | 'bold' | 'bullet-list';
  content: string;
  url?: string;
  items?: string[];
}

// Function to get shortened link text based on domain
const getShortenedLinkText = (url: string): string => {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
    
    // Map common domains to readable names
    const domainMap: { [key: string]: string } = {
      'linkedin.com': 'LinkedIn',
      'twitter.com': 'Twitter',
      'x.com': 'Twitter',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'youtube.com': 'YouTube',
      'github.com': 'GitHub',
      'google.com': 'Google',
      'microsoft.com': 'Microsoft',
      'apple.com': 'Apple',
      'amazon.com': 'Amazon',
      'netflix.com': 'Netflix'
    };
    
    if (domainMap[domain]) {
      return domainMap[domain];
    }
    
    // For other domains, use the first part of the domain name
    const parts = domain.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Link';
  }
};

// Parse response text into structured content segments
const parseResponseContent = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  const lines = text.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for bullet points
    const bulletMatch = line.match(/^\s*\*\s+(.+)$/);
    if (bulletMatch) {
      const bulletItems: string[] = [bulletMatch[1]];
      i++;
      
      // Collect consecutive bullet points
      while (i < lines.length) {
        const nextBulletMatch = lines[i].match(/^\s*\*\s+(.+)$/);
        if (nextBulletMatch) {
          bulletItems.push(nextBulletMatch[1]);
          i++;
        } else {
          break;
        }
      }
      
      segments.push({
        type: 'bullet-list',
        content: '',
        items: bulletItems
      });
      continue;
    }
    
    // Process regular text line for bold text and links
    if (line.trim()) {
      const processedSegments = parseLineContent(line);
      segments.push(...processedSegments);
    } else {
      // Empty line - add as text to preserve spacing
      segments.push({
        type: 'text',
        content: '\n'
      });
    }
    
    i++;
  }
  
  return segments;
};

// Parse a single line for bold text and links
const parseLineContent = (line: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  let currentText = line;
  
  // First handle URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
  const urlMatches = [...currentText.matchAll(urlRegex)];
  
  if (urlMatches.length === 0) {
    // No URLs, just process for bold text
    const boldSegments = parseBoldText(currentText);
    segments.push(...boldSegments);
  } else {
    // Process text with URLs
    let lastIndex = 0;
    
    for (const match of urlMatches) {
      const matchIndex = match.index!;
      
      // Add text before URL
      if (matchIndex > lastIndex) {
        const textBefore = currentText.slice(lastIndex, matchIndex);
        const boldSegments = parseBoldText(textBefore);
        segments.push(...boldSegments);
      }
      
      // Add URL
      const url = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
      segments.push({
        type: 'link',
        content: getShortenedLinkText(match[0]),
        url: url
      });
      
      lastIndex = matchIndex + match[0].length;
    }
    
    // Add remaining text after last URL
    if (lastIndex < currentText.length) {
      const textAfter = currentText.slice(lastIndex);
      const boldSegments = parseBoldText(textAfter);
      segments.push(...boldSegments);
    }
  }
  
  return segments;
};

// Parse bold text from a string
const parseBoldText = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  const boldMatches = [...text.matchAll(boldRegex)];
  
  if (boldMatches.length === 0) {
    // No bold text
    if (text.trim()) {
      segments.push({
        type: 'text',
        content: text
      });
    }
  } else {
    let lastIndex = 0;
    
    for (const match of boldMatches) {
      const matchIndex = match.index!;
      
      // Add text before bold
      if (matchIndex > lastIndex) {
        const textBefore = text.slice(lastIndex, matchIndex);
        if (textBefore.trim()) {
          segments.push({
            type: 'text',
            content: textBefore
          });
        }
      }
      
      // Add bold text
      segments.push({
        type: 'bold',
        content: match[1]
      });
      
      lastIndex = matchIndex + match[0].length;
    }
    
    // Add remaining text after last bold
    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex);
      if (textAfter.trim()) {
        segments.push({
          type: 'text',
          content: textAfter
        });
      }
    }
  }
  
  return segments;
};

// Component to render parsed content segments
const ResponseRenderer: React.FC<{ segments: ContentSegment[] }> = ({ segments }) => {
  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'text':
            return <span key={index}>{segment.content}</span>;
          
          case 'bold':
            return <strong key={index} className="font-semibold">{segment.content}</strong>;
          
          case 'link':
            return (
              <a
                key={index}
                href={segment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors"
              >
                {segment.content}
                <ExternalLink className="w-3 h-3" />
              </a>
            );
          
          case 'bullet-list':
            return (
              <ul key={index} className="list-none space-y-1 my-2">
                {segment.items?.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          
          default:
            return null;
        }
      })}
    </>
  );
};

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    e?.preventDefault();
    const text = (customQuery ?? query).trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);
    if (!customQuery) setQuery("");

    try {
      const result = await sendChatMessage(text);
      const assistant = (result as any)?.response ?? "";
      const suggs = (result as any)?.suggestions || [];

      setResponse(String(assistant));
      setSuggestions(suggs);
      onSearch?.(String(assistant));
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

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    handleSubmit(undefined, s);
  };

  // Width & radius: expands when suggestions or response are present
  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const isExpanded = suggestions.length > 0 || response;
  const targetWidth = isExpanded ? "700px" : `${dynamicWidth}px`;
  const targetRadius = isExpanded ? "16px" : "999px";

  // Parse response content into segments
  const responseSegments = response ? parseResponseContent(response) : [];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex flex-col items-center gap-3">
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl"
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
              >
                <ResponseRenderer segments={responseSegments} />
              </div>
            )}
          </div>

          {/* Input */}
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

      {/* Animations */}
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
        .animate-fadeIn {
          animation: fadeIn 0.3s ease forwards;
        }
      `}</style>
    </div>
  );
};

export default SearchBar;