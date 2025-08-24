// src/lib/session.ts

/**
 * Retrieves or creates a unique session ID for the current user.
 * Stored in localStorage so the session persists across page reloads.
 */
export function getSessionId(): string {
  const STORAGE_KEY = "gd_ai_session_id";

  // Try to read an existing session ID from localStorage
  let sessionId = localStorage.getItem(STORAGE_KEY);

  // If none exists, create a new one
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}
