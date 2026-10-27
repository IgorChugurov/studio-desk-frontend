'use client';

import { Field } from '../ui/field';
import { Select } from '../ui/select';
import {
  LOCKED_SLOT_STATUSES,
  SETTLEMENT_MODES,
  SLOT_STATUSES,
  withLockedStatuses,
  type BillingDraft,
  type ScheduleDraft,
  type SettlementMode,
  type SlotStatus,
} from '../organization-config';
import type { ConfigEditorTexts } from './texts';

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

/** Audience, format, slot statuses, and settlement mode. */
export function ScheduleBillingFields({
  schedule,
  billing,
  texts,
  onSchedule,
  onBilling,
}: {
  schedule: ScheduleDraft;
  billing: BillingDraft;
  texts: ConfigEditorTexts;
  onSchedule: (next: ScheduleDraft) => void;
  onBilling: (next: BillingDraft) => void;
}) {
  const selected = new Set(schedule.statuses);

  function toggleStatus(status: SlotStatus, on: boolean) {
    const next = on
      ? [...schedule.statuses, status]
      : schedule.statuses.filter((item) => item !== status);
    onSchedule({ ...schedule, statuses: withLockedStatuses(next) });
  }

  return (
    <section className="flex flex-col gap-[var(--space-400)] rounded-[var(--radius-200)] border border-[var(--border-gray-default)] p-[var(--space-400)]">
      <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
        {texts.scheduleBilling}
      </h2>
      <Check
        checked={schedule.audienceEnabled}
        label={texts.audiencePlaces}
        onChange={(audienceEnabled) =>
          onSchedule({ ...schedule, audienceEnabled })
        }
      />
      <Check
        checked={schedule.formatEnabled}
        label={texts.formatMode}
        onChange={(formatEnabled) => onSchedule({ ...schedule, formatEnabled })}
      />
      <fieldset className="flex flex-col gap-[var(--space-200)]">
        <legend className="mb-[var(--space-200)] text-[var(--text-gray-secondary)]">
          {texts.statuses}
        </legend>
        {SLOT_STATUSES.map((status) => {
          const locked = LOCKED_SLOT_STATUSES.includes(
            status as (typeof LOCKED_SLOT_STATUSES)[number],
          );
          return (
            <Check
              key={status}
              checked={locked || selected.has(status)}
              disabled={locked}
              label={texts.status[status]}
              onChange={(on) => toggleStatus(status, on)}
            />
          );
        })}
      </fieldset>
      <Field id="settlementMode" label={texts.settlementMode} required>
        <Select
          id="settlementMode"
          value={billing.settlementMode}
          onValueChange={(settlementMode) =>
            onBilling({ settlementMode: settlementMode as SettlementMode })
          }
          options={SETTLEMENT_MODES.map((mode) => ({
            value: mode,
            label: texts.settlement[mode],
          }))}
        />
      </Field>
    </section>
  );
}
