import { useState, type FormEvent } from 'react';
import { CircleAlert, Clock, TriangleAlert } from 'lucide-react';
import type { ApiConflict } from '../api/api-error';
import type {
  CatalogResource,
  ResourceTypeConfig,
} from '../catalogs/resource-types';
import { typeLabel } from '../catalogs/resource-types';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { MultiSelect } from '../../shared/ui/multi-select';
import { Select } from '../../shared/ui/select';
import {
  WEEKDAYS,
  optionsForType,
  placesRequired,
  singlePlace,
  type ScheduleConfig,
  type SlotDraft,
  type SlotKind,
} from './model';
import {
  busySentence,
  formatLabel,
  statusLabel,
  texts,
  weekdayLabel,
} from './texts';

export type SlotMode = 'new' | 'edit' | 'replace' | 'past';

/** Slot or template-row window: service, block, and overlap confirmation. */
export function SlotWindow({
  mode,
  initial,
  resources,
  types,
  config,
  language,
  errors,
  alert,
  warnings,
  pending,
  allowActions,
  template = false,
  onEdit,
  onSubmit,
  onBack,
  onCancelSlot,
  onReplace,
  onDelete,
}: {
  mode: SlotMode;
  initial: SlotDraft;
  resources: CatalogResource[];
  types: ResourceTypeConfig[];
  config: ScheduleConfig;
  language: 'en' | 'sk' | 'uk';
  errors: Record<string, string>;
  alert: string | null;
  warnings: ApiConflict[];
  pending: boolean;
  allowActions: boolean;
  template?: boolean;
  onEdit: () => void;
  onSubmit: (draft: SlotDraft) => void;
  onBack: () => void;
  onCancelSlot: () => void;
  onReplace: (draft: SlotDraft) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const locked = !allowActions || mode === 'past';
  const offeringLocked = locked || mode === 'edit';
  const place = resources.find((item) => item.id === draft.placeResourceId);
  const onlyPlace = singlePlace(types, resources);
  const virtual = place?.type === 'virtual';

  function edit(next: SlotDraft) {
    setDraft(next);
    onEdit();
  }

  function choosePlace(placeResourceId: string) {
    const next = resources.find((item) => item.id === placeResourceId);
    edit({
      ...draft,
      placeResourceId,
      format: next?.type === 'virtual' ? 'online_only' : draft.format,
      places: next?.type === 'virtual' ? '' : draft.places,
    });
  }

  function chooseOne(type: ResourceTypeConfig, resourceId: string) {
    const resource = resources.find((item) => item.id === resourceId);
    const next: SlotDraft = {
      ...draft,
      byType: {
        ...draft.byType,
        [type.id]: resourceId === '' ? [] : [resourceId],
      },
    };
    if (type.role === 'offering' && resource?.defaultDuration) {
      next.duration = String(resource.defaultDuration);
    }
    edit(next);
  }

  function chooseMany(type: ResourceTypeConfig, ids: string[]) {
    const next: SlotDraft = {
      ...draft,
      byType: { ...draft.byType, [type.id]: ids },
    };
    if (type.role === 'offering' && ids[0]) {
      const resource = resources.find((item) => item.id === ids[0]);
      if (resource?.defaultDuration)
        next.duration = String(resource.defaultDuration);
    }
    edit(next);
  }

  const showSave = allowActions && mode !== 'past';
  const showPastSave =
    allowActions &&
    mode === 'past' &&
    draft.kind === 'service' &&
    statusChoices('past', config.statuses).length > 0;
  const showEdit = allowActions && mode === 'edit';
  const selectors = types.filter((type) => {
    if (type.role === 'place') return false;
    if (draft.kind === 'block' && type.role === 'offering') return false;
    if (draft.kind === 'block' && draft.blocksAll) return false;
    return true;
  });

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onBack();
      }}
      title={windowTitle(draft, resources, types)}
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={onBack}
            disabled={pending}
          >
            {texts.back}
          </Button>
          {showEdit && (
            <Button
              type="button"
              variant="outlined"
              size="md"
              onClick={onCancelSlot}
              disabled={pending}
            >
              {texts.cancelSlot}
            </Button>
          )}
          {showEdit && draft.kind === 'service' && (
            <Button
              type="button"
              variant="outlined"
              size="md"
              onClick={() => onReplace(draft)}
              disabled={pending}
            >
              {texts.replace}
            </Button>
          )}
          {showEdit && (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={onDelete}
              disabled={pending}
            >
              {texts.delete}
            </Button>
          )}
          {(showSave || showPastSave) && (
            <Button
              type="submit"
              form="slot-form"
              variant="cta"
              size="md"
              loading={pending}
            >
              {warnings.length > 0 ? texts.saveAnyway : texts.save}
            </Button>
          )}
        </>
      }
    >
      <form
        id="slot-form"
        className="flex flex-col gap-[var(--space-300)]"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(draft);
        }}
      >
        {alert && (
          <div
            role="alert"
            className="flex items-start gap-[var(--space-200)] rounded-[var(--radius-200)] border border-[var(--border-error-default)] bg-[var(--background-error-secondary)] px-[var(--space-300)] py-[var(--space-250)] font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] font-[var(--body-font-weight-strong)] text-[var(--text-error-default)]"
          >
            <CircleAlert
              aria-hidden
              className="mt-[2px] size-4 shrink-0 text-[var(--icons-error-default)]"
            />
            <span className="flex-1">{alert}</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-[var(--space-200)] rounded-[var(--radius-200)] border border-[var(--orange-500)] bg-[var(--background-warning-default)] px-[var(--space-300)] py-[var(--space-250)] font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-warning-default)]"
          >
            <TriangleAlert
              aria-hidden
              className="mt-[2px] size-4 shrink-0 text-[var(--icons-warning-default)]"
            />
            <ul className="flex flex-1 flex-col gap-[var(--space-100)] font-[var(--body-font-weight-strong)]">
              {warnings.map((warning) => (
                <li
                  key={`${warning.slotId ?? warning.resourceName}-${warning.start}`}
                >
                  {busySentence(warning) ?? texts.failed}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mode === 'new' && (
          <Field id="slot-kind" label={texts.service}>
            <Select
              id="slot-kind"
              value={draft.kind}
              disabled={locked}
              onValueChange={(kind) =>
                edit({ ...draft, kind: kind as SlotKind })
              }
              options={[
                { value: 'service', label: texts.service },
                { value: 'block', label: texts.blockTime },
              ]}
            />
          </Field>
        )}
        {template ? (
          <Field id="slot-weekday" label={texts.weekday} required>
            <Select
              id="slot-weekday"
              value={weekdayOf(draft.date)}
              disabled={locked}
              onValueChange={(weekday) =>
                edit({
                  ...draft,
                  date: dateOf(weekday),
                })
              }
              options={WEEKDAYS.map((day) => ({
                value: day,
                label: weekdayLabel(day),
              }))}
            />
          </Field>
        ) : (
          <Field id="slot-date" label={texts.date} required error={errors.date}>
            <Input
              id="slot-date"
              type="date"
              value={draft.date}
              disabled={locked}
              data-invalid={errors.date ? true : undefined}
              onChange={(event) => edit({ ...draft, date: event.target.value })}
            />
          </Field>
        )}
        <Field
          id="slot-time"
          label={texts.startTime}
          required
          error={errors.time}
        >
          <div className="relative flex items-center">
            <Clock
              aria-hidden
              className="pointer-events-none absolute left-[var(--space-300)] size-4 text-[var(--icons-gray-secondary)]"
            />
            <Input
              id="slot-time"
              type="time"
              step={300}
              value={draft.time}
              disabled={locked}
              data-invalid={errors.time ? true : undefined}
              className="pl-[var(--space-800)] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              onChange={(event) => edit({ ...draft, time: event.target.value })}
            />
          </div>
        </Field>
        <Field
          id="slot-duration"
          label={texts.duration}
          required
          error={errors.duration}
        >
          <Input
            id="slot-duration"
            inputMode="numeric"
            value={draft.duration}
            disabled={locked}
            data-invalid={errors.duration ? true : undefined}
            onChange={(event) =>
              edit({ ...draft, duration: event.target.value })
            }
          />
        </Field>
        {!onlyPlace && (
          <Field
            id="slot-place"
            label={placeLabel(types, language)}
            required
            error={errors.place}
          >
            <Select
              id="slot-place"
              value={draft.placeResourceId}
              disabled={locked}
              invalid={Boolean(errors.place)}
              placeholder={texts.selectPlace}
              onValueChange={choosePlace}
              options={resources
                .filter(
                  (item) =>
                    types.find((type) => type.id === item.resourceTypeId)
                      ?.role === 'place',
                )
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Field>
        )}
        {draft.kind === 'block' && (
          <label className="flex items-center gap-[var(--space-200)]">
            <input
              type="checkbox"
              checked={draft.blocksAll}
              disabled={locked}
              onChange={(event) =>
                edit({ ...draft, blocksAll: event.target.checked })
              }
            />
            {texts.blocksAll}
          </label>
        )}
        {selectors.map((type) => {
          const options = optionsForType(type, resources, types, draft);
          const selected = draft.byType[type.id] ?? [];
          const label = typeLabel(
            type,
            language,
            type.multiple ? 'plural' : 'singular',
          );
          const error = errors[`type:${type.id}`];
          const disabled =
            locked || (offeringLocked && type.role === 'offering');
          if (type.multiple) {
            return (
              <Field
                key={type.id}
                id={`slot-type-${type.id}`}
                label={label}
                required={draft.kind === 'service' && type.required}
                error={error}
              >
                <MultiSelect
                  id={`slot-type-${type.id}`}
                  inline
                  value={selected}
                  disabled={disabled}
                  invalid={Boolean(error)}
                  onChange={(ids) => chooseMany(type, ids)}
                  options={options.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  placeholder={label}
                  searchPlaceholder={texts.search}
                  emptyText={texts.noOptions}
                  allSelectedText={texts.allSelected}
                />
              </Field>
            );
          }
          return (
            <Field
              key={type.id}
              id={`slot-type-${type.id}`}
              label={label}
              required={draft.kind === 'service' && type.required}
              error={error}
            >
              <Select
                id={`slot-type-${type.id}`}
                value={selected[0] ?? ''}
                disabled={disabled}
                invalid={Boolean(error)}
                placeholder={label}
                onValueChange={(value) => chooseOne(type, value)}
                options={options.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Field>
          );
        })}
        {draft.kind === 'block' && (
          <Field id="slot-note" label={texts.note}>
            <Input
              id="slot-note"
              value={draft.note}
              disabled={locked}
              onChange={(event) => edit({ ...draft, note: event.target.value })}
            />
          </Field>
        )}
        {draft.kind === 'service' && config.audienceEnabled && (
          <Field id="slot-audience" label={texts.audience}>
            <Select
              id="slot-audience"
              value={draft.audience}
              disabled={locked}
              onValueChange={(audience) =>
                edit({
                  ...draft,
                  audience: audience as SlotDraft['audience'],
                  places: audience === 'one_person' ? '' : draft.places,
                })
              }
              options={[
                { value: 'group', label: texts.group },
                { value: 'one_person', label: texts.onePersonOption },
              ]}
            />
          </Field>
        )}
        {placesRequired(draft, place, config.audienceEnabled) && (
          <Field
            id="slot-places"
            label={texts.places}
            required
            error={errors.places}
          >
            <Input
              id="slot-places"
              inputMode="numeric"
              value={draft.places}
              disabled={locked}
              data-invalid={errors.places ? true : undefined}
              onChange={(event) =>
                edit({ ...draft, places: event.target.value })
              }
            />
          </Field>
        )}
        {draft.kind === 'service' && config.formatEnabled && (
          <Field id="slot-format" label={texts.format}>
            <Select
              id="slot-format"
              value={virtual ? 'online_only' : draft.format}
              disabled={locked || virtual}
              onValueChange={(format) =>
                edit({
                  ...draft,
                  format: format as SlotDraft['format'],
                  places: format === 'online_only' ? '' : draft.places,
                })
              }
              options={[
                { value: 'offline', label: formatLabel('offline') },
                {
                  value: 'offline_and_online',
                  label: formatLabel('offline_and_online'),
                },
                { value: 'online_only', label: formatLabel('online_only') },
              ]}
            />
          </Field>
        )}
        {draft.kind === 'service' &&
          (mode === 'edit' || mode === 'past') &&
          statusChoices(mode === 'past' ? 'past' : 'edit', config.statuses)
            .length > 0 && (
            <Field id="slot-status" label={texts.status}>
              <Select
                id="slot-status"
                value={draft.status}
                disabled={!allowActions}
                onValueChange={(status) => edit({ ...draft, status })}
                options={statusChoices(
                  mode === 'past' ? 'past' : 'edit',
                  config.statuses,
                ).map((status) => ({
                  value: status,
                  label: statusLabel(status),
                }))}
              />
            </Field>
          )}
      </form>
    </Modal>
  );
}

function statusChoices(mode: 'edit' | 'past', enabled: string[]): string[] {
  if (mode === 'past') {
    return ['completed', 'no_show'].filter((status) =>
      enabled.includes(status),
    );
  }
  const active = ['planned', 'confirmed', 'in_progress', 'completed'].filter(
    (status) => enabled.includes(status),
  );
  if (enabled.includes('no_show')) active.push('no_show');
  return active;
}

function placeLabel(
  types: ResourceTypeConfig[],
  language: 'en' | 'sk' | 'uk',
): string {
  const place = types.find((type) => type.role === 'place');
  return place ? typeLabel(place, language, 'singular') : texts.selectPlace;
}

function windowTitle(
  draft: SlotDraft,
  resources: CatalogResource[],
  types: ResourceTypeConfig[],
): string {
  if (draft.kind === 'block') {
    return draft.note.trim() === '' ? texts.blockTime : draft.note.trim();
  }
  const offering = types.find((type) => type.role === 'offering');
  const id = offering ? draft.byType[offering.id]?.[0] : undefined;
  const name = resources.find((item) => item.id === id)?.name;
  return name ?? texts.service;
}

function weekdayOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const index = new Date(Date.UTC(year, (month ?? 1) - 1, day)).getUTCDay();
  const days = WEEKDAYS;
  return days[index === 0 ? 6 : index - 1] ?? 'monday';
}

function dateOf(weekday: string): string {
  const index = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const monday = new Date(Date.UTC(2026, 9, 12));
  monday.setUTCDate(monday.getUTCDate() + (index < 0 ? 0 : index));
  const year = monday.getUTCFullYear();
  const month = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(monday.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
