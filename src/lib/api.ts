// src/lib/api.ts
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './session';

export interface ChatResponse {
  response: string;
  success: boolean;
  debug?: object;
}

export async function sendChatMessage(message: string, audioData?: string): Promise<ChatResponse> {
  const sessionId = getSessionId();
  
  console.log('Sending chat message:', { message, sessionId, hasAudio: !!audioData });
  
  try {
    // Use gemini-voice-chat if audio data is provided, otherwise use bright-action
    const functionName = audioData ? 'gemini-voice-chat' : 'bright-action';
    const body = audioData 
      ? { message: message.trim(), sessionId, audioData }
      : { message: message.trim(), sessionId };

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
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