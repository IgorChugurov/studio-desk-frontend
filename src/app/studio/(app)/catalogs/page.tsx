import { Suspense } from 'react';
import { ResourceList } from '../../../../studio/catalogs/resource-list';

export default function CatalogsPage() {
  return (
    <Suspense>
      <ResourceList />
    </Suspense>
  );
}
