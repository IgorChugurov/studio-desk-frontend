import { StudioPage } from '../../../../../platform/studios/studio-page';

/** Editing an organization. */
export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudioPage id={id} />;
}
