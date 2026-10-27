'use client';

import { Tabs } from '../../shared/ui/tabs';
import { useSession } from '../api/session-provider';
import { sortedTypes, typeLabel, typePath } from './resource-types';

/** One tab per resource type, in the organization's order and language. */
export function CatalogTabs({ current }: { current: string }) {
  const session = useSession();
  if (session.status !== 'signed-in') return null;
  const types = sortedTypes(session.config.catalogConfig.resourceTypes);
  return (
    <div className="px-[var(--space-400)] pt-[var(--space-300)]">
      <Tabs
        current={current}
        items={types.map((type) => ({
          href: typePath(type.id),
          label: typeLabel(type, session.language, 'plural'),
        }))}
      />
    </div>
  );
}
