import { Suspense } from 'react';
import { PresetsList } from '../../../../platform/presets/presets-list';

export default function PresetsPage() {
  return (
    <Suspense>
      <PresetsList />
    </Suspense>
  );
}
