import { getSessionId } from "./session";

export async function sendChatMessage(message: string) {
  const sessionId = getSessionId();

  const res = await fetch("/api/bright-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId })
  });

  return res.json();
}
