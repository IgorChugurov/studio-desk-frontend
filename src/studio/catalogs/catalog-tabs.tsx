'use client';

import { Tabs } from '../../shared/ui/tabs';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';

/** Halls, Trainers, and Class types under the Catalogs section tab. */
export function CatalogTabs({ current }: { current: string }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  return (
    <div className="px-[var(--space-400)] pt-[var(--space-300)]">
      <Tabs
        current={current}
        items={[
          { href: '/catalogs', label: texts.halls },
          { href: '/catalogs/trainers', label: texts.trainers },
          { href: '/catalogs/class-types', label: texts.classTypes },
        ]}
      />
    </div>
  );
}
