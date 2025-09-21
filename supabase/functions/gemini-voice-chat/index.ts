import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, audioData } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    let userInput = message;

    // If audio data is provided, convert it to text first
    if (audioData) {
      console.log('Processing audio input...');
      
      // For now, we'll use a placeholder since Gemini doesn't directly support audio-to-text
      // In a real implementation, you'd use Google Cloud Speech-to-Text or another service
      userInput = "Please respond to this voice message with audio output only.";
    }

    // Call Gemini API for text response
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Gaurav Darwesh's AI assistant. Keep responses conversational and helpful. User input: ${userInput}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";

    // Generate audio from text using Web Speech API (placeholder)
    // In a real implementation, you'd use Google Text-to-Speech or another service
    let audioContent = null;
    
    if (audioData) {
      // Simulate audio response generation
      console.log('Generating audio response...');
      // This would be replaced with actual TTS service call
      audioContent = "audio_placeholder";
    }

    const suggestions = [
      "Tell me about Gaurav's experience",
      "What are his skills?",
      "Show me his projects",
      "How can I contact him?"
    ];

    return new Response(JSON.stringify({ 
      response: responseText,
      suggestions,
      audioContent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-voice-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your request',
      response: "Sorry, I encountered an error. Please try again.",
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});