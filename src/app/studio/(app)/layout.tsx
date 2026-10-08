'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '../../../studio/shell/app-shell';
import { sectionFromPath } from '../../../studio/sections';

export default function SignedInLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = sectionFromPath(pathname.split('/').filter(Boolean)[0] ?? '');
  if (!section) return children;
  return <AppShell section={section}>{children}</AppShell>;
}
