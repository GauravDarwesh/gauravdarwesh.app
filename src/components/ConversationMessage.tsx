import React from 'react';
import { User, Bot } from 'lucide-react';
import ResponseRenderer from './ResponseRenderer';
import MessageActions from './MessageActions';

interface ConversationMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

const ConversationMessage: React.FC<ConversationMessageProps> = ({ 
  message, 
  isUser, 
  timestamp 
}) => {
  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-card/60 border border-border/30'
        }`}>
          {isUser ? (
            <p className="text-sm">{message}</p>
          ) : (
            <ResponseRenderer response={message} className="text-sm" />
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && <MessageActions message={message} />}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-secondary/50 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-foreground" />
        </div>
      )}
    </div>
  );
};

export default ConversationMessage;