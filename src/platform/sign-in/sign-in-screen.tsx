'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { SignInForm } from './sign-in-form';

/** The sign-in page: waits for the session check, then shows the form. */
export function SignInScreen() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'signed-in') router.replace('/');
  }, [session.status, router]);

  if (session.status !== 'signed-out') return null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <SignInForm
        auth={getApi().auth}
        sessionExpired={session.reason === 'expired'}
      />
    </main>
  );
}
