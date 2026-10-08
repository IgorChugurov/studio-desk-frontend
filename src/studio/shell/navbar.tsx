'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '../../shared/ui/avatar';
import { Breadcrumbs } from '../../shared/ui/breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';
import { Modal } from '../../shared/ui/modal';
import { Button } from '../../shared/ui/button';
import { getApi } from '../api/api';
import type { Session } from '../api/session-store';
import { copy, LANGUAGE_CHOICES, type Lang } from '../i18n/language';
import { firstSection, sectionPath, type SectionId } from '../sections';
import { useCurrentCrumbs } from './crumbs';

/** The blue bar and the studio switch window. */
export function Navbar({
  session,
  crumb,
}: {
  session: Extract<Session, { status: 'signed-in' }>;
  crumb: string;
}) {
  const texts = copy(session.language);
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const home = sectionPath(firstSection(session.sections));
  const reported = useCurrentCrumbs();
  const trail = reported.length > 0 ? reported : [{ label: crumb }];

  async function chooseLanguage(language: Lang) {
    await getApi().auth.setLanguage(language);
  }

  async function chooseStudio(studioId: string) {
    await getApi().auth.switchStudio(studioId);
    setSwitching(false);
    const next = getApi().session.get();
    if (next.status === 'signed-in') {
      router.push(sectionPath(firstSection(next.sections)));
    }
  }

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-[var(--space-400)] bg-[var(--primary-light-800)] px-4 sm:px-6">
      <Breadcrumbs
        items={[
          { label: session.studioName, href: home, hideOnMobile: true },
          ...trail,
        ]}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="shrink-0 cursor-pointer rounded-[var(--radius-full)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--white-with-opacity-700)]"
        >
          <Avatar name={session.email} onDark />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{session.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LANGUAGE_CHOICES.map((choice) => (
            <DropdownMenuItem
              key={choice.id}
              onSelect={() => void chooseLanguage(choice.id)}
            >
              {session.language === choice.id && (
                <Check aria-hidden className="size-4" />
              )}
              {choice.label}
            </DropdownMenuItem>
          ))}
          {session.studios.length > 1 && (
            <DropdownMenuItem onSelect={() => setSwitching(true)}>
              {texts.switchStudio}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void getApi().auth.signOut()}>
            {texts.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal
        open={switching}
        onOpenChange={setSwitching}
        title={texts.switchStudio}
        actions={null}
      >
        <ul className="flex flex-col gap-[var(--space-200)]">
          {session.studios.map((studio) => (
            <li key={studio.id}>
              <Button
                type="button"
                variant="outlined"
                size="lg"
                className="w-full"
                disabled={studio.id === session.studioId}
                onClick={() => void chooseStudio(studio.id)}
              >
                {studio.name}
              </Button>
            </li>
          ))}
        </ul>
      </Modal>
    </header>
  );
}

export function crumbFor(section: SectionId, language: Lang): string {
  const texts = copy(language);
  if (section === 'studio-settings') return texts.studioSettings;
  if (section === 'clients') return texts.clients;
  if (section === 'accounting') return texts.accounting;
  return texts[section];
}
