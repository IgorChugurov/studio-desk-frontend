import { HallForm } from '../../../../../studio/catalogs/hall-form';

export default async function EditHallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HallForm hallId={id} />;
}
