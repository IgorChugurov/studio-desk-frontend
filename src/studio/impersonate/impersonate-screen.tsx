'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { firstSection, sectionPath } from '../sections';

const EXPIRED =
  'This link has expired. Open the studio again from the platform admin';

function codeFromAddress(): string | null {
  const raw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const code = new URLSearchParams(raw).get('code');
  return code && code.length > 0 ? code : null;
}

/** Exchanges the handoff code from the address and opens the owner's first section. */
export function ImpersonateScreen() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const code = codeFromAddress();
    if (!code) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    let gone = false;
    void getApi()
      .auth.exchangeHandoff(code)
      .then(() => {
        if (gone) return;
        const session = getApi().session.get();
        const path =
          session.status === 'signed-in'
            ? sectionPath(firstSection(session.sections))
            : '/';
        router.replace(path);
      })
      .catch((error: unknown) => {
        if (gone) return;
        if (
          error instanceof ApiError &&
          error.code === 'INVALID_HANDOFF_CODE'
        ) {
          setFailed(true);
          return;
        }
        setFailed(true);
      });
    return () => {
      gone = true;
    };
  }, [router]);

  if (!failed) return null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <p className="max-w-md text-center text-[var(--text-gray-default)]">
        {EXPIRED}
      </p>
    </main>
  );
}
