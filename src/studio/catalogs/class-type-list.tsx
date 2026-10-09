'use client';

import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { NameRecordList } from './name-record-list';

/** Class types of this studio. */
export function ClassTypeList() {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  return (
    <NameRecordList
      listPath="/catalogs/class-types"
      apiPath="/class-types"
      tab="/catalogs/class-types"
      sectionLabel={texts.classTypes}
      addLabel={texts.addClassType}
      emptyLabel={texts.noClassTypes}
      emptySearchLabel={texts.noClassTypesFound}
    />
  );
}
