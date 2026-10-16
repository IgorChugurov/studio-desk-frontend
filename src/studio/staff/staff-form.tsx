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
import { useSession } from '../api/session-provider';
import { loadNamedRecords } from '../catalogs/catalog-options';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { RemoveStaffDialog } from './remove-staff-dialog';
import {
  staffMemberSchema,
  staffPageSchema,
  type StaffMember,
} from './staff-types';

const emailSchema = z.email();

/** Add a staff member, or change the role and trainer link of an existing one. */
export function StaffForm({ memberId }: { memberId?: string }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const router = useRouter();
  const editing = memberId !== undefined;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('administrator');
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [loadedRole, setLoadedRole] = useState<StaffMember['role'] | null>(
    null,
  );
  const [loadedTrainerId, setLoadedTrainerId] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [listsReady, setListsReady] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

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
        setTrainerId(member.trainerId);
        setLoadedRole(member.role);
        setLoadedTrainerId(member.trainerId);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [memberId, texts.somethingWentWrong]);

  useEffect(() => {
    let gone = false;
    void Promise.all([loadNamedRecords('/trainers'), loadLinkedTrainerIds()])
      .then(([cards, linked]) => {
        if (gone) return;
        setTrainers(cards);
        setLinkedIds(linked);
        setListsReady(true);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [texts.somethingWentWrong]);

  const trainerOptions = trainers
    .filter(
      (card) => !linkedIds.includes(card.id) || card.id === loadedTrainerId,
    )
    .map((card) => ({ value: card.id, label: card.name }));

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
    if (error.code === 'TRAINER_ALREADY_LINKED') {
      setTrainerError(texts.trainerAlreadyLinked);
      return true;
    }
    if (error.code === 'VALIDATION_ERROR' && error.field === 'email') {
      setEmailError(texts.invalidEmail);
      return true;
    }
    const trainer = error.fieldErrors.find(
      (item) => item.field === 'trainerId',
    );
    if (trainer?.code === 'REQUIRED') {
      setTrainerError(texts.selectTrainer);
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
    if (role === 'trainer' && !trainerId) {
      setTrainerError(texts.selectTrainer);
      return;
    }
    setPending(true);
    try {
      if (editing && memberId) {
        const body: { role?: StaffMember['role']; trainerId?: string } = {};
        if (role !== loadedRole) body.role = role;
        if (role === 'trainer' && trainerId && trainerId !== loadedTrainerId) {
          body.trainerId = trainerId;
        }
        await getApi().request(`/staff/${memberId}`, { method: 'PATCH', body });
        notify.success(texts.staffUpdated);
      } else {
        await getApi().request('/staff', {
          method: 'POST',
          body:
            role === 'trainer'
              ? { email: email.trim(), role, trainerId }
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

  const cardChanged = role === 'trainer' && trainerId !== loadedTrainerId;
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
              setTrainerError(null);
            }}
            options={[
              { value: 'administrator', label: texts.administrator },
              { value: 'accountant', label: texts.accountant },
              { value: 'trainer', label: texts.trainer },
            ]}
          />
        </Field>
        {role === 'trainer' && (
          <Field
            id="trainer"
            label={texts.trainer}
            required
            error={trainerError}
          >
            <Select
              id="trainer"
              value={trainerId ?? ''}
              disabled={!listsReady}
              invalid={trainerError !== null}
              placeholder={texts.selectTrainer}
              onValueChange={(next) => {
                setTrainerId(next);
                setTrainerError(null);
              }}
              options={trainerOptions}
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

/** Every catalog trainer already linked to a staff member, across pages. */
async function loadLinkedTrainerIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = staffPageSchema.parse(
      await getApi().request<unknown>(`/staff?currentPage=${page}&perPage=100`),
    );
    for (const item of body.items) {
      if (item.trainerId) ids.push(item.trainerId);
    }
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return ids;
}
