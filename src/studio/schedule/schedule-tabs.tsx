'use client';

import { Tabs } from '../../shared/ui/tabs';
import { texts } from './texts';

/** Schedule and Templates under the Schedule section tab. */
export function ScheduleTabs({
  current,
}: {
  current: 'schedule' | 'templates';
}) {
  return (
    <div className="px-[var(--space-400)] pt-[var(--space-300)]">
      <Tabs
        current={current === 'schedule' ? '/schedule' : '/schedule/templates'}
        items={[
          { href: '/schedule', label: texts.schedule },
          { href: '/schedule/templates', label: texts.templates },
        ]}
      />
    </div>
  );
}
