import type { ReactNode } from 'react';
import { SessionProvider } from '../../studio/api/session-provider';

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
