import { StudioPage } from '../../../../../platform/studios/studio-page';

/** Editing a studio. */
export default async function EditStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudioPage id={id} />;
}
