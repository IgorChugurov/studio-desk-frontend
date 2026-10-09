import { ClassTypeForm } from '../../../../../../studio/catalogs/class-type-form';

export default async function EditClassTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassTypeForm classTypeId={id} />;
}
