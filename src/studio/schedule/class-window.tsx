import { useState, type FormEvent } from 'react';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { MultiSelect } from '../../shared/ui/multi-select';
import { Select } from '../../shared/ui/select';
import {
  offeredTrainers,
  placesRequired,
  type ClassTypeInfo,
  type Draft,
  type HallInfo,
  type Named,
} from './model';
import { formatLabel, texts } from './texts';

/** The class window: new, edit, replace, past, and a future cancelled class. */
export function ClassWindow({
  mode,
  initial,
  halls,
  trainers,
  classTypes,
  errors,
  alert,
  pending,
  allowActions,
  onEdit,
  onSubmit,
  onBack,
  onCancelClass,
  onReplace,
  onDelete,
  onRestore,
}: {
  mode: 'new' | 'edit' | 'replace' | 'past' | 'cancelled';
  initial: Draft;
  halls: HallInfo[];
  trainers: Named[];
  classTypes: ClassTypeInfo[];
  errors: Record<string, string>;
  alert: string | null;
  pending: boolean;
  allowActions: boolean;
  onEdit: () => void;
  onSubmit: (draft: Draft) => void;
  onBack: () => void;
  onCancelClass: () => void;
  onReplace: (draft: Draft) => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const hall = halls.find((item) => item.id === draft.hallId);
  const locked = !allowActions || mode === 'past' || mode === 'cancelled';
  const typeLocked = locked || mode === 'edit';
  const virtual = hall?.type === 'virtual';
  const classType = classTypes.find((item) => item.id === draft.classTypeId);

  function edit(next: Draft) {
    setDraft(next);
    onEdit();
  }

  function chooseHall(hallId: string) {
    const next = halls.find((item) => item.id === hallId);
    edit({
      ...draft,
      hallId,
      format: next?.type === 'virtual' ? 'online_only' : draft.format,
      places: next?.type === 'virtual' ? '' : draft.places,
    });
  }

  function chooseType(classTypeId: string) {
    const next = classTypes.find((item) => item.id === classTypeId);
    edit({
      ...draft,
      classTypeId,
      duration: next ? String(next.defaultDuration) : draft.duration,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(draft);
  }

  const showSave =
    allowActions && (mode === 'new' || mode === 'edit' || mode === 'replace');
  const showEditActions = allowActions && mode === 'edit';
  const showCancelledActions = allowActions && mode === 'cancelled';

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onBack();
      }}
      title={
        mode === 'new' || mode === 'replace'
          ? texts.newClass
          : draftTitle(classType)
      }
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
          {showEditActions && (
            <Button
              type="button"
              variant="outlined"
              size="md"
              onClick={onCancelClass}
              disabled={pending}
            >
              {texts.cancelClass}
            </Button>
          )}
          {showEditActions && (
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
          {showCancelledActions && (
            <Button
              type="button"
              variant="outlined"
              size="md"
              onClick={onRestore}
              disabled={pending}
              loading={pending}
            >
              {texts.restore}
            </Button>
          )}
          {(showEditActions || showCancelledActions) && (
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
          {showSave && (
            <Button
              type="submit"
              form="class-form"
              variant="cta"
              size="md"
              loading={pending}
            >
              {texts.save}
            </Button>
          )}
        </>
      }
    >
      <form
        id="class-form"
        className="flex flex-col gap-[var(--space-300)]"
        onSubmit={submit}
      >
        {alert && <p role="alert">{alert}</p>}
        <Field id="class-date" label={texts.date} required error={errors.date}>
          <Input
            id="class-date"
            type="date"
            value={draft.date}
            disabled={locked}
            data-invalid={errors.date ? true : undefined}
            onChange={(event) => edit({ ...draft, date: event.target.value })}
          />
        </Field>
        <Field
          id="class-time"
          label={texts.startTime}
          required
          error={errors.time}
        >
          <Input
            id="class-time"
            value={draft.time}
            disabled={locked}
            data-invalid={errors.time ? true : undefined}
            onChange={(event) => edit({ ...draft, time: event.target.value })}
          />
        </Field>
        <Field id="class-hall" label={texts.hall} required error={errors.hall}>
          <Select
            id="class-hall"
            value={draft.hallId}
            disabled={locked}
            invalid={Boolean(errors.hall)}
            placeholder={texts.selectHall}
            onValueChange={chooseHall}
            options={halls.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Field>
        <Field
          id="class-type"
          label={texts.classType}
          required
          error={errors.classType}
        >
          <Select
            id="class-type"
            value={draft.classTypeId}
            disabled={typeLocked}
            invalid={Boolean(errors.classType)}
            placeholder={texts.selectClassType}
            onValueChange={chooseType}
            options={classTypes.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Field>
        <Field
          id="class-duration"
          label={texts.duration}
          required
          error={errors.duration}
        >
          <Input
            id="class-duration"
            inputMode="numeric"
            value={draft.duration}
            disabled={locked}
            data-invalid={errors.duration ? true : undefined}
            onChange={(event) =>
              edit({ ...draft, duration: event.target.value })
            }
          />
        </Field>
        <Field
          id="class-trainers"
          label={texts.trainersField}
          required
          error={errors.trainers}
        >
          <MultiSelect
            id="class-trainers"
            inline
            value={draft.trainerIds}
            disabled={locked}
            invalid={Boolean(errors.trainers)}
            onChange={(trainerIds) => edit({ ...draft, trainerIds })}
            options={offeredTrainers(classType, trainers, draft.trainerIds).map(
              (item) => ({
                value: item.id,
                label: item.name,
              }),
            )}
            placeholder={texts.trainersField}
            searchPlaceholder={texts.search}
            emptyText={texts.noOptions}
            allSelectedText={texts.allSelected}
          />
        </Field>
        <Field id="class-audience" label={texts.audience}>
          <Select
            id="class-audience"
            value={draft.audience}
            disabled={locked}
            onValueChange={(audience) =>
              edit({
                ...draft,
                audience: audience as Draft['audience'],
                places: audience === 'one_person' ? '' : draft.places,
              })
            }
            options={[
              { value: 'group', label: texts.group },
              { value: 'one_person', label: texts.onePersonOption },
            ]}
          />
        </Field>
        {placesRequired(draft, hall) && (
          <Field
            id="class-places"
            label={texts.places}
            required
            error={errors.places}
          >
            <Input
              id="class-places"
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
        <Field id="class-format" label={texts.format}>
          <Select
            id="class-format"
            value={virtual ? 'online_only' : draft.format}
            disabled={locked || virtual}
            onValueChange={(format) =>
              edit({
                ...draft,
                format: format as Draft['format'],
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
      </form>
    </Modal>
  );
}

function draftTitle(classType: ClassTypeInfo | undefined): string {
  return classType?.name ?? texts.classType;
}
