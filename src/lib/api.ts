import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";

export interface VisualItem {
  url: string;
  title?: string;
}

export interface ChatResponse {
  response: string;
  success: boolean;
  debug?: any;
  visuals?: VisualItem[];
  suggestions?: string[];
  voice_response?: string;
  [key: string]: any;
}

export interface StreamChatHandlers {
  onStart?: () => void;
  onToken?: (chunk: string, accumulated: string) => void;
  onVisuals?: (visuals: VisualItem[]) => void;
  onAction?: (action: SiteAction) => void;
}

export interface SiteAction {
  type: "navigate";
  path: "/" | "/hobbies" | "/blog" | "/visuals" | "/others";
  section?: string;
  label?: string;
}

function normalizeVisuals(visuals: any): VisualItem[] {
  if (!visuals) return [];

  const items: VisualItem[] = [];
  const add = (url: unknown, title?: unknown) => {
    const value = String(url ?? "").trim();
    if (!/^https?:\/\//i.test(value)) return;
    items.push({
      url: value,
      title: String(title ?? "").trim() || undefined,
    });
  };

  if (Array.isArray(visuals)) {
    for (const item of visuals) {
      if (typeof item === "string") add(item, "Gaurav's Travels");
      else if (item && typeof item === "object") add(item.url, item.title);
    }
  }

  if (Array.isArray(visuals?.collections)) {
    for (const collection of visuals.collections) {
      const title = String(collection?.title ?? "").trim() || "Gaurav's Travels";
      const images = [
        ...(Array.isArray(collection?.imageUrls) ? collection.imageUrls : []),
        ...(Array.isArray(collection?.items) ? collection.items : []),
      ];

      for (const image of images) {
        if (typeof image === "string") add(image, title);
        else if (image && typeof image === "object") add(image.url, image.title || title);
      }
    }
  }

  if (Array.isArray(visuals?.image_urls)) {
    for (const image of visuals.image_urls) {
      if (typeof image === "string") add(image, "Gaurav's Travels");
      else if (image && typeof image === "object") add(image.url, image.title || "Gaurav's Travels");
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getEndpoint(): string {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");

  if (!url) throw new Error("VITE_SUPABASE_URL is missing.");
  return `${url}/functions/v1/bright-action`;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  if (!text) return `GDx request failed (${response.status}).`;

  try {
    const json = JSON.parse(text);
    return String(json?.error?.message || json?.error || json?.message || json?.response || text);
  } catch {
    return text;
  }
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function streamChatMessage(message: string, handlers: StreamChatHandlers = {}): Promise<ChatResponse> {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const anonKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

  if (!supabaseUrl || !anonKey) {
    throw new Error("GDx configuration is missing.");
  }

  let response: Response;

  try {
    response = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message: message.trim(),
        sessionId: getSessionId(),
        mode: "text",
        stream: true,
      }),
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to connect to GDx.");
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (!response.body) {
    throw new Error("GDx returned no streaming body.");
  }

  handlers.onStart?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let accumulated = "";
  let visuals: VisualItem[] = [];
  let finalPayload: any = null;
  let sawAnyToken = false;

  const emit = async (delta: string) => {
    if (!delta) return;
    accumulated += delta;
    sawAnyToken = true;
    handlers.onToken?.(delta, accumulated);

    // Let the browser paint before processing another queued provider event.
    // This does not delay or fake the stream; it prevents React from batching
    // a burst of real chunks into a single final render.
    await yieldToBrowser();
  };

  const handleEvent = async (raw: string) => {
    const dataLines = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));

    if (!dataLines.length) return;

    const data = dataLines.join("\n").trim();
    if (!data || data === "[DONE]") return;

    let payload: any;
    try {
      payload = JSON.parse(data);
    } catch {
      // Provider payloads are normally JSON SSE frames. Ignore anything
      // incomplete rather than terminating a healthy stream.
      return;
    }

    if (payload?.type === "error" || payload?.error) {
      throw new Error(
        typeof payload?.error === "string"
          ? payload.error
          : String(payload?.error?.message || payload?.message || "The AI provider returned an error."),
      );
    }

    if (payload?.type === "action" && payload?.action) {
      handlers.onAction?.(payload.action as SiteAction);
      return;
    }

    if (payload?.type === "visuals") {
      visuals = normalizeVisuals(payload.visuals);
      if (visuals.length) handlers.onVisuals?.(visuals);
      return;
    }

    if (payload?.type === "start") {
      handlers.onStart?.();
      return;
    }

    if (payload?.type === "final" || payload?.type === "done") {
      finalPayload = payload;

      if (typeof payload?.response === "string" && payload.response && payload.response !== accumulated) {
        const finalText = payload.response;
        const remaining = finalText.startsWith(accumulated) ? finalText.slice(accumulated.length) : finalText;
        await emit(remaining);
      }

      if (payload?.visuals) {
        visuals = normalizeVisuals(payload.visuals);
        if (visuals.length) handlers.onVisuals?.(visuals);
      }

      return;
    }

    let delta = "";

    if (payload?.type === "delta" || payload?.type === "token") {
      delta =
        typeof payload?.delta === "string" ? payload.delta : typeof payload?.text === "string" ? payload.text : "";
    }

    // Also support raw OpenAI-compatible provider events.
    if (!delta && typeof payload?.choices?.[0]?.delta?.content === "string") {
      delta = payload.choices[0].delta.content;
    }

    await emit(delta);
  };

  // We need sequential async event processing so each emitted token gets a
  // chance to paint before the next queued event is handled.
  const processBuffer = async (flush = false) => {
    while (true) {
      const match = /\r?\n\r?\n/.exec(buffer);

      if (!match || match.index < 0) break;

      const event = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      await handleEvent(event);
    }

    if (flush && buffer.trim()) {
      const tail = buffer;
      buffer = "";
      await handleEvent(tail);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      await processBuffer(false);
    }

    buffer += decoder.decode();
    await processBuffer(true);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("GDx streaming failed.");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // noop
    }
  }

  const responseText =
    typeof finalPayload?.response === "string" && finalPayload.response.trim() ? finalPayload.response : accumulated;

  if (!responseText.trim()) {
    throw new Error(sawAnyToken ? "GDx stream ended without a complete response." : "GDx returned an empty response.");
  }

  return {
    ...(finalPayload && typeof finalPayload === "object" ? finalPayload : {}),
    success: finalPayload?.success !== false,
    response: responseText,
    visuals,
    suggestions: Array.isArray(finalPayload?.suggestions) ? finalPayload.suggestions : [],
  };
}

/** Non-streaming compatibility path used by voice/TTS and other legacy callers. */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke("bright-action", {
    body: {
      message: message.trim(),
      sessionId: getSessionId(),
      mode: "text",
      stream: false,
    },
  });

  if (error) {
    throw new Error(error.message || "Edge function error");
  }

  return {
    ...(data && typeof data === "object" ? data : {}),
    success: data?.success !== false,
    response: typeof data?.response === "string" ? data.response : "No response generated",
    visuals: normalizeVisuals(data?.visuals),
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  };
}
