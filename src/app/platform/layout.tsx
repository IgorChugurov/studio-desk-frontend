import type { ReactNode } from 'react';
import { SessionProvider } from '../../platform/api/session-provider';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
