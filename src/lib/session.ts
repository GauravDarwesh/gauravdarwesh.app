// src/lib/session.ts
export function getSessionId(): string {
  let sessionId = localStorage.getItem("gd_ai_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID(); // built-in UUID generator
    localStorage.setItem("gd_ai_session_id", sessionId);
  }
  return sessionId;
}