import SearchBar from '@/components/SearchBar';
import ConversationMessage from '@/components/ConversationMessage';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSearch = (query: string, response: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: query,
      isUser: true,
      timestamp: new Date()
    };
    
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      content: response,
      isUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage, aiMessage]);
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen w-full relative">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`
      }} />
      
      {/* Main container */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with clear button */}
        {messages.length > 0 && (
          <div className="flex justify-between items-center p-4 border-b border-border/20 bg-background/80 backdrop-blur-sm">
            <h1 className="text-lg font-semibold">Conversation</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearConversation}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        )}
        
        {/* Conversation area */}
        <div className="flex-1 flex flex-col">
          {messages.length === 0 ? (
            // Welcome screen
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <h1 className="text-4xl font-bold text-foreground mb-4">Ask me anything</h1>
                <p className="text-muted-foreground">Powered by Gemini AI</p>
              </div>
            </div>
          ) : (
            // Conversation messages
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {messages.map(message => (
                  <div key={message.id} className="group">
                    <ConversationMessage
                      message={message.content}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Search Bar at bottom */}
          <div className="border-t border-border/20 bg-background/80 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto p-4">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;