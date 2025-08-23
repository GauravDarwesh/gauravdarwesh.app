import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const result = await sendChatMessage(query);
      onSearch?.(result.response);
      setQuery(''); // Clear the input after successful search
    } catch (error) {
      console.error('Search error:', error);
      onSearch?.(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
      <div className="bg-card/40 backdrop-blur-xl border border-border/30 rounded-full p-2 shadow-lg">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Search input */}
          <Input
            type="text"
            placeholder="Ask anything"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground px-4"
            disabled={isLoading}
          />

          {/* Send button */}
          <Button 
            type="submit" 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 hover:bg-accent/20 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            disabled={isLoading || !query.trim()}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;