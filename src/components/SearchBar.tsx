import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // ⌥ + space toggle
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const result = await sendChatMessage(query);
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error instanceof Error ? error.message : 'Something went wrong',
        },
      ]);
    } finally {
      setIsLoading(false);
      // auto-scroll to bottom
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex justify-center">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.3, 1] }}
            className="shadow-xl border border-white/20 bg-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            {/* Messages */}
            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'ml-auto bg-white/30 text-foreground backdrop-blur-md'
                      : 'mr-auto bg-white/20 text-foreground backdrop-blur-sm'
                  }`}
                >
                  {msg.content}
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 p-3 border-t border-white/10"
            >
              <Input
                type="text"
                placeholder="Ask anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                           text-foreground placeholder:text-muted-foreground text-base px-4 h-10"
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/20 rounded-full 
                           transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)] 
                           hover:scale-110 active:scale-95 shrink-0"
                disabled={isLoading || !query.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
          transition: background 0.3s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
