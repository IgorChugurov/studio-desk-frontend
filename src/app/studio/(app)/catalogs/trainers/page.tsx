import { Suspense } from 'react';
import { TrainerList } from '../../../../../studio/catalogs/trainer-list';

export default function TrainersPage() {
  return (
    <Suspense>
      <TrainerList />
    </Suspense>
  );
}
