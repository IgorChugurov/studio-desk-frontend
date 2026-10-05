import { Suspense } from 'react';
import { StudiosList } from '../../../platform/studios/studios-list';

/** The home page: the list of studios. */
export default function HomePage() {
  return (
    <Suspense>
      <StudiosList />
    </Suspense>
  );
}
