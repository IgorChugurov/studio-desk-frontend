'use client';

import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import {
  CONFLICT_MODES,
  lockResourceType,
  type ConflictMode,
  type InterfaceLang,
  type ResourceRole,
  type ResourceTypeDraft,
} from '../organization-config';
import type { ConfigEditorTexts } from './texts';

const LANGUAGES: InterfaceLang[] = ['en', 'sk', 'uk'];

function Check({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-[var(--space-200)] text-[var(--text-gray-default)]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/** Cards of catalog resource types. The place card cannot be removed. */
export function ResourceTypeCards({
  types,
  texts,
  labelError,
  onChange,
  onAdd,
}: {
  types: ResourceTypeDraft[];
  texts: ConfigEditorTexts;
  labelError?: string | null;
  onChange: (next: ResourceTypeDraft[]) => void;
  onAdd: () => void;
}) {
  function edit(index: number, patch: Partial<ResourceTypeDraft>) {
    onChange(
      types.map((type, itemIndex) =>
        itemIndex === index ? lockResourceType({ ...type, ...patch }) : type,
      ),
    );
  }

  return (
    <section className="flex flex-col gap-[var(--space-400)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-200)]">
        <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
          {texts.catalogResourceTypes}
        </h2>
        <Button type="button" variant="outlined" size="md" onClick={onAdd}>
          {texts.addResourceType}
        </Button>
      </div>
      {labelError && (
        <p role="alert" className="text-[var(--text-error-default)]">
          {labelError}
        </p>
      )}
      {types.map((type, index) => {
        const place = type.role === 'place';
        const offering = type.role === 'offering';
        const resource = type.role === 'resource';
        return (
          <article
            key={type.clientId}
            className="flex flex-col gap-[var(--space-400)] rounded-[var(--radius-200)] border border-[var(--border-gray-default)] p-[var(--space-400)]"
          >
            <div className="flex flex-wrap items-end justify-between gap-[var(--space-200)]">
              <div className="min-w-[16rem] flex-1">
                <Field
                  id={`role-${type.clientId}`}
                  label={texts.roleLabel}
                  required
                >
                  <Select
                    id={`role-${type.clientId}`}
                    value={type.role}
                    disabled={place}
                    onValueChange={(role) =>
                      edit(index, { role: role as ResourceRole })
                    }
                    options={(place
                      ? (['place'] as const)
                      : (['resource', 'offering'] as const)
                    ).map((role) => ({
                      value: role,
                      label: texts.role[role],
                    }))}
                  />
                </Field>
              </div>
              {!place && (
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  onClick={() =>
                    onChange(types.filter((item) => item !== type))
                  }
                >
                  {texts.remove}
                </Button>
              )}
            </div>
            {LANGUAGES.map((language) => (
              <div
                key={language}
                className="grid gap-[var(--space-300)] sm:grid-cols-2"
              >
                <Field
                  id={`${type.clientId}-${language}-singular`}
                  label={`${language} ${texts.singular}`}
                  required
                >
                  <Input
                    id={`${type.clientId}-${language}-singular`}
                    size="sm"
                    value={type.labels[language].singular}
                    onChange={(event) =>
                      edit(index, {
                        labels: {
                          ...type.labels,
                          [language]: {
                            ...type.labels[language],
                            singular: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </Field>
                <Field
                  id={`${type.clientId}-${language}-plural`}
                  label={`${language} ${texts.plural}`}
                  required
                >
                  <Input
                    id={`${type.clientId}-${language}-plural`}
                    size="sm"
                    value={type.labels[language].plural}
                    onChange={(event) =>
                      edit(index, {
                        labels: {
                          ...type.labels,
                          [language]: {
                            ...type.labels[language],
                            plural: event.target.value,
                          },
                        },
                      })
                    }
                  />
                </Field>
              </div>
            ))}
            <div className="flex flex-col gap-[var(--space-200)]">
              <Check
                checked={type.geography}
                disabled
                label={texts.geography}
                onChange={() => undefined}
              />
              <Check
                checked={type.duration}
                disabled
                label={texts.duration}
                onChange={() => undefined}
              />
              <Check
                checked={type.showcase}
                label={texts.showcase}
                onChange={(showcase) => edit(index, { showcase })}
              />
              <Check
                checked={type.person}
                disabled={!resource}
                label={texts.person}
                onChange={(person) => edit(index, { person })}
              />
              <Check
                checked={type.skills}
                label={texts.skills}
                onChange={(skills) => edit(index, { skills })}
              />
              <Check
                checked={type.required}
                disabled={place}
                label={texts.requiredOnSlot}
                onChange={(required) => edit(index, { required })}
              />
              <Check
                checked={type.multiple}
                disabled={place}
                label={texts.allowMultiple}
                onChange={(multiple) => edit(index, { multiple })}
              />
            </div>
            <Field
              id={`conflict-${type.clientId}`}
              label={texts.conflictRule}
              required
            >
              <Select
                id={`conflict-${type.clientId}`}
                value={type.conflictMode}
                disabled={offering}
                onValueChange={(conflictMode) =>
                  edit(index, { conflictMode: conflictMode as ConflictMode })
                }
                options={CONFLICT_MODES.map((mode) => ({
                  value: mode,
                  label: texts.conflict[mode],
                }))}
              />
            </Field>
          </article>
        );
      })}
    </section>
  );
}
