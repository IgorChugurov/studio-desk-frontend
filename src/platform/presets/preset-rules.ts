import {
  SECTION_ORDER,
  addedDraft,
  labelsComplete,
  lockResourceType,
  nextClientId,
  nextResourceKey,
  placeDraft,
  sameSections,
  withLockedStatuses,
  type BillingDraft,
  type ResourceTypeDraft,
  type ScheduleDraft,
} from '../../shared/organization-config';

export const PRESET_TEXTS = {
  name: 'Use 2–100 characters',
  nameTaken: 'This preset name is already taken',
  sections: 'Select at least one section',
  labels: 'Enter all language labels',
} as const;

export interface PresetValues {
  name: string;
  description: string;
  sections: string[];
  schedule: ScheduleDraft;
  billing: BillingDraft;
  resourceTypes: ResourceTypeDraft[];
}

export interface PresetFieldErrors {
  name?: string;
  sections?: string;
  labels?: string;
}

export function emptyPreset(): PresetValues {
  return {
    name: '',
    description: '',
    sections: [...SECTION_ORDER],
    schedule: {
      audienceEnabled: true,
      formatEnabled: true,
      statuses: ['planned', 'cancelled'],
    },
    billing: { settlementMode: 'subscription' },
    resourceTypes: [placeDraft('place')],
  };
}

export function normalizePreset(values: PresetValues): PresetValues {
  return {
    ...values,
    name: values.name.trim(),
    description: values.description.trim(),
    schedule: {
      ...values.schedule,
      statuses: withLockedStatuses(values.schedule.statuses),
    },
    resourceTypes: values.resourceTypes.map((type) =>
      lockResourceType({
        ...type,
        labels: {
          en: {
            singular: type.labels.en.singular.trim(),
            plural: type.labels.en.plural.trim(),
          },
          sk: {
            singular: type.labels.sk.singular.trim(),
            plural: type.labels.sk.plural.trim(),
          },
          uk: {
            singular: type.labels.uk.singular.trim(),
            plural: type.labels.uk.plural.trim(),
          },
        },
      }),
    ),
  };
}

export function validatePreset(values: PresetValues): PresetFieldErrors {
  const preset = normalizePreset(values);
  const errors: PresetFieldErrors = {};
  if (preset.name.length < 2 || preset.name.length > 100) {
    errors.name = PRESET_TEXTS.name;
  }
  if (preset.sections.length === 0) errors.sections = PRESET_TEXTS.sections;
  if (!labelsComplete(preset.resourceTypes))
    errors.labels = PRESET_TEXTS.labels;
  return errors;
}

export function addResourceType(values: PresetValues): PresetValues {
  const taken = values.resourceTypes.flatMap((type) =>
    type.key ? [type.key] : [],
  );
  return {
    ...values,
    resourceTypes: [
      ...values.resourceTypes,
      addedDraft('resource', nextResourceKey('resource', taken)),
    ],
  };
}

/** A stable id for a card loaded from the API. */
export function draftFromPresetType(
  type: PresetValues['resourceTypes'][number],
): ResourceTypeDraft {
  return lockResourceType({
    ...type,
    clientId: type.clientId || nextClientId(),
  });
}

export function presetBody(values: PresetValues) {
  const preset = normalizePreset(values);
  return {
    name: preset.name,
    description: preset.description === '' ? null : preset.description,
    sections: preset.sections,
    catalogConfig: {
      resourceTypes: preset.resourceTypes.map((type) => ({
        key: type.key ?? type.role,
        role: type.role,
        labels: type.labels,
        geography: type.geography,
        duration: type.duration,
        showcase: type.showcase,
        person: type.person,
        skills: type.skills,
        required: type.required,
        multiple: type.multiple,
        conflictMode: type.conflictMode,
      })),
    },
    scheduleConfig: preset.schedule,
    billingConfig: preset.billing,
  };
}

export function presetChanged(before: PresetValues, after: PresetValues) {
  return (
    JSON.stringify(presetBody(before)) !== JSON.stringify(presetBody(after))
  );
}

export function sectionsEqual(left: string[], right: string[]) {
  return sameSections(left, right);
}
