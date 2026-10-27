import type { OrganizationConfig } from './auth-types';

export type Session =
  | { status: 'loading' }
  | { status: 'signed-out'; reason?: 'expired' }
  | {
      status: 'signed-in';
      email: string;
      organizationId: string;
      organizationName: string;
      language: 'en' | 'sk' | 'uk';
      sections: string[];
      organizations: { id: string; name: string }[];
      config: OrganizationConfig;
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
