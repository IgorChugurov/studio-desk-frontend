import { Suspense } from 'react';
import { HallList } from '../../../../studio/catalogs/hall-list';

export default function HallsPage() {
  return (
    <Suspense>
      <HallList />
    </Suspense>
  );
}
