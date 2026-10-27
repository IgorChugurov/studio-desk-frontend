'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import type { OrganizationConfig } from '../api/auth-types';
import { useSession } from '../api/session-provider';
import { copy, type Lang } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { RemoveStaffDialog } from './remove-staff-dialog';
import {
  staffMemberSchema,
  staffPageSchema,
  type StaffMember,
} from './staff-types';

const emailSchema = z.email();

const resourcePageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  meta: z.object({ totalPages: z.number() }),
});

type PersonType = OrganizationConfig['catalogConfig']['resourceTypes'][number];

export function personTypes(
  config: OrganizationConfig | undefined,
): PersonType[] {
  return (config?.catalogConfig.resourceTypes ?? []).filter(
    (type) => type.person,
  );
}

export function personLabel(
  types: PersonType[],
  language: Lang,
  fallback: string,
): string {
  if (types.length === 1) {
    const label = types[0]?.labels[language].singular.trim();
    if (label) return label;
  }
  return fallback;
}

/** Add a staff member, or change the role and specialist link of an existing one. */
export function StaffForm({ memberId }: { memberId?: string }) {
  const session = useSession();
  const language: Lang =
    session.status === 'signed-in' ? session.language : 'en';
  const texts = copy(language);
  const people = personTypes(
    session.status === 'signed-in' ? session.config : undefined,
  );
  const specialistName = personLabel(people, language, texts.specialist);
  const router = useRouter();
  const editing = memberId !== undefined;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('administrator');
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [loadedRole, setLoadedRole] = useState<StaffMember['role'] | null>(
    null,
  );
  const [loadedResourceId, setLoadedResourceId] = useState<string | null>(null);
  const [resources, setResources] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [listsReady, setListsReady] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const typeKey = people.map((type) => type.id).join(',');

  useCrumbs(
    editing
      ? [{ label: texts.staff, href: '/staff' }, { label: email || '…' }]
      : [{ label: texts.staff, href: '/staff' }, { label: texts.newStaff }],
  );

  useEffect(() => {
    if (!memberId) return;
    let gone = false;
    void getApi()
      .request<unknown>(`/staff/${memberId}`)
      .then((body) => {
        if (gone) return;
        const member = staffMemberSchema.parse(body);
        setEmail(member.email);
        setRole(member.role);
        setResourceId(member.resourceId);
        setLoadedRole(member.role);
        setLoadedResourceId(member.resourceId);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [memberId, texts.somethingWentWrong]);

  useEffect(() => {
    let gone = false;
    const typeIds = typeKey === '' ? [] : typeKey.split(',');
    void Promise.all([loadPersonResources(typeIds), loadLinkedResourceIds()])
      .then(([cards, linked]) => {
        if (gone) return;
        setResources(cards);
        setLinkedIds(linked);
        setListsReady(true);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [texts.somethingWentWrong, typeKey]);

  const resourceOptions = resources
    .filter(
      (card) => !linkedIds.includes(card.id) || card.id === loadedResourceId,
    )
    .map((card) => ({ value: card.id, label: card.name }));

  const roleOptions = [
    { value: 'administrator', label: texts.administrator },
    { value: 'accountant', label: texts.accountant },
  ];
  if (people.length > 0 || role === 'specialist') {
    roleOptions.push({ value: 'specialist', label: specialistName });
  }

  function fieldError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    if (error.code === 'STAFF_ALREADY_ADDED') {
      setEmailError(texts.emailTaken);
      return true;
    }
    if (error.code === 'EMAIL_IS_OWNER') {
      setEmailError(texts.emailIsOwner);
      return true;
    }
    if (error.code === 'SPECIALIST_ALREADY_LINKED') {
      setResourceError(texts.trainerAlreadyLinked);
      return true;
    }
    if (error.code === 'VALIDATION_ERROR' && error.field === 'email') {
      setEmailError(texts.invalidEmail);
      return true;
    }
    const resource = error.fieldErrors.find(
      (item) => item.field === 'resourceId',
    );
    if (resource?.code === 'REQUIRED') {
      setResourceError(texts.selectTrainer);
      return true;
    }
    return false;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!editing && !emailSchema.safeParse(email.trim()).success) {
      setEmailError(texts.invalidEmail);
      return;
    }
    if (role === 'specialist' && !resourceId) {
      setResourceError(texts.selectTrainer);
      return;
    }
    setPending(true);
    try {
      if (editing && memberId) {
        const body: { role?: StaffMember['role']; resourceId?: string } = {};
        if (role !== loadedRole) body.role = role;
        if (
          role === 'specialist' &&
          resourceId &&
          resourceId !== loadedResourceId
        ) {
          body.resourceId = resourceId;
        }
        await getApi().request(`/staff/${memberId}`, { method: 'PATCH', body });
        notify.success(texts.staffUpdated);
      } else {
        await getApi().request('/staff', {
          method: 'POST',
          body:
            role === 'specialist'
              ? { email: email.trim(), role, resourceId }
              : { email: email.trim(), role },
        });
        notify.success(texts.staffAdded);
      }
      router.push('/staff');
    } catch (error) {
      if (!fieldError(error)) notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!memberId) return;
    setRemoving(true);
    try {
      await getApi().request(`/staff/${memberId}`, { method: 'DELETE' });
      notify.success(texts.staffRemoved);
      router.push('/staff');
    } catch {
      notify.error(texts.somethingWentWrong);
      setRemoving(false);
    }
  }

  const cardChanged = role === 'specialist' && resourceId !== loadedResourceId;
  const canSave = editing
    ? loadedRole !== null && (role !== loadedRole || cardChanged)
    : email.trim() !== '';

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[var(--space-400)] sm:px-[var(--space-600)]"
      onSubmit={(event) => void save(event)}
    >
      <div className="mb-[var(--space-400)] flex flex-wrap justify-end gap-[var(--space-200)]">
        <Button
          type="button"
          variant="outlined"
          size="md"
          onClick={() => router.push('/staff')}
        >
          {texts.back}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setConfirmRemove(true)}
          >
            {texts.remove}
          </Button>
        )}
        <Button
          type="submit"
          variant="cta"
          size="md"
          disabled={!canSave}
          loading={pending}
        >
          {editing ? texts.update : texts.save}
        </Button>
      </div>
      <div className="flex max-w-xl flex-col gap-[var(--space-400)]">
        <Field id="email" label={texts.emailLabel} required error={emailError}>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            value={email}
            disabled={editing}
            data-invalid={emailError ? true : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
            }}
          />
        </Field>
        <Field id="role" label={texts.role} required>
          <Select
            id="role"
            value={role}
            onValueChange={(next) => {
              setRole(next as StaffMember['role']);
              setResourceError(null);
            }}
            options={roleOptions}
          />
        </Field>
        {role === 'specialist' && (
          <Field
            id="specialist"
            label={specialistName}
            required
            error={resourceError}
          >
            <Select
              id="specialist"
              value={resourceId ?? ''}
              disabled={!listsReady}
              invalid={resourceError !== null}
              placeholder={texts.selectTrainer}
              onValueChange={(next) => {
                setResourceId(next);
                setResourceError(null);
              }}
              options={resourceOptions}
            />
          </Field>
        )}
      </div>
      <RemoveStaffDialog
        email={confirmRemove ? email : null}
        texts={texts}
        pending={removing}
        onCancel={() => setConfirmRemove(false)}
        onRemove={() => void remove()}
      />
    </form>
  );
}

export async function loadPersonResources(
  typeIds: string[],
): Promise<{ id: string; name: string }[]> {
  const items: { id: string; name: string }[] = [];
  for (const typeId of typeIds) {
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages && page <= 20) {
      const body = resourcePageSchema.parse(
        await getApi().request(
          `/resources?resourceTypeId=${encodeURIComponent(typeId)}&currentPage=${page}&perPage=100`,
        ),
      );
      items.push(...body.items);
      totalPages = body.meta.totalPages;
      page += 1;
    }
  }
  return items;
}

/** Every person resource already linked to a staff member, across pages. */
async function loadLinkedResourceIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = staffPageSchema.parse(
      await getApi().request<unknown>(`/staff?currentPage=${page}&perPage=100`),
    );
    for (const item of body.items) {
      if (item.resourceId) ids.push(item.resourceId);
    }
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return ids;
}
