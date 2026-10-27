import { Suspense } from 'react';
import { ResourceList } from '../../../../../studio/catalogs/resource-list';

export default async function ResourceTypePage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = await params;
  return (
    <Suspense>
      <ResourceList typeId={typeId} />
    </Suspense>
  );
}
