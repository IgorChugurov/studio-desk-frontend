'use client';

import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { CatalogTabs } from './catalog-tabs';

/** Trainers or Class types: the tab is selected and the page is empty. */
export function EmptyCatalogTab({ tab }: { tab: 'trainers' | 'class-types' }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const label = tab === 'trainers' ? texts.trainers : texts.classTypes;
  useCrumbs([{ label: texts.catalogs, href: '/catalogs' }, { label }]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs
        current={
          tab === 'trainers' ? '/catalogs/trainers' : '/catalogs/class-types'
        }
      />
    </div>
  );
}
