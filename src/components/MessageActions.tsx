import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  message: string;
}

const MessageActions: React.FC<MessageActionsProps> = ({ message }) => {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleThumbsUp = () => {
    toast({
      title: "Feedback recorded",
      description: "Thank you for your feedback!",
      duration: 2000,
    });
  };

  const handleThumbsDown = () => {
    toast({
      title: "Feedback recorded", 
      description: "We'll work to improve our responses.",
      duration: 2000,
    });
  };

  const handleRegenerate = () => {
    toast({
      title: "Regenerating response",
      description: "This feature will be available soon.",
      duration: 2000,
    });
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-8 w-8 p-0 hover:bg-accent/20"
      >
        <Copy className="w-3 h-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleThumbsUp}
        className="h-8 w-8 p-0 hover:bg-accent/20"
      >
        <ThumbsUp className="w-3 h-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleThumbsDown}
        className="h-8 w-8 p-0 hover:bg-accent/20"
      >
        <ThumbsDown className="w-3 h-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRegenerate}
        className="h-8 w-8 p-0 hover:bg-accent/20"
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default MessageActions;