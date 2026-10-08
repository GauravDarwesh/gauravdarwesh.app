const STORAGE_KEY = "gd_ai_session_id";

/**
 * Retrieves or creates a unique session ID for the current user.
 * Stored in localStorage so the session persists across page reloads.
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}
