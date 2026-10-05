export type Session =
  | { status: 'loading' }
  | { status: 'signed-out'; reason?: 'expired' }
  | { status: 'signed-in'; email: string };

/**
 * State of the session for the screens. The access token is NOT here: it
 * lives in a variable inside the API client and is never stored anywhere.
 */
export function createSessionStore() {
  let state: Session = { status: 'loading' };
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set(next: Session) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
