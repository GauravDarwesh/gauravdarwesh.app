import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { sendChatMessage } from '@/lib/api';
import { getSessionId } from '@/lib/session';

const SessionTester: React.FC = () => {
  const [responses, setResponses] = useState<Array<{message: string, response: string, timestamp: string}>>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(getSessionId());

  const handleTestMessage = async (message: string) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      const result = await sendChatMessage(message);
      setResponses(prev => [...prev, {
        message,
        response: result.response,
        timestamp
      }]);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomMessage = async () => {
    if (!customMessage.trim()) return;
    await handleTestMessage(customMessage);
    setCustomMessage('');
  };

  const clearSessionAndReload = () => {
    localStorage.removeItem('gd_ai_session_id');
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GD-AI Session Memory Tester</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Session ID:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {sessionId}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Instructions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Test Instructions:</h3>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Click "Test First Greeting" - should get full introduction</li>
              <li>Click "Test Second Greeting" - should get shorter greeting</li>
              <li>Use "Clear Session & Reload" to test new session behavior</li>
              <li>Try knowledge queries to test normal functionality</li>
            </ol>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              onClick={() => handleTestMessage('hi')}
              disabled={isLoading}
              variant="outline"
            >
              Test First Greeting
            </Button>
            <Button 
              onClick={() => handleTestMessage('hello')}
              disabled={isLoading}
              variant="outline"
            >
              Test Second Greeting
            </Button>
            <Button 
              onClick={() => handleTestMessage('tell me about Gaurav Darwesh')}
              disabled={isLoading}
              variant="outline"
            >
              Test Knowledge Query
            </Button>
            <Button 
              onClick={clearSessionAndReload}
              variant="destructive"
            >
              Clear Session & Reload
            </Button>
          </div>

          {/* Custom Message Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type custom message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomMessage()}
              disabled={isLoading}
            />
            <Button 
              onClick={handleCustomMessage}
              disabled={isLoading || !customMessage.trim()}
            >
              Send Custom
            </Button>
          </div>

          <Separator />

          {/* Response History */}
          <div className="space-y-3">
            <h3 className="font-medium">Response History:</h3>
            {responses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No messages sent yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {responses.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">You: {item.message}</Badge>
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      </div>
                      <div className="text-sm bg-muted/30 p-2 rounded whitespace-pre-wrap">
                        {item.response}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionTester;