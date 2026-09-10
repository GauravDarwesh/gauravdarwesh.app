// src/lib/api.ts

import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";

export interface VisualItem {
  url: string;
  title?: string;
}

export interface ChatResponse {
  response: string;
  success: boolean;
  debug?: object;
  visuals?: VisualItem[];
  suggestions?: string[];
}

export interface StreamChatHandlers {
  onToken?: (chunk: string) => void;
  onVisuals?: (visuals: VisualItem[]) => void;
}

/**
 * Normalize all visual formats returned by the Edge Function
 * into the single format expected by the SearchBar.
 */
function normalizeVisuals(visuals: any): VisualItem[] {
  if (!visuals) return [];

  const items: VisualItem[] = [];

  /*
   * Current backend format:
   *
   * {
   *   type: "travel",
   *   collections: [
   *     {
   *       title: "Japan 2025 Collection",
   *       year: 2025,
   *       imageUrls: ["url1", "url2", ...]
   *     }
   *   ],
   *   image_urls: ["url1", "url2", ...]
   * }
   */
  if (Array.isArray(visuals?.collections)) {
    for (const collection of visuals.collections) {
      const title = String(collection?.title ?? "").trim() || undefined;

      const imageUrls = Array.isArray(collection?.imageUrls)
        ? collection.imageUrls
        : Array.isArray(collection?.items)
          ? collection.items
          : [];

      for (const url of imageUrls) {
        const normalizedUrl = String(url ?? "").trim();

        if (!/^https?:\/\//i.test(normalizedUrl)) continue;

        items.push({
          url: normalizedUrl,
          title,
        });
      }
    }
  }

  /*
   * Fallback for the flattened image_urls format.
   */
  if (items.length === 0 && Array.isArray(visuals?.image_urls)) {
    for (const url of visuals.image_urls) {
      const normalizedUrl = String(url ?? "").trim();

      if (!/^https?:\/\//i.test(normalizedUrl)) continue;

      items.push({
        url: normalizedUrl,
        title: "Gaurav's Travels",
      });
    }
  }

  /*
   * Compatibility with an already-flat visual array:
   *
   * [
   *   { url: "...", title: "..." },
   *   { url: "...", title: "..." }
   * ]
   */
  if (items.length === 0 && Array.isArray(visuals)) {
    for (const item of visuals) {
      if (item && typeof item === "object" && typeof item.url === "string") {
        const url = item.url.trim();

        if (!/^https?:\/\//i.test(url)) continue;

        items.push({
          url,
          title: String(item.title ?? "").trim() || undefined,
        });
      } else if (typeof item === "string") {
        const url = item.trim();

        if (!/^https?:\/\//i.test(url)) continue;

        items.push({
          url,
          title: "Gaurav's Travels",
        });
      }
    }
  }

  /*
   * Remove duplicate image URLs.
   */
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.url.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Complete-response helper.
 *
 * The historical function name is kept so the rest of the app
 * does not need to change.
 *
 * It intentionally waits for the complete Edge Function response
 * before exposing the answer and visuals to the SearchBar.
 */
export async function streamChatMessage(message: string, handlers: StreamChatHandlers = {}): Promise<ChatResponse> {
  const result = await sendChatMessage(message);

  if (result.response) {
    handlers.onToken?.(result.response);
  }

  if (result.visuals && result.visuals.length > 0) {
    handlers.onVisuals?.(result.visuals);
  }

  return result;
}

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

    /*
     * IMPORTANT:
     *
     * The Edge Function returns visuals on:
     *
     *   data.visuals
     *
     * Normalize that structure and expose it directly as:
     *
     *   result.visuals
     *
     * This is what SearchBar reads.
     */
    const visuals = normalizeVisuals((data as any)?.visuals);

    const suggestions = Array.isArray((data as any)?.suggestions) ? (data as any).suggestions : [];

    console.log("Normalized visuals:", visuals);

    return {
      response: (data as any)?.response ?? "No response generated",

      success: true,

      /*
       * Preserve the complete raw backend response for
       * debugging and compatibility.
       */
      debug: data,

      /*
       * This is the important part:
       * SearchBar can now access result.visuals directly.
       */
      visuals,

      suggestions,
    };
  } catch (error) {
    console.error("Chat API error:", error);

    return {
      response: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,

      success: false,

      visuals: [],

      suggestions: [],
    };
  }
}
