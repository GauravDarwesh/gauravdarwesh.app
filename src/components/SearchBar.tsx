import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThreadOpen, setIsThreadOpen] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // ⌥ Option + Space toggles thread visibility (search bar stays)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Prevent conflicting native shortcuts
      if ((e.code === 'Space' || e.key === ' ') && e.altKey) {
        e.preventDefault();
        setIsThreadOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isThreadOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;

    // Push user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setQuery('');
    setIsThreadOpen(true); // ensure thread is visible when sending
    setIsLoading(true);

    try {
      const result = await sendChatMessage(text);
      const assistant = (result as any)?.response ?? '';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: String(assistant) },
      ]);
      onSearch?.(String(assistant));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg },
      ]);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic width/radius like your original
  const dynamicWidth = Math.min(300 + query.length * 8, 700);
  const dynamicRadius = Math.max(24, 999 - query.length * 2);

  // Expand to full width when thread is open and there are messages
  const targetWidth = hasMessages && isThreadOpen ? '700px' : `${dynamicWidth}px`;
  const targetRadius = hasMessages && isThreadOpen ? '16px' : `${dynamicRadius}px`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full">
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl"
        style={{
          width: targetWidth,
          maxWidth: '90vw',
          transformOrigin: 'center bottom',
          borderRadius: targetRadius,
          transition: 'all 1.2s cubic-bezier(0.25, 1, 0.3, 1)',
        }}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
            hasMessages && isThreadOpen ? 'p-5 pt-6' : 'p-2'
          }`}
        >
          {/* Thread / Messages */}
          <div
            className={`overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
              hasMessages && isThreadOpen
                ? 'opacity-100 mb-5'
                : 'opacity-0 mb-0'
            }`}
            style={{
              // Smooth accordion style open/close
              maxHeight: hasMessages && isThreadOpen ? '384px' : '0px', // ~ max-h-96
              transitionDelay: hasMessages && isThreadOpen ? '300ms' : '0ms',
            }}
          >
            <div
              ref={containerRef}
              className="text-foreground text-base leading-relaxed px-4 space-y-3 overflow-y-auto glass-scrollbar"
              style={{
                maxHeight: '360px',
                paddingRight: '0.25rem',
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    'max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ' +
                    (m.role === 'user'
                      ? 'ml-auto bg-white/40 backdrop-blur-md ring-1 ring-white/20'
                      : 'mr-auto bg-white/25 backdrop-blur-sm ring-1 ring-white/15')
                  }
                  style={{
                    // Subtle fade/slide with pure CSS
                    animation:
                      'fadeSlideIn 500ms cubic-bezier(0.25,1,0.3,1) both',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              type="text"
              placeholder="Ask anything…"
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

      {/* Scoped styles for animations + glass scrollbar */}
      <style>
        {`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          /* Translucent glass scrollbar */
          .glass-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.35) transparent;
          }
          .glass-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .glass-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .glass-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.35);
            border-radius: 9999px;
            border: 2px solid rgba(255, 255, 255, 0.15);
          }
          .glass-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        `}
      </style>
    </div>
  );
};

export default SearchBar;
