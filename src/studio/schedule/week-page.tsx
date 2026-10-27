'use client';

import { ScheduleBoard } from './schedule-board';
import { ScheduleTabs } from './schedule-tabs';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';

/** The Schedule tab: one week of slots. */
export function WeekPage() {
  const session = useSession();
  const language = session.status === 'signed-in' ? session.language : 'en';
  useCrumbs([{ label: copy(language).schedule }]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScheduleTabs current="schedule" />
      <ScheduleBoard />
    </div>
  );
}
