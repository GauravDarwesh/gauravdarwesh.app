import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
    console.log('Sending request to Gemini...');
    try {
      // Direct call to Gemini API (temporary solution)
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDek37lbDSUGZsEOnkzNl8hy9V3Kw1B-Uo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ text: query }] 
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('Error response text:', responseText);
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
      
      const data = await response.json();
      console.log('Parsed response data:', data);
      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated';
      onSearch?.(aiResponse);
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