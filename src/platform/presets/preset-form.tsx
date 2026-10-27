'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ResourceTypeCards } from '../../shared/config-editor/resource-type-cards';
import { ScheduleBillingFields } from '../../shared/config-editor/schedule-billing';
import { CONFIG_EDITOR_TEXTS } from '../../shared/config-editor/texts';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import {
  SECTION_LABELS,
  SECTION_ORDER,
} from '../../shared/organization-config';
import {
  PRESET_TEXTS,
  addResourceType,
  emptyPreset,
  presetChanged,
  validatePreset,
  type PresetFieldErrors,
  type PresetValues,
} from './preset-rules';

const FAILED_TEXT = 'Something went wrong. Try again';

function errorsOf(error: unknown): PresetFieldErrors | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'PRESET_NAME_TAKEN')
    return { name: PRESET_TEXTS.nameTaken };
  if (error.code !== 'VALIDATION_ERROR') return null;
  const errors: PresetFieldErrors = {};
  for (const item of error.fieldErrors) {
    if (item.field === 'name' || item.field.startsWith('name')) {
      errors.name = PRESET_TEXTS.name;
    } else if (item.field === 'sections' || item.field.startsWith('sections')) {
      errors.sections = PRESET_TEXTS.sections;
    } else if (item.field.includes('labels')) {
      errors.labels = PRESET_TEXTS.labels;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** Create or edit a preset: general fields, schedule, billing, resource types. */
export function PresetForm({
  initial,
  extraActions,
  onSave,
  onBack,
}: {
  initial?: PresetValues;
  extraActions?: ReactNode;
  onSave: (values: PresetValues) => Promise<void>;
  onBack: () => void;
}) {
  const editing = initial !== undefined;
  const loaded = initial;
  const [values, setValues] = useState<PresetValues>(initial ?? emptyPreset());
  const [errors, setErrors] = useState<PresetFieldErrors>({});
  const [pending, setPending] = useState(false);

  const canSave = editing
    ? loaded !== undefined && presetChanged(loaded, values)
    : values.name.trim() !== '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !canSave) return;
    const found = validatePreset(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    try {
      await onSave(values);
    } catch (error) {
      const fieldErrors = errorsOf(error);
      if (fieldErrors) setErrors(fieldErrors);
      else notify.error(FAILED_TEXT);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[var(--space-400)] sm:px-[var(--space-600)]"
    >
      <div className="mb-[var(--space-400)] flex flex-wrap items-center justify-end gap-[var(--space-200)]">
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
          loading={pending}
        >
          {editing ? 'Update' : 'Save'}
        </Button>
      </div>
      <div className="flex flex-col gap-[var(--space-600)]">
        <section className="flex flex-col gap-[var(--space-400)]">
          <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
            General & Modules
          </h2>
          <Field id="name" label="Name" required error={errors.name}>
            <Input
              id="name"
              size="sm"
              value={values.name}
              data-invalid={errors.name ? true : undefined}
              onChange={(event) => {
                setValues({ ...values, name: event.target.value });
                setErrors((current) => ({ ...current, name: undefined }));
              }}
            />
          </Field>
          <Field id="description" label="Description (optional)">
            <Input
              id="description"
              size="sm"
              value={values.description}
              onChange={(event) =>
                setValues({ ...values, description: event.target.value })
              }
            />
          </Field>
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
                    setValues({ ...values, sections });
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
              <p role="alert" className="text-[var(--text-error-default)]">
                {errors.sections}
              </p>
            )}
          </fieldset>
        </section>
        <ScheduleBillingFields
          schedule={values.schedule}
          billing={values.billing}
          texts={CONFIG_EDITOR_TEXTS}
          onSchedule={(schedule) => setValues({ ...values, schedule })}
          onBilling={(billing) => setValues({ ...values, billing })}
        />
        <ResourceTypeCards
          types={values.resourceTypes}
          texts={CONFIG_EDITOR_TEXTS}
          labelError={errors.labels}
          onChange={(resourceTypes) => {
            setValues({ ...values, resourceTypes });
            setErrors((current) => ({ ...current, labels: undefined }));
          }}
          onAdd={() => setValues(addResourceType(values))}
        />
      </div>
    </form>
  );
}
