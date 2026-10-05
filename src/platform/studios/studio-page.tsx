'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { useCrumbs } from '../shell/crumbs';
import { lastListHref } from './list-state';
import { StudioForm } from './studio-form';
import { changedBody, createBody, type StudioValues } from './studio-rules';
import { studioSchema, type Studio } from './studio-types';

const FAILED_TEXT = 'Something went wrong. Try again';

function valuesOf(studio: Studio): StudioValues {
  return {
    name: studio.name,
    subdomain: studio.subdomain,
    customDomain: studio.customDomain ?? '',
    ownerEmail: studio.owner.email,
  };
}

/**
 * The page of one studio: a new one (`/studios/new`) or an existing one
 * (`/studios/{id}`). After saving, and on "Back", the administrator returns
 * to the list with the search, filter and page he left.
 */
export function StudioPage({ id }: { id?: string }) {
  const router = useRouter();
  const [studio, setStudio] = useState<Studio | null>(null);

  useCrumbs([
    { label: 'Studios', href: lastListHref() },
    { label: id ? (studio?.name ?? '…') : 'New studio' },
  ]);

  useEffect(() => {
    if (!id) return;
    let current = true;
    getApi()
      .request<unknown>(`/studios/${id}`)
      .then((body) => {
        if (current) setStudio(studioSchema.parse(body));
      })
      .catch(() => {
        if (!current) return;
        notify.error(FAILED_TEXT);
        router.replace(lastListHref());
      });
    return () => {
      current = false;
    };
  }, [id, router]);

  const back = () => router.push(lastListHref());

  async function create(values: StudioValues) {
    await getApi().request('/studios', {
      method: 'POST',
      body: createBody(values),
    });
    notify.success('Studio created');
    router.push(lastListHref());
  }

  async function update(values: StudioValues) {
    if (!studio) return;
    await getApi().request(`/studios/${studio.id}`, {
      method: 'PATCH',
      body: changedBody(valuesOf(studio), values),
    });
    notify.success('Studio updated');
    router.push(lastListHref());
  }

  if (id && !studio) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LoaderCircle
          aria-label="Loading studio"
          className="size-5 animate-spin text-[var(--icons-primary-default)]"
        />
      </div>
    );
  }

  return (
    <StudioForm
      initial={studio ? valuesOf(studio) : undefined}
      status={studio?.status}
      onSave={studio ? update : create}
      onBack={back}
    />
  );
}
