import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 15; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cache for knowledge base with TTL
let knowledgeBaseCache: { content: string; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getKnowledgeBase(): Promise<string> {
  // Check cache first
  if (knowledgeBaseCache && Date.now() - knowledgeBaseCache.timestamp < CACHE_TTL) {
    console.log('Using cached knowledge base');
    return knowledgeBaseCache.content;
  }

  try {
    console.log('Fetching fresh knowledge base from GitHub');
    // Pinned to specific commit for supply chain security
    const response = await fetch('https://raw.githubusercontent.com/gauravdarwesh/Info-Gaurav-Darwesh/c05e9dce7fac43f3d0b10e4ab3f26f41a7cc2abb/README.md');
    
    if (!response.ok) {
      console.error('Failed to fetch knowledge base:', response.status, response.statusText);
      // Return cached content if available, even if expired
      if (knowledgeBaseCache) {
        console.log('Using expired cache due to fetch failure');
        return knowledgeBaseCache.content;
      }
      return 'Knowledge base temporarily unavailable.';
    }
    
    const content = await response.text();
    console.log('Knowledge base fetched successfully, length:', content.length);
    
    // Update cache
    knowledgeBaseCache = {
      content,
      timestamp: Date.now()
    };
    
    return content;
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    // Return cached content if available, even if expired
    if (knowledgeBaseCache) {
      console.log('Using expired cache due to error');
      return knowledgeBaseCache.content;
    }
    return 'Knowledge base temporarily unavailable.';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();
    console.log('Received request:', { message: message?.substring(0, 100), sessionId });

    // Rate limiting by session or IP
    const rateLimitKey = sessionId || req.headers.get('x-forwarded-for') || 'anonymous';
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ response: 'Too many requests. Please wait a moment and try again.', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    if (!message || typeof message !== 'string') {
      console.error('Invalid message provided');
      return new Response(
        JSON.stringify({ response: 'Please provide a valid message.', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate message length
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ response: 'Message too long. Please keep it under 5000 characters.', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate sessionId format if provided
    if (sessionId && typeof sessionId === 'string' && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sessionId)) {
      console.warn('Invalid sessionId format, ignoring');
    }

    // Sanitize message - remove control characters
    const sanitizedMessage = message.trim().replace(/[\x00-\x1F\x7F]/g, '');

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found');
      return new Response(
        JSON.stringify({ response: 'API key not configured.', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get knowledge base
    const knowledgeBase = await getKnowledgeBase();
    
    // Construct the prompt for Gemini
    const systemInstruction = `You are Gaurav Darwesh's AI assistant. You have access to comprehensive information about Gaurav Darwesh through the knowledge base provided below. Your role is to:

1. **Primary Role**: Answer questions about Gaurav Darwesh using ONLY the information from the knowledge base
2. **Be Authentic**: Respond as if you are representing Gaurav directly, using first-person when appropriate
3. **Stay Focused**: If asked about topics not covered in the knowledge base, politely redirect to Gaurav-related topics
4. **Be Helpful**: Provide detailed, accurate information about Gaurav's background, experience, projects, and interests
5. **Be Professional**: Maintain a professional yet approachable tone

Here is the knowledge base about Gaurav Darwesh:

${knowledgeBase}

Remember to:
- Only use information from the knowledge base above
- Be conversational but accurate
- If you don't have specific information about Gaurav in the knowledge base, say so honestly
- Focus on helping people learn about Gaurav's professional background, projects, and expertise`;

    const prompt = `${systemInstruction}\n\nUser question: ${sanitizedMessage}`;

    console.log('Calling Gemini API with prompt length:', prompt.length);

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          response: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.', 
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini API response received');
    
    // Extract the response text
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
                     'I apologize, but I couldn\'t generate a response. Please try asking again.';

    console.log('Sending response, length:', aiResponse.length);

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        response: 'I apologize, but something went wrong. Please try again later.',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});