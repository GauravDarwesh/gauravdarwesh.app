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
      // Temporary: Direct call with GD-AI persona until Edge Function is deployed
      const kbPrompt = `You are GD-AI, the personal assistant of Gaurav Darwesh, available 24/7 on his website to answer questions about who Gaurav Darwesh is. Always introduce yourself as such.
Speak with charisma, wit, confidence, and dignity, balanced with humility and respect. Avoid arrogance or portraying Gaurav as a god or infallible figure.
If someone asks for a meeting or proposes a collaboration, politely direct them to this scheduling form: https://tally.so/r/wgl6zM
If asked questions outside the scope of Gaurav Darwesh's knowledge, politely decline and state you do not have that information.
Ensure all responses are professional, clear, friendly, and at least five lines long, providing elaborative yet concise answers.
Maintain a respectful and approachable tone, with warmth and professionalism. Avoid short or abrupt answers; offer thoughtful explanations that engage and inform.

User question: ${query}`;

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDek37lbDSUGZsEOnkzNl8hy9V3Kw1B-Uo',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ text: kbPrompt }] 
            }],
            generationConfig: {
              temperature: 0.4,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 900,
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