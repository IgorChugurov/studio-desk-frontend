'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { Tabs } from '../../shared/ui/tabs';
import { CrumbsProvider } from './crumbs';
import { Navbar } from './navbar';

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
    <CrumbsProvider>
      <div className="flex h-dvh flex-col">
        <Navbar
          email={session.email}
          onSignOut={() => void getApi().auth.signOut()}
        />
        <PlatformTabs />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </CrumbsProvider>
  );
}

/** Organizations and Presets, under the navbar. */
function PlatformTabs() {
  const pathname = usePathname().replace(/^\/platform(?=\/|$)/, '') || '/';
  const current = pathname.startsWith('/presets') ? '/presets' : '/';
  return (
    <div className="px-[var(--space-400)] pt-[var(--space-300)]">
      <Tabs
        current={current}
        items={[
          { href: '/', label: 'Organizations' },
          { href: '/presets', label: 'Presets' },
        ]}
      />
    </div>
  );
}
