import { TrainerForm } from '../../../../../../studio/catalogs/trainer-form';

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TrainerForm trainerId={id} />;
}
