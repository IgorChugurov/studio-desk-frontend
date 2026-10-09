import { Suspense } from 'react';
import { ClassTypeList } from '../../../../../studio/catalogs/class-type-list';

export default function ClassTypesPage() {
  return (
    <Suspense>
      <ClassTypeList />
    </Suspense>
  );
}
