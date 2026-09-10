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

  const addVisual = (urlValue: unknown, titleValue?: unknown) => {
    const normalizedUrl = String(urlValue ?? "").trim();

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      return;
    }

    items.push({
      url: normalizedUrl,
      title: String(titleValue ?? "").trim() || undefined,
    });
  };

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

      /*
       * Primary format:
       *
       * imageUrls: ["url1", "url2"]
       */
      if (Array.isArray(collection?.imageUrls)) {
        for (const image of collection.imageUrls) {
          /*
           * Support both:
           *
           * "https://..."
           *
           * and, defensively:
           *
           * { url: "https://...", title: "..." }
           */
          if (typeof image === "object" && image !== null) {
            addVisual((image as any)?.url, (image as any)?.title ?? title);
          } else {
            addVisual(image, title);
          }
        }
      }

      /*
       * Compatibility with a collection using `items`.
       */
      if (Array.isArray(collection?.items)) {
        for (const image of collection.items) {
          if (typeof image === "object" && image !== null) {
            addVisual((image as any)?.url, (image as any)?.title ?? title);
          } else {
            addVisual(image, title);
          }
        }
      }
    }
  }

  /*
   * Fallback for the flattened image_urls format.
   */
  if (Array.isArray(visuals?.image_urls)) {
    for (const image of visuals.image_urls) {
      if (typeof image === "object" && image !== null) {
        addVisual((image as any)?.url, (image as any)?.title ?? "Gaurav's Travels");
      } else {
        addVisual(image, "Gaurav's Travels");
      }
    }
  }

  /*
   * Compatibility with an already-flat visual array:
   *
   * [
   *   { url: "...", title: "..." },
   *   { url: "...", title: "..." }
   * ]
   *
   * or:
   *
   * [
   *   "https://..."
   * ]
   */
  if (Array.isArray(visuals)) {
    for (const item of visuals) {
      if (item && typeof item === "object") {
        addVisual((item as any)?.url, (item as any)?.title);
      } else if (typeof item === "string") {
        addVisual(item, "Gaurav's Travels");
      }
    }
  }

  /*
   * Remove duplicate image URLs.
   */
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.url.trim().toLowerCase();

    if (!key || seen.has(key)) {
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
    const rawVisuals = (data as any)?.visuals;

    console.log("Raw visuals from Edge Function:", rawVisuals);

    const visuals = normalizeVisuals(rawVisuals);

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
