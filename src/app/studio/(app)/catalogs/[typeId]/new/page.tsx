import { ResourceForm } from '../../../../../../studio/catalogs/resource-form';

export default async function NewResourcePage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = await params;
  return <ResourceForm typeId={typeId} />;
}
