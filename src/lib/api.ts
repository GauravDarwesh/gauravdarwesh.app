// src/lib/api.ts
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './session';

export interface ChatResponse {
  response: string;
  success: boolean;
  debug?: object;
}

export interface StreamChatHandlers {
  onToken?: (chunk: string) => void;
  onVisuals?: (visuals: Array<{ url: string; title?: string }>) => void;
}

/**
 * Streams a chat response when the backend supports it; otherwise falls back
 * to a single-shot response emitted as one chunk.
 */
export async function streamChatMessage(
  message: string,
  handlers: StreamChatHandlers = {},
): Promise<ChatResponse & { visuals?: Array<{ url: string; title?: string }>; suggestions?: string[] }> {
  const result = await sendChatMessage(message);

  const data = (result.debug ?? {}) as any;
  const visuals = Array.isArray(data?.visuals) ? data.visuals : undefined;

  if (result.response) {
    handlers.onToken?.(result.response);
  }
  if (visuals && visuals.length > 0) {
    handlers.onVisuals?.(visuals);
  }

  return {
    ...result,
    visuals,
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  };
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const sessionId = getSessionId();
  
  console.log('Sending chat message:', { message, sessionId });
  
  try {
    const { data, error } = await supabase.functions.invoke('bright-action', {
      body: { 
        message: message.trim(),
        sessionId 
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message ?? 'Edge function error');
    }

    console.log('Chat response data:', data);
    
    return {
      response: (data as any)?.response ?? 'No response generated',
      success: true,
      debug: data
    };
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      response: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
      success: false
    };
  }
}