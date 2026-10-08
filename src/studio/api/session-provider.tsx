'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { getApi } from './api';
import type { Session } from './session-store';

const LOADING: Session = { status: 'loading' };

/** Starts the session on page load: one token refresh. */
export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void getApi().initSession();
  }, []);
  return children;
}

export function useSession(): Session {
  return useSyncExternalStore(
    (listener) => getApi().session.subscribe(listener),
    () => getApi().session.get(),
    () => LOADING,
  );
}
