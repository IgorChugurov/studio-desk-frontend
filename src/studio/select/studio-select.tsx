'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../shared/ui/button';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import type { StudioRef } from '../api/auth-types';
import { copy, readLanguageCookie } from '../i18n/language';

/** The first-entry list. There is no session yet, and no navbar. */
export function StudioSelect({ studios }: { studios: StudioRef[] }) {
  const texts = copy(readLanguageCookie());
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function choose(studioId: string) {
    if (pending) return;
    setPending(studioId);
    try {
      await getApi().auth.selectStudio(studioId);
      router.replace('/');
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'INVALID_SELECTION_TICKET'
      ) {
        router.replace('/sign-in');
        return;
      }
      setPending(null);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[420px] flex-col gap-[var(--space-400)] rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)] p-[var(--space-600)]">
        <h1 className="font-[family-name:var(--heading-font-family)] text-[length:var(--body-sizeL)] font-[var(--heading-font-weight)]">
          {texts.chooseStudio}
        </h1>
        <ul className="flex flex-col gap-[var(--space-200)]">
          {studios.map((studio) => (
            <li key={studio.id}>
              <Button
                type="button"
                variant="outlined"
                size="lg"
                className="w-full"
                loading={pending === studio.id}
                onClick={() => void choose(studio.id)}
              >
                {studio.name}
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="text"
          size="md"
          onClick={() => {
            void getApi().auth.signOut();
            router.replace('/sign-in');
          }}
        >
          {texts.signOut}
        </Button>
      </div>
    </main>
  );
}
