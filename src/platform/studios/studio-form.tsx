'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { Select } from '../../shared/ui/select';
import {
  SECTION_LABELS,
  SECTION_ORDER,
} from '../../shared/organization-config';
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
import type { OrganizationStatus } from './studio-types';

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
  if (error.code === 'OWNER_IS_STAFF') {
    return { ownerEmail: FIELD_TEXTS.ownerIsStaff };
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
      } else if (field === 'presetId') errors.presetId = FIELD_TEXTS.preset;
      else if (field === 'sections' || field.startsWith('sections')) {
        errors.sections = FIELD_TEXTS.sections;
      }
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }
  return null;
}

/**
 * The form of one organization, for creating and for editing. It checks the
 * formats for early feedback and shows the server errors at the fields they
 * name. When an address or the owner changes, the "Confirm changes" window
 * comes before saving.
 */
export function StudioForm({
  initial,
  status,
  presets = [],
  extraActions,
  onSave,
  onBack,
}: {
  /** The loaded values when editing; empty for a new organization. */
  initial?: StudioValues;
  /** Shown only when editing. */
  status?: OrganizationStatus;
  /** Presets offered when creating. The first one is selected. */
  presets?: { id: string; name: string }[];
  /** Buttons between "Back" and "Update" (editing only). */
  extraActions?: ReactNode;
  onSave: (values: StudioValues) => Promise<void>;
  onBack: () => void;
}) {
  const editing = initial !== undefined;
  const loaded = initial ?? {
    ...EMPTY_VALUES,
    presetId: presets[0]?.id ?? '',
    presetName: presets[0]?.name ?? '',
  };
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
      values.ownerEmail.trim() !== '' &&
      values.presetId.trim() !== '';

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
    const found = validate(normalized, editing ? 'edit' : 'create');
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
          {extraActions}
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
            placeholder="Organization name"
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
            placeholder="organization-slug"
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
            placeholder="organization.example.com"
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

        {editing ? (
          <Field id="preset" label="Preset">
            <Input
              id="preset"
              size="sm"
              readOnly
              disabled
              value={values.presetName}
            />
          </Field>
        ) : (
          <Field id="preset" label="Preset" required error={errors.presetId}>
            <Select
              id="preset"
              value={values.presetId}
              invalid={Boolean(errors.presetId)}
              placeholder="Select a preset"
              disabled={presets.length === 0}
              onValueChange={(presetId) => {
                const preset = presets.find((item) => item.id === presetId);
                setValues((current) => ({
                  ...current,
                  presetId,
                  presetName: preset?.name ?? current.presetName,
                }));
                setErrors((current) => ({ ...current, presetId: undefined }));
              }}
              options={presets.map((preset) => ({
                value: preset.id,
                label: preset.name,
              }))}
            />
          </Field>
        )}

        {editing && (
          <fieldset className="flex flex-col gap-[var(--space-200)]">
            <legend className="text-[var(--text-gray-secondary)]">
              Enabled sections
            </legend>
            {SECTION_ORDER.map((section) => (
              <label
                key={section}
                className="flex items-center gap-[var(--space-200)] text-[var(--text-gray-default)]"
              >
                <input
                  type="checkbox"
                  checked={values.sections.includes(section)}
                  onChange={(event) => {
                    const sections = event.target.checked
                      ? [...values.sections, section]
                      : values.sections.filter((item) => item !== section);
                    setValues((current) => ({ ...current, sections }));
                    setErrors((current) => ({
                      ...current,
                      sections: undefined,
                    }));
                  }}
                />
                <span>{SECTION_LABELS[section]}</span>
              </label>
            ))}
            {errors.sections && (
              <p
                id="sections-message"
                role="alert"
                className="text-[var(--text-error-default)]"
              >
                {errors.sections}
              </p>
            )}
          </fieldset>
        )}
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
          These changes affect access to the organization and may break existing
          links or sessions
        </p>
        {warnings.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Modal>
    </form>
  );
}
