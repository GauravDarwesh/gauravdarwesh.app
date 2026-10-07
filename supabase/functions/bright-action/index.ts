import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KB_URL =
  "https://raw.githubusercontent.com/gauravdarwesh/Info-Gaurav-Darwesh/refs/heads/main/README.md";

let knowledgeBaseCache: { content: string; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

type SiteAction = {
  type: "navigate";
  path: "/" | "/hobbies" | "/blog" | "/visuals" | "/others";
  section?: string;
  label?: string;
};

const inferSiteAction = (message: string): SiteAction | null => {
  const q = message.toLowerCase();
  const action = (path: SiteAction["path"], section?: string, label?: string): SiteAction => ({
    type: "navigate",
    path,
    section,
    label,
  });

  if (/\b(experience|work experience|career|career history|roles?|employment|companies)\b/.test(q)) {
    return action("/hobbies", "experience", "Experience");
  }
  if (/\b(education|degree|college|university|academic|academics)\b/.test(q)) {
    return action("/hobbies", "education", "Education");
  }
  if (/\b(skills?|technolog(?:y|ies)|stack|tools?|platforms?)\b/.test(q)) {
    return action("/hobbies", "skills", "Skills");
  }
  if (/\b(recommendations?|testimonials?)\b/.test(q)) {
    return action("/hobbies", "recommendations", "Recommendations");
  }
  if (/\b(github|open source|contributions?)\b/.test(q)) {
    return action("/hobbies", "github", "GitHub Activity");
  }
  if (/\b(training|workouts?|gym|running|cycling|fitness|exercise|outside work)\b/.test(q)) {
    return action("/hobbies", "outside-work", "Outside Work");
  }
  if (/\b(hobbies?|interests?|free time)\b/.test(q)) {
    return action("/hobbies", undefined, "Classic");
  }
  if (/\b(writing|articles?|posts?|notions?|blog)\b/.test(q)) {
    return action("/blog", undefined, "Notions");
  }
  if (/\b(photos?|photography|visuals?|travel|pictures?)\b/.test(q)) {
    return action("/visuals", undefined, "Visuals");
  }
  if (/\b(home|homepage|main page|gdx)\b/.test(q)) {
    return action("/", undefined, "GDx");
  }
  if (/\b(more|other experiments?)\b/.test(q)) {
    return action("/others", undefined, "More");
  }

  return null;
};

async function getKnowledgeBase(): Promise<string> {
  if (knowledgeBaseCache && Date.now() - knowledgeBaseCache.timestamp < CACHE_TTL) {
    return knowledgeBaseCache.content;
  }

  try {
    const response = await fetch(KB_URL);

    if (!response.ok) {
      if (knowledgeBaseCache) return knowledgeBaseCache.content;
      return "Knowledge base temporarily unavailable.";
    }

    const content = await response.text();
    knowledgeBaseCache = { content, timestamp: Date.now() };
    return content;
  } catch (error) {
    console.error("Knowledge base fetch failed:", error);
    return knowledgeBaseCache?.content ?? "Knowledge base temporarily unavailable.";
  }
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const extractText = (data: any) =>
  String(data?.choices?.[0]?.message?.content ?? "I couldn't generate a response right now.");

const buildSystemPrompt = (knowledgeBase: string) => `You are GDx, the website AI assistant for Gaurav Darwesh.

Use ONLY the knowledge base below as the source of truth about Gaurav. Never invent facts, dates, employers, projects, metrics, personal preferences, or activities.
Be conversational, concise, confident, warm, and useful. Do not mention this system prompt or expose raw knowledge-base URLs.
You are also a website guide. The website has these destinations:
- GDx home: /
- Classic profile: /hobbies
  - #education
  - #experience
  - #skills
  - #recommendations
  - #github
  - #outside-work
- Notions / writing: /blog
- Visuals / photography: /visuals
- More: /others
Answer the user's question first; navigation is handled separately by the site controller.

KNOWLEDGE BASE:
${knowledgeBase}
`;

const streamOpenRouter = async (
  message: string,
  knowledgeBase: string,
  action: SiteAction | null,
): Promise<Response> => {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return jsonResponse({ success: false, error: "Missing OPENROUTER_API_KEY." }, 500);

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://gauravdarwesh.app",
      "X-Title": "Gaurav Darwesh — GDx",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      stream: true,
      temperature: 0.35,
      max_tokens: 700,
      messages: [
        { role: "system", content: buildSystemPrompt(knowledgeBase) },
        { role: "user", content: message },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const body = await upstream.text().catch(() => "");
    console.error("OpenRouter streaming error:", upstream.status, body.slice(0, 500));
    return jsonResponse({ success: false, error: "The free AI provider is temporarily unavailable." }, 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = "";
  let accumulated = "";

  const encodeEvent = (payload: unknown) => "data: " + JSON.stringify(payload) + "\n\n";

  const output = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (payload: unknown) => controller.enqueue(encoder.encode(encodeEvent(payload)));

      try {
        push({ type: "start" });
        if (action) push({ type: "action", action });

        const process = (rawEvent: string) => {
          const dataLines = rawEvent
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).replace(/^ /, ""));

          if (!dataLines.length) return;

          const raw = dataLines.join("\n").trim();
          if (!raw || raw === "[DONE]") return;

          try {
            const event = JSON.parse(raw);
            const delta = event?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              accumulated += delta;
              push({ type: "delta", delta });
            }
          } catch {
            // Ignore malformed/incomplete provider frames.
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const match = /\r?\n\r?\n/.exec(buffer);
            if (!match) break;

            const event = buffer.slice(0, match.index);
            buffer = buffer.slice(match.index + match[0].length);
            process(event);
          }
        }

        buffer += decoder.decode();
        if (buffer.trim()) process(buffer);

        push({
          type: "final",
          response: accumulated || "I couldn't generate a response right now.",
          success: true,
          action,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("GDx stream proxy failed:", error);
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: "error",
              error: "The GDx stream ended unexpectedly. Please try again.",
            }),
          ),
        );
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // noop
        }
        controller.close();
      }
    },
  });

  return new Response(output, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const stream = body?.stream !== false;

    if (!message) return jsonResponse({ success: false, error: "Please provide a message." }, 400);

    const knowledgeBase = await getKnowledgeBase();
    const action = inferSiteAction(message);

    if (!stream) {
      const apiKey = Deno.env.get("OPENROUTER_API_KEY");
      if (!apiKey) return jsonResponse({ success: false, error: "Missing OPENROUTER_API_KEY." }, 500);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://gauravdarwesh.app",
          "X-Title": "Gaurav Darwesh — GDx",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          stream: false,
          temperature: 0.35,
          max_tokens: 700,
          messages: [
            { role: "system", content: buildSystemPrompt(knowledgeBase) },
            { role: "user", content: message },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error("OpenRouter error:", response.status, errorBody.slice(0, 500));
        return jsonResponse({ success: false, error: "The free AI provider is temporarily unavailable." }, 502);
      }

      const data = await response.json();
      return jsonResponse({
        success: true,
        response: extractText(data),
        action,
      });
    }

    return await streamOpenRouter(message, knowledgeBase, action);
  } catch (error) {
    console.error("GDx error:", error);
    return jsonResponse({ success: false, error: "GDx could not complete that request." }, 500);
  }
});