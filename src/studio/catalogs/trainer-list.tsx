'use client';

import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { NameRecordList } from './name-record-list';

/** Trainers of this studio. */
export function TrainerList() {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  return (
    <NameRecordList
      listPath="/catalogs/trainers"
      apiPath="/trainers"
      tab="/catalogs/trainers"
      sectionLabel={texts.trainers}
      addLabel={texts.addTrainer}
      emptyLabel={texts.noTrainers}
      emptySearchLabel={texts.noTrainersFound}
    />
  );
}
