export type Session =
  | { status: 'loading' }
  | { status: 'signed-out'; reason?: 'expired' }
  | {
      status: 'signed-in';
      email: string;
      studioId: string;
      studioName: string;
      language: 'en' | 'sk' | 'uk';
      sections: string[];
      studios: { id: string; name: string }[];
    };

/** Session state for the screens. The access token is not stored here. */
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
