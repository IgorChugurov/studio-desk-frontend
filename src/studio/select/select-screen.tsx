'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { StudioSelect } from './studio-select';

/** Shows the studio list only while a selection ticket is held in memory. */
export function SelectScreen() {
  const session = useSession();
  const router = useRouter();
  const studios =
    session.status === 'signed-out'
      ? (getApi().selection()?.studios ?? null)
      : null;

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'signed-in') router.replace('/');
    else if (!getApi().selection()) router.replace('/sign-in');
  }, [session.status, router]);

  if (!studios) return null;
  return <StudioSelect studios={studios} />;
}
