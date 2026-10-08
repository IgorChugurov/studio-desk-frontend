'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../studio/api/session-provider';
import { firstSection, sectionPath } from '../../../studio/sections';

/** Opens the first section this person can use. */
export default function StudioHomePage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === 'signed-out') router.replace('/sign-in');
    if (session.status === 'signed-in') {
      router.replace(sectionPath(firstSection(session.sections)));
    }
  }, [session, router]);

  return null;
}
