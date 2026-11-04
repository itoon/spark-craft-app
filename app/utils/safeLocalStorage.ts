/**
 * `window.localStorage` or `null` — on the server, or when the browser blocks
 * storage (private mode, disabled site data), where even reading the property
 * can throw. Callers fall back to in-memory behaviour.
 */
export function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
