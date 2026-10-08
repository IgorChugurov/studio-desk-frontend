'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs } from '../../shared/ui/tabs';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { SECTION_ORDER, sectionPath, type SectionId } from '../sections';
import { crumbFor, Navbar } from './navbar';
import { CrumbsProvider } from './crumbs';

/** The frame after sign-in: navbar, section tabs, then the page. */
export function AppShell({
  section,
  children,
}: {
  section: SectionId;
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'signed-out') router.replace('/sign-in');
  }, [session.status, router]);

  if (session.status !== 'signed-in') return null;

  const texts = copy(session.language);
  const allowed = SECTION_ORDER.filter((id) => session.sections.includes(id));
  if (!session.sections.includes(section)) {
    return (
      <div className="flex h-dvh flex-col">
        <Navbar session={session} crumb={crumbFor(section, session.language)} />
        <p className="p-[var(--space-600)] text-[var(--text-gray-default)]">
          {texts.noAccess}
        </p>
      </div>
    );
  }

  return (
    <CrumbsProvider>
      <div className="flex h-dvh flex-col">
        <Navbar session={session} crumb={crumbFor(section, session.language)} />
        <div className="px-[var(--space-400)] pt-[var(--space-300)]">
          <Tabs
            current={sectionPath(section)}
            items={allowed.map((id) => ({
              href: sectionPath(id),
              label: crumbFor(id, session.language),
            }))}
          />
        </div>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </CrumbsProvider>
  );
}
