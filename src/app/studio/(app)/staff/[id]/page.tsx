import { StaffForm } from '../../../../../studio/staff/staff-form';

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffForm memberId={id} />;
}
