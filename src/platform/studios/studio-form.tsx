'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { StatusTag } from './status-tag';
import {
  EMPTY_VALUES,
  FIELD_TEXTS,
  changeWarnings,
  hasChanges,
  normalize,
  proposeSubdomain,
  studioAddress,
  validate,
  type FieldErrors,
  type FieldName,
  type StudioValues,
} from './studio-rules';
import type { StudioStatus } from './studio-types';

const FAILED_TEXT = 'Something went wrong. Try again';

/** The text and the field of an API error, or `null` for any other failure. */
function fieldErrorsOf(error: unknown): FieldErrors | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'SUBDOMAIN_TAKEN') {
    return { subdomain: FIELD_TEXTS.subdomainTaken };
  }
  if (error.code === 'SUBDOMAIN_RESERVED') {
    return { subdomain: FIELD_TEXTS.subdomainReserved };
  }
  if (error.code === 'DOMAIN_TAKEN') {
    return { customDomain: FIELD_TEXTS.customDomainTaken };
  }
  if (error.code === 'VALIDATION_ERROR' && error.fieldErrors.length > 0) {
    const errors: FieldErrors = {};
    for (const { field } of error.fieldErrors) {
      if (field === 'name') errors.name = FIELD_TEXTS.name;
      else if (field === 'subdomain') errors.subdomain = FIELD_TEXTS.subdomain;
      else if (field === 'customDomain') {
        errors.customDomain = FIELD_TEXTS.customDomain;
      } else if (field === 'owner.email') {
        errors.ownerEmail = FIELD_TEXTS.ownerEmail;
      }
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }
  return null;
}

/**
 * The form of one studio, for creating and for editing. It checks the formats
 * for early feedback and shows the server errors at the fields they name.
 * When an address or the owner changes, the "Confirm changes" window comes
 * before saving.
 */
export function StudioForm({
  initial,
  status,
  onSave,
  onBack,
}: {
  /** The loaded values when editing; empty for a new studio. */
  initial?: StudioValues;
  /** Shown only when editing. */
  status?: StudioStatus;
  onSave: (values: StudioValues) => Promise<void>;
  onBack: () => void;
}) {
  const editing = initial !== undefined;
  const loaded = initial ?? EMPTY_VALUES;
  const [values, setValues] = useState<StudioValues>(loaded);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // While a new studio's subdomain was not typed by hand, it follows the name.
  const [subdomainByHand, setSubdomainByHand] = useState(false);

  const warnings = editing ? changeWarnings(loaded, values) : [];
  const canSave = editing
    ? hasChanges(loaded, values)
    : values.name.trim() !== '' &&
      values.subdomain.trim() !== '' &&
      values.ownerEmail.trim() !== '';

  function change(field: FieldName, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name' && !editing && !subdomainByHand) {
        next.subdomain = proposeSubdomain(value);
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === 'subdomain') setSubdomainByHand(true);
  }

  async function save() {
    const normalized = normalize(values);
    setPending(true);
    try {
      await onSave(normalized);
    } catch (error) {
      setConfirming(false);
      const fieldErrors = fieldErrorsOf(error);
      if (fieldErrors) setErrors(fieldErrors);
      else notify.error(FAILED_TEXT);
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !canSave) return;
    const normalized = normalize(values);
    setValues(normalized);
    const found = validate(normalized);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (warnings.length > 0) {
      setConfirming(true);
      return;
    }
    await save();
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[var(--space-400)] sm:px-[var(--space-600)]"
    >
      <div className="mb-[var(--space-400)] flex flex-wrap items-center justify-between gap-[var(--space-200)]">
        <div>{status && <StatusTag status={status} />}</div>
        <div className="flex flex-wrap items-center gap-[var(--space-200)]">
          <Button type="button" variant="outlined" size="md" onClick={onBack}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
          <Button
            type="submit"
            variant="cta"
            size="md"
            disabled={!canSave}
            loading={pending && !confirming}
          >
            {editing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-400)]">
        <Field id="name" label="Name" required error={errors.name}>
          <Input
            id="name"
            size="sm"
            autoComplete="off"
            placeholder="Studio name"
            value={values.name}
            data-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-message' : undefined}
            onChange={(event) => change('name', event.target.value)}
          />
        </Field>

        <Field
          id="subdomain"
          label="Subdomain"
          required
          error={errors.subdomain}
          hint={
            values.subdomain.trim() ? studioAddress(values.subdomain) : null
          }
        >
          <Input
            id="subdomain"
            size="sm"
            autoComplete="off"
            placeholder="studio-slug"
            value={values.subdomain}
            data-invalid={errors.subdomain ? true : undefined}
            aria-describedby="subdomain-message"
            onChange={(event) => change('subdomain', event.target.value)}
          />
        </Field>

        <Field
          id="customDomain"
          label="Custom domain (optional)"
          error={errors.customDomain}
        >
          <Input
            id="customDomain"
            size="sm"
            autoComplete="off"
            placeholder="studio.example.com"
            value={values.customDomain}
            data-invalid={errors.customDomain ? true : undefined}
            aria-describedby={
              errors.customDomain ? 'customDomain-message' : undefined
            }
            onChange={(event) => change('customDomain', event.target.value)}
          />
        </Field>

        <Field
          id="ownerEmail"
          label="Owner e-mail"
          required
          error={errors.ownerEmail}
        >
          <Input
            id="ownerEmail"
            size="sm"
            type="email"
            autoComplete="off"
            placeholder="owner@example.com"
            value={values.ownerEmail}
            data-invalid={errors.ownerEmail ? true : undefined}
            aria-describedby={
              errors.ownerEmail ? 'ownerEmail-message' : undefined
            }
            onChange={(event) => change('ownerEmail', event.target.value)}
          />
        </Field>
      </div>

      <Modal
        open={confirming}
        onOpenChange={(open) => {
          if (!pending) setConfirming(open);
        }}
        title="Confirm changes"
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              size="md"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="cta"
              size="md"
              className="w-full sm:w-auto"
              loading={pending}
              onClick={() => void save()}
            >
              Save changes
            </Button>
          </>
        }
      >
        <p>
          These changes affect access to the studio and may break existing links
          or sessions
        </p>
        {warnings.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Modal>
    </form>
  );
}
