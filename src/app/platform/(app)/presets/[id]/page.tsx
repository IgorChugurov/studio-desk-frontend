import { PresetPage } from '../../../../../platform/presets/preset-page';

export default async function EditPresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PresetPage id={id} />;
}
