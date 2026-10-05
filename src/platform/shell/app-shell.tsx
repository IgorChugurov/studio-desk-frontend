'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { Navbar } from './navbar';

const CRUMBS = [{ label: 'Studios' }];

/**
 * The frame of every page after sign-in. It is exactly as tall as the screen:
 * the navbar is fixed on top, and the content below takes all the remaining
 * height. A list page keeps its table inside and scrolls the table; a page
 * with a form scrolls its own content (`overflow-y-auto`).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'signed-out') router.replace('/sign-in');
  }, [session.status, router]);

  if (session.status !== 'signed-in') return null;

  return (
    <div className="flex h-dvh flex-col">
      <Navbar
        email={session.email}
        crumbs={CRUMBS}
        onSignOut={() => void getApi().auth.signOut()}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
