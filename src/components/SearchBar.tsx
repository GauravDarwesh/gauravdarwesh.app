import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { sendChatMessage } from '@/lib/api';

interface SearchBarProps {
  onSearch?: (response: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;

    setIsLoading(true);
    setResponse(null);
    setQuery('');

    try {
      const result = await sendChatMessage(text);
      const assistant = (result as any)?.response ?? '';
      setResponse(String(assistant));
      onSearch?.(String(assistant));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setResponse(msg);
      onSearch?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicWidth = Math.min(300 + query.length * 2, 200);
  const dynamicRadius = Math.max(24, 999 - query.length * 2);

  const targetWidth = response ? '700px' : `${dynamicWidth}px`;
  const targetRadius = response ? '16px' : `${dynamicRadius}px`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 z-50 w-full flex justify-center">
      <div
        className="shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl"
        style={{
          width: targetWidth,
          maxWidth: '90vw',
          borderRadius: targetRadius,
          transition: 'all 1.2s cubic-bezier(0.25, 1, 0.3, 1)',
        }}
      >
        <div
          className={`transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
            response ? 'p-5 pt-6' : 'p-2'
          }`}
        >
          {/* Response */}
          <div
            className={`overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.3,1)] ${
              response ? 'opacity-100 mb-5' : 'opacity-0 mb-0'
            }`}
            style={{
              maxHeight: response ? '384px' : '0px',
              transitionDelay: response ? '300ms' : '0ms',
            }}
          >
            {response && (
              <div
                className="text-foreground text-sm leading-relaxed px-4 text-center"
                style={{
                  animation: 'fadeSlideIn 400ms cubic-bezier(0.25,1,0.3,1) both',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {response}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="w-full">
            <Input
              type="text"
              placeholder={isLoading ? 'Searching…' : 'Ask anything…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-0 focus-visible:ring-0 
                         focus-visible:ring-offset-0 text-foreground 
                         placeholder:text-muted-foreground text-base h-10 
                         text-center"
              disabled={isLoading}
              aria-label="Ask anything"
            />
          </form>
        </div>
      </div>

      {/* Styles */}
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
