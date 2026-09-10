// src/lib/api.ts
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "./session";

export interface ChatResponse {
  response: string;
  success: boolean;
  debug?: object;
}

export interface StreamChatHandlers {
  onToken?: (chunk: string) => void;
  onVisuals?: (visuals: Array<{ url: string; title?: string }>) => void;
}

type VisualItem = {
  url: string;
  title?: string;
};

/**
 * Gets the complete response first, then exposes any backend-provided
 * visual URLs in the flat format expected by the SearchBar.
 *
 * This intentionally does NOT stream tokens. The SearchBar should wait
 * for the complete backend response before expanding.
 */
export async function streamChatMessage(
  message: string,
  handlers: StreamChatHandlers = {},
): Promise<
  ChatResponse & {
    visuals?: VisualItem[];
    suggestions?: string[];
  }
> {
  const result = await sendChatMessage(message);

  const data = (result.debug ?? {}) as any;

  /*
   * Backend format:
   *
   * visuals: [
   *   {
   *     title: "Europe 2016 Collection",
   *     items: ["url1", "url2", ...]
   *   }
   * ]
   *
   * Frontend format:
   *
   * [
   *   { url: "url1", title: "Europe 2016 Collection" },
   *   { url: "url2", title: "Europe 2016 Collection" }
   * ]
   */
  const visuals: VisualItem[] = Array.isArray(data?.visuals)
    ? data.visuals
        .flatMap((collection: any) => {
          if (collection && typeof collection === "object" && Array.isArray(collection.items)) {
            const title = String(collection.title ?? "").trim() || undefined;

            return collection.items.map((url: unknown) => ({
              url: String(url ?? "").trim(),
              title,
            }));
          }

          /*
           * Keep compatibility in case the backend ever returns
           * already-flattened visual objects.
           */
          if (collection && typeof collection === "object" && typeof collection.url === "string") {
            return [
              {
                url: collection.url.trim(),
                title: String(collection.title ?? "").trim() || undefined,
              },
            ];
          }

          if (typeof collection === "string") {
            return [
              {
                url: collection.trim(),
              },
            ];
          }

          return [];
        })
        .filter((item: VisualItem) => /^https?:\/\//i.test(item.url))
    : [];

  if (result.response) {
    handlers.onToken?.(result.response);
  }

  if (visuals.length > 0) {
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
