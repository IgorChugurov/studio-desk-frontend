import { ResourceForm } from '../../../../../../studio/catalogs/resource-form';

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ typeId: string; resourceId: string }>;
}) {
  const { typeId, resourceId } = await params;
  return <ResourceForm typeId={typeId} resourceId={resourceId} />;
}
