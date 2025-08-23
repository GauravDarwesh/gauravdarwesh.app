import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react'; // minimal magnifying glass
import { sendChatMessage } from '@/lib/api';
import ResponseRenderer from '@/components/ResponseRenderer';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  response?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, response }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasResponse = response && response.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const result = await sendChatMessage(query);
      onSearch?.(result.response);
      setQuery('');
    } catch (error) {
      console.error('Search error:', error);
      onSearch?.(
        `Error: ${
          error instanceof Error ? error.message : 'Something went wrong'
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Dynamic width based on query length
  const dynamicWidth = Math.min(320 + query.length * 8, 720); // smoother growth

  // 🔥 Dynamic border radius (more text → less round)
  const dynamicRadius = Math.max(24, 999 - query.length * 2);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full">
      <div
        className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl"
        style={{
          width: hasResponse ? '720px' : `${dynamicWidth}px`,
          maxWidth: '90vw',
          transformOrigin: 'center bottom',
          borderRadius: hasResponse ? '16px' : `${dynamicRadius}px`,
          transition:
            'width 1.4s cubic-bezier(0.25, 1, 0.3, 1), border-radius 1.8s cubic-bezier(0.25, 1, 0.3, 1)',
        }}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
            hasResponse ? 'p-5 pt-6' : 'p-2'
          }`}
        >
          {/* AI Response Section */}
          <div
            className={`overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
              hasResponse
                ? 'max-h-96 opacity-100 mb-5'
                : 'max-h-0 opacity-0 mb-0'
            }`}
            style={{ transitionDelay: hasResponse ? '500ms' : '0ms' }}
          >
            <div className="text-foreground text-base leading-relaxed px-4">
              <ResponseRenderer
                response={response || ''}
                className="text-base leading-relaxed"
              />
            </div>
          </div>

          {/* Input Section */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2">
            <Input
              type="text"
              placeholder="Ask anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 
                         text-foreground placeholder:text-muted-foreground text-base h-11 px-3"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-9 w-9 flex items-center justify-center p-0 hover:bg-white/20 rounded-full 
                         transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)] 
                         hover:scale-110 active:scale-95 shrink-0"
              disabled={isLoading || !query.trim()}
            >
              <Search className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
