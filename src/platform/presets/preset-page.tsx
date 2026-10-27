'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { notify } from '../../shared/ui/toaster';
import {
  lockResourceType,
  nextClientId,
  placeDraft,
  type ResourceTypeDraft,
} from '../../shared/organization-config';
import { getApi } from '../api/api';
import { useCrumbs } from '../shell/crumbs';
import { lastPresetListHref } from './list-state';
import { PresetForm } from './preset-form';
import { presetBody, type PresetValues } from './preset-rules';
import { presetSchema, type Preset } from './preset-types';

const FAILED_TEXT = 'Something went wrong. Try again';

function valuesOf(preset: Preset): PresetValues {
  const resourceTypes: ResourceTypeDraft[] =
    preset.catalogConfig.resourceTypes.map((type) =>
      lockResourceType({
        ...type,
        clientId: nextClientId(),
      }),
    );
  return {
    name: preset.name,
    description: preset.description ?? '',
    sections: preset.sections,
    schedule: preset.scheduleConfig,
    billing: preset.billingConfig,
    resourceTypes:
      resourceTypes.length > 0 ? resourceTypes : [placeDraft('place')],
  };
}

/** A new preset (`/presets/new`) or an existing one (`/presets/{id}`). */
export function PresetPage({ id }: { id?: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<Preset | null>(null);
  const backHref = lastPresetListHref();

  useCrumbs([
    { label: 'Presets', href: backHref },
    { label: id ? (preset?.name ?? '…') : 'New preset' },
  ]);

  useEffect(() => {
    if (!id) return;
    let current = true;
    getApi()
      .request<unknown>(`/presets/${id}`)
      .then((body) => {
        if (current) setPreset(presetSchema.parse(body));
      })
      .catch(() => {
        if (!current) return;
        notify.error(FAILED_TEXT);
        router.replace(backHref);
      });
    return () => {
      current = false;
    };
  }, [id, router, backHref]);

  const back = () => router.push(backHref);

  async function create(values: PresetValues) {
    await getApi().request('/presets', {
      method: 'POST',
      body: presetBody(values),
    });
    notify.success('Preset created');
    router.push(backHref);
  }

  async function update(values: PresetValues) {
    if (!preset) return;
    await getApi().request(`/presets/${preset.id}`, {
      method: 'PATCH',
      body: presetBody(values),
    });
    notify.success('Preset updated');
    router.push(backHref);
  }

  if (id && !preset) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LoaderCircle
          aria-label="Loading preset"
          className="size-5 animate-spin text-[var(--icons-primary-default)]"
        />
      </div>
    );
  }

  const initial = preset ? valuesOf(preset) : undefined;

  return (
    <PresetForm initial={initial} onSave={id ? update : create} onBack={back} />
  );
}
