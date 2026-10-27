'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { useCrumbs } from '../shell/crumbs';
import { lastListHref } from './list-state';
import { StudioForm } from './studio-form';
import { changedBody, createBody, type StudioValues } from './studio-rules';
import { organizationSchema, type Organization } from './studio-types';
import { useStudioActions } from './use-studio-actions';

const FAILED_TEXT = 'Something went wrong. Try again';

const presetPageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  meta: z.object({ totalPages: z.number() }),
});

function valuesOf(organization: Organization): StudioValues {
  return {
    name: organization.name,
    subdomain: organization.subdomain,
    customDomain: organization.customDomain ?? '',
    ownerEmail: organization.owner.email,
    presetId: organization.preset.id ?? '',
    presetName: organization.preset.name,
    sections: organization.sections,
  };
}

async function loadPresets(): Promise<{ id: string; name: string }[]> {
  const items: { id: string; name: string }[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = presetPageSchema.parse(
      await getApi().request<unknown>(
        `/presets?currentPage=${page}&perPage=100&sortBy=name`,
      ),
    );
    items.push(...body.items);
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return items;
}

/**
 * The page of one organization: a new one (`/organizations/new`) or an existing
 * one (`/organizations/{id}`). After saving, and on "Back", the administrator
 * returns to the list with the search, filter and page he left.
 */
export function StudioPage({ id }: { id?: string }) {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [presets, setPresets] = useState<{ id: string; name: string }[] | null>(
    id ? [] : null,
  );
  const actions = useStudioActions(setOrganization);

  useCrumbs([
    { label: 'Organizations', href: lastListHref() },
    { label: id ? (organization?.name ?? '…') : 'New organization' },
  ]);

  useEffect(() => {
    if (id) return;
    let current = true;
    loadPresets()
      .then((items) => {
        if (current) setPresets(items);
      })
      .catch(() => {
        if (!current) return;
        notify.error(FAILED_TEXT);
        setPresets([]);
      });
    return () => {
      current = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let current = true;
    getApi()
      .request<unknown>(`/organizations/${id}`)
      .then((body) => {
        if (current) setOrganization(organizationSchema.parse(body));
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
    await getApi().request('/organizations', {
      method: 'POST',
      body: createBody(values),
    });
    notify.success('Organization created');
    router.push(lastListHref());
  }

  async function update(values: StudioValues) {
    if (!organization) return;
    await getApi().request(`/organizations/${organization.id}`, {
      method: 'PATCH',
      body: changedBody(valuesOf(organization), values),
    });
    notify.success('Organization updated');
    router.push(lastListHref());
  }

  if ((id && !organization) || (!id && presets === null)) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <LoaderCircle
          aria-label="Loading organization"
          className="size-5 animate-spin text-[var(--icons-primary-default)]"
        />
      </div>
    );
  }

  return (
    <>
      <StudioForm
        initial={organization ? valuesOf(organization) : undefined}
        status={organization?.status}
        presets={presets ?? []}
        extraActions={
          organization && (
            <>
              {organization.status === 'active' ? (
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  onClick={() => actions.requestDeactivate(organization)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  loading={actions.pending}
                  onClick={() => void actions.activate(organization.id)}
                >
                  Activate
                </Button>
              )}
              <Button
                type="button"
                variant="text"
                size="md"
                onClick={() => void actions.loginAs(organization.id)}
              >
                Log in as organization
              </Button>
            </>
          )
        }
        onSave={organization ? update : create}
        onBack={back}
      />
      {actions.dialog}
    </>
  );
}
