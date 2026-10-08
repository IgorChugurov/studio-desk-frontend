'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { SignInForm } from './sign-in-form';

/** Waits for the session check, then shows the sign-in form. */
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
        onSignedIn={(result) =>
          router.replace(result === 'select' ? '/select' : '/')
        }
      />
    </main>
  );
}
