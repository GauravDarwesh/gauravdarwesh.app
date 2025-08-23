import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import ResponseRenderer from '@/components/ResponseRenderer';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);

    setIsLoading(true);
    try {
      const result = await sendChatMessage(query);
      setMessages([...newMessages, { role: 'ai', content: result.response }]);
      setQuery('');
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: 'ai',
          content: `Error: ${
            error instanceof Error ? error.message : 'Something went wrong'
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  // dynamic width based on query length
  const dynamicWidth = Math.min(350 + query.length * 8, 700);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4">
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl flex flex-col overflow-hidden"
        style={{
          maxWidth: hasMessages ? '700px' : `${dynamicWidth}px`,
          borderRadius: hasMessages ? '1.5rem' : '9999px',
          height: hasMessages ? '70vh' : '52px',
          transition: 'all 1.6s cubic-bezier(0.25, 1, 0.3, 1)',
        }}
      >
        {/* Chat history */}
        {hasMessages && (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scroll"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-auto text-right text-white'
                    : 'mr-auto text-left text-white/90'
                }`}
              >
                {msg.role === 'ai' ? (
                  <ResponseRenderer response={msg.content} />
                ) : (
                  msg.content
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Section */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-3 py-2"
        >
          <Input
            type="text"
            placeholder="Ask anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                       text-white placeholder:text-white/50 text-base px-3 h-10"
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-9 w-9 flex items-center justify-center p-0 hover:bg-white/20 rounded-full 
                       transition-all duration-300 ease-in-out
                       hover:scale-110 active:scale-95 shrink-0"
            disabled={isLoading || !query.trim()}
          >
            <Search className="h-4 w-4 text-white" />
          </Button>
        </form>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.35);
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
