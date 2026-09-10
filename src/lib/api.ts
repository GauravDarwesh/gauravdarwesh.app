// src/lib/api.ts

import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const BRIGHT_ACTION_ENDPOINT = `${SUPABASE_URL}/functions/v1/bright-action`;

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
 * Streams the Bright Action response from the Edge Function using SSE.
 *
 * Backend events:
 *   { type: "start" }
 *   { type: "token", text: "..." }
 *   { type: "done", ... }
 *   { type: "error", error: "..." }
 */
export async function streamChatMessage(
  message: string,
  handlers: StreamChatHandlers = {},
): Promise<
  ChatResponse & {
    visuals?: Array<{ url: string; title?: string }>;
    suggestions?: string[];
  }
> {
  const sessionId = getSessionId();

  console.log("Starting streaming chat:", {
    message,
    sessionId,
  });

  try {
    const response = await fetch(BRIGHT_ACTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: message.trim(),
        sessionId,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(errorText || `Edge function returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Streaming response body is unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let fullResponse = "";
    let visuals: Array<{ url: string; title?: string }> | undefined;
    let suggestions: string[] = [];
    let finalData: any = null;

    const processEvent = (rawEvent: string) => {
      const lines = rawEvent.split(/\r?\n/);

      const dataLines = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart());

      if (dataLines.length === 0) {
        return;
      }

      const dataText = dataLines.join("\n");

      if (!dataText || dataText === "[DONE]") {
        return;
      }

      let payload: any;

      try {
        payload = JSON.parse(dataText);
      } catch (error) {
        console.warn("Unable to parse SSE payload:", dataText, error);
        return;
      }

      switch (payload?.type) {
        case "start":
          console.log("Streaming started");
          break;

        case "token": {
          const chunk = typeof payload.text === "string" ? payload.text : "";

          if (chunk) {
            fullResponse += chunk;

            // Fires immediately for every streamed chunk.
            handlers.onToken?.(chunk);
          }

          break;
        }

        case "done": {
          finalData = payload;

          if (typeof payload.response === "string") {
            fullResponse = payload.response;
          }

          visuals = Array.isArray(payload.visuals) ? payload.visuals : undefined;

          suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];

          // Visuals come only from the backend.
          if (visuals && visuals.length > 0) {
            handlers.onVisuals?.(visuals);
          }

          break;
        }

        case "error":
          throw new Error(payload.error || "The assistant is temporarily unavailable. Please try again shortly.");

        default:
          console.log("Unknown streaming event:", payload);
      }
    };

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      const events = buffer.split(/\r?\n\r?\n/);

      // Keep incomplete event for the next chunk.
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (event.trim()) {
          processEvent(event);
        }
      }
    }

    // Flush remaining decoder content.
    buffer += decoder.decode();

    if (buffer.trim()) {
      processEvent(buffer);
    }

    const result: ChatResponse = {
      response: fullResponse || finalData?.response || "No response generated",
      success: finalData?.success !== false,
      debug: finalData ?? undefined,
    };

    return {
      ...result,
      visuals,
      suggestions,
    };
  } catch (error) {
    console.error("Streaming chat API error:", error);

    return {
      response: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
      success: false,
      visuals: [],
      suggestions: [],
    };
  }
}

/**
 * Existing non-streaming chat request.
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const sessionId = getSessionId();

  console.log("Sending chat message:", {
    message,
    sessionId,
  });

  try {
    const { data, error } = await supabase.functions.invoke("bright-action", {
      body: {
        message: message.trim(),
        sessionId,
      },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message ?? "Edge function error");
    }

    console.log("Chat response data:", data);

    return {
      response: (data as any)?.response ?? "No response generated",
      success: true,
      debug: data,
    };
  } catch (error) {
    console.error("Chat API error:", error);

    return {
      response: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
      success: false,
    };
  }
}
