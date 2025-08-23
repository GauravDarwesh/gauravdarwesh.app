import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);

    setIsLoading(true);
    try {
      const result = await sendChatMessage(query);

      // Add AI response
      setMessages([
        ...newMessages,
        { role: 'ai', content: result.response },
      ]);

      setQuery('');
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: 'ai',
          content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full">
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '700px',
          borderRadius: hasMessages ? '1rem' : '9999px',
          height: hasMessages ? '70vh' : '52px',
          transition: 'all 1.5s cubic-bezier(0.25, 1, 0.3, 1)',
        }}
      >
        {/* Chat history */}
        {hasMessages && (
          <div className="h-[calc(70vh-52px)] overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[80%] text-base leading-relaxed px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'ml-auto bg-white/20 text-foreground text-right'
                    : 'mr-auto bg-white/10 text-foreground'
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
          className="flex items-center gap-3 border-t border-white/10 px-2 py-2"
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
                       transition-all duration-300 ease-in-out
                       hover:scale-110 active:scale-95 shrink-0"
            disabled={isLoading || !query.trim()}
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;
