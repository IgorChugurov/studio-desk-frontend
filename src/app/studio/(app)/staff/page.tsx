import { Suspense } from 'react';
import { StaffList } from '../../../../studio/staff/staff-list';

export default function StaffPage() {
  return (
    <Suspense>
      <StaffList />
    </Suspense>
  );
}
