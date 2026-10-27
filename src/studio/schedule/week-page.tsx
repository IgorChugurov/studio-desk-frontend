'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { FilterMenu } from '../../shared/ui/filter-menu';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { ClassWindow } from './class-window';
import {
  addDays,
  clockInZone,
  hasStarted,
  instantOf,
  mondayOf,
  todayIn,
  wallOf,
  weekLabel,
} from './clock';
import {
  applyApiError,
  buildGrid,
  cellPast,
  classBody,
  draftFromClass,
  emptyDraft,
  validateDraft,
  type ClassInfo,
  type ClassTypeInfo,
  type Draft,
  type HallInfo,
  type Named,
} from './model';
import { formatLabel, texts } from './texts';
import { WeekGrid } from './week-grid';

const hallSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['ordinary', 'virtual']),
  timeZone: z.string(),
});
const namedSchema = z.object({ id: z.string(), name: z.string() });
const classTypeSchema = namedSchema.extend({
  defaultDuration: z.number(),
  trainerIds: z.array(z.string()).optional(),
});
const classSchema = z.object({
  id: z.string(),
  hallId: z.string(),
  date: z.string(),
  startTime: z.string(),
  durationMinutes: z.number(),
  trainerIds: z.array(z.string()),
  classTypeId: z.string(),
  audience: z.enum(['group', 'one_person']),
  format: z.enum(['offline', 'offline_and_online', 'online_only']),
  places: z.number().nullable(),
  cancelled: z.boolean(),
});
const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    meta: z.object({ totalPages: z.number() }),
  });

type FormDialog = {
  kind: 'form';
  mode: 'new' | 'edit' | 'replace' | 'past' | 'cancelled';
  classId?: string;
  draft: Draft;
  returnTo?: FormDialog;
};
type ListDialog = { kind: 'list'; classIds: string[] };
type ConfirmDialog = {
  kind: 'confirm';
  action: 'cancel' | 'delete';
  classId: string;
  returnTo: FormDialog | ListDialog;
};
type Dialog = FormDialog | ListDialog | ConfirmDialog;

/** Schedule week. Filters live here and reset when the page unmounts. */
export function WeekPage() {
  const session = useSession();
  if (session.status !== 'signed-in') return null;
  return <WeekScreen email={session.email} />;
}

function WeekScreen({ email }: { email: string }) {
  const storageKey = `schedule-night-bands:${email}`;
  const [role, setRole] = useState<string | null>(null);
  const [halls, setHalls] = useState<HallInfo[] | null>(null);
  const [trainers, setTrainers] = useState<Named[] | null>(null);
  const [classTypes, setClassTypes] = useState<ClassTypeInfo[] | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [studioZone, setStudioZone] = useState<string | null>(null);
  const [viewZone, setViewZone] = useState<string | null>(null);
  const [monday, setMonday] = useState<string | null>(null);
  const [columnMode, setColumnMode] = useState<'halls' | 'trainers'>('halls');
  const [hallId, setHallId] = useState('all');
  const [trainerId, setTrainerId] = useState('all');
  const [classTypeId, setClassTypeId] = useState('all');
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  const [reload, setReload] = useState(0);
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [earlyPref, setEarlyPref] = useState(() => readBands(storageKey).early);
  const [latePref, setLatePref] = useState(() => readBands(storageKey).late);
  const [calendar, setCalendar] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [me, settings, options, hallPage, trainerPage, typePage] =
          await Promise.all([
            getApi().request<unknown>('/me'),
            getApi().request<unknown>('/settings'),
            getApi().request<unknown>('/settings/options'),
            loadAll('/halls', hallSchema),
            loadAll('/trainers', namedSchema),
            loadAll('/class-types', classTypeSchema),
          ]);
        if (gone) return;
        const zone = z
          .object({ timeZone: z.string() })
          .parse(settings).timeZone;
        const list = z
          .object({ timeZones: z.array(z.string()) })
          .parse(options).timeZones;
        setRole(z.object({ role: z.string() }).parse(me).role);
        setHalls(hallPage);
        setTrainers(trainerPage);
        setClassTypes(
          typePage.map((item) => ({
            ...item,
            trainerIds: item.trainerIds ?? [],
          })),
        );
        setZones(list.includes(zone) ? list : [zone, ...list]);
        setStudioZone(zone);
        setViewZone(zone);
        setMonday(mondayOf(todayIn(zone)));
      } catch {
        if (!gone) notify.error(texts.failed);
      }
    })();
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    if (!monday) return;
    let gone = false;
    const params = new URLSearchParams({
      from: monday,
      to: addDays(monday, 6),
    });
    if (hallId !== 'all') params.set('hallId', hallId);
    if (trainerId !== 'all') params.set('trainerId', trainerId);
    void getApi()
      .request<unknown>(`/classes?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        setClasses(
          z
            .object({ items: z.array(classSchema) })
            .parse(body)
            .items.map((item) => ({
              ...item,
              startTime: item.startTime.slice(0, 5),
            })),
        );
      })
      .catch(() => {
        if (!gone) notify.error(texts.failed);
      });
    return () => {
      gone = true;
    };
  }, [monday, hallId, trainerId, reload]);

  const model = useMemo(() => {
    if (
      !viewZone ||
      !monday ||
      !classes ||
      !halls ||
      !trainers ||
      !classTypes
    ) {
      return null;
    }
    return buildGrid({
      classes,
      halls,
      trainers,
      classTypes,
      viewZone,
      hallId,
      trainerId,
      classTypeId,
      columns: columnMode,
      monday,
    });
  }, [
    viewZone,
    monday,
    classes,
    halls,
    trainers,
    classTypes,
    hallId,
    trainerId,
    classTypeId,
    columnMode,
  ]);

  useEffect(() => {
    if (model?.kind !== 'down') return;
    const today = document.getElementById('schedule-today');
    if (today && typeof today.scrollIntoView === 'function') {
      today.scrollIntoView({ block: 'nearest' });
    }
  }, [model?.kind, monday]);

  if (
    !model ||
    !viewZone ||
    !monday ||
    !studioZone ||
    !halls ||
    !trainers ||
    !classTypes
  ) {
    return <div className="flex-1" aria-busy="true" />;
  }

  const allowActions = role === 'owner' || role === 'administrator';
  const earlyOpen = earlyPref || model.night.early;
  const lateOpen = latePref || model.night.late;

  function remember(next: { early: boolean; late: boolean }) {
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function chooseHall(id: string) {
    setHallId(id);
    if (id === 'all') setViewZone(studioZone);
    else {
      const hall = halls?.find((item) => item.id === id);
      if (hall) setViewZone(hall.timeZone);
    }
  }

  function moveWeek(days: number) {
    setMonday(addDays(monday!, days));
    setClosedDays([]);
  }

  function openClass(classId: string) {
    const item = classes?.find((entry) => entry.id === classId);
    const hall = halls?.find((entry) => entry.id === item?.hallId);
    if (!item || !hall) return;
    const past = hasStarted(item.date, item.startTime, hall.timeZone);
    const mode =
      !allowActions || past ? 'past' : item.cancelled ? 'cancelled' : 'edit';
    setErrors({});
    setAlert(null);
    setDialog({
      kind: 'form',
      mode,
      classId,
      draft: draftFromClass(item, hall.timeZone, viewZone!),
    });
  }

  function openCreate(date: string, minutes: number, columnId: string) {
    let nextHall = hallId;
    let nextTrainer = trainerId;
    if (model?.kind === 'down') {
      if (columnMode === 'halls') nextHall = columnId;
      else nextTrainer = columnId;
    }
    const hall = halls?.find((item) => item.id === nextHall);
    setErrors({});
    setAlert(null);
    setDialog({
      kind: 'form',
      mode: 'new',
      draft: emptyDraft({
        date,
        time: minutesToTime(minutes),
        hallId: nextHall,
        trainerId: nextTrainer,
        hall,
      }),
    });
  }

  async function save(draft: Draft) {
    if (dialog?.kind !== 'form' || !viewZone) return;
    const hall = halls?.find((item) => item.id === draft.hallId);
    const problems = validateDraft(
      draft,
      hall,
      viewZone,
      dialog.mode !== 'edit',
    );
    if (!hall || Object.keys(problems).length > 0) {
      setErrors(problems);
      setAlert(null);
      return;
    }
    setPending(true);
    try {
      const body = classBody(draft, hall, viewZone, dialog.mode !== 'edit');
      if (dialog.mode === 'new') {
        await getApi().request('/classes', { method: 'POST', body });
        notify.success(texts.added);
      } else if (dialog.mode === 'replace' && dialog.classId) {
        await getApi().request(`/classes/${dialog.classId}/replace`, {
          method: 'POST',
          body,
        });
        notify.success(texts.classReplaced);
      } else if (dialog.classId) {
        await getApi().request(`/classes/${dialog.classId}`, {
          method: 'PATCH',
          body,
        });
        notify.success(texts.updated);
      }
      setDialog(null);
      setReload((value) => value + 1);
    } catch (error) {
      const applied =
        error instanceof ApiError
          ? applyApiError(error, draft, hall, viewZone)
          : { fields: {}, alert: texts.failed };
      setErrors(applied.fields);
      setAlert(applied.alert);
    } finally {
      setPending(false);
    }
  }

  async function runConfirm() {
    if (dialog?.kind !== 'confirm') return;
    setPending(true);
    try {
      if (dialog.action === 'cancel') {
        await getApi().request(`/classes/${dialog.classId}/cancel`, {
          method: 'POST',
        });
        notify.success(texts.classCancelled);
      } else {
        await getApi().request(`/classes/${dialog.classId}`, {
          method: 'DELETE',
        });
        notify.success(texts.classDeleted);
      }
      setDialog(null);
      setAlert(null);
      setReload((value) => value + 1);
    } catch (error) {
      setAlert(error instanceof ApiError ? failureAlert(error) : texts.failed);
    } finally {
      setPending(false);
    }
  }

  async function restore(classId: string) {
    setPending(true);
    try {
      await getApi().request(`/classes/${classId}/restore`, { method: 'POST' });
      notify.success(texts.classRestored);
      setDialog(null);
      setAlert(null);
      setReload((value) => value + 1);
    } catch (error) {
      setAlert(error instanceof ApiError ? failureAlert(error) : texts.failed);
    } finally {
      setPending(false);
    }
  }

  const form = dialog?.kind === 'form' ? dialog : null;
  const list = dialog?.kind === 'list' ? dialog : null;
  const confirm = dialog?.kind === 'confirm' ? dialog : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
      <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-200)]">
        <Button
          type="button"
          variant="outlined"
          size="md"
          aria-label={texts.previousWeek}
          onClick={() => moveWeek(-7)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="md"
          onClick={() => setCalendar(true)}
        >
          {weekLabel(monday)}
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="md"
          aria-label={texts.nextWeek}
          onClick={() => moveWeek(7)}
        >
          <ChevronRight aria-hidden />
        </Button>
        {model.kind === 'down' && (
          <>
            <Button
              type="button"
              size="md"
              variant={columnMode === 'halls' ? 'cta' : 'outlined'}
              aria-pressed={columnMode === 'halls'}
              onClick={() => setColumnMode('halls')}
            >
              {texts.halls}
            </Button>
            <Button
              type="button"
              size="md"
              variant={columnMode === 'trainers' ? 'cta' : 'outlined'}
              aria-pressed={columnMode === 'trainers'}
              onClick={() => setColumnMode('trainers')}
            >
              {texts.trainers}
            </Button>
          </>
        )}
        <FilterMenu
          label={texts.hall}
          showLabel
          value={hallId}
          onChange={chooseHall}
          options={[
            { value: 'all', label: texts.all },
            ...halls.map((hall) => ({ value: hall.id, label: hall.name })),
          ]}
        />
        <FilterMenu
          label={texts.trainer}
          showLabel
          value={trainerId}
          onChange={setTrainerId}
          options={[
            { value: 'all', label: texts.all },
            ...trainers.map((trainer) => ({
              value: trainer.id,
              label: trainer.name,
            })),
          ]}
        />
        <FilterMenu
          label={texts.classType}
          showLabel
          value={classTypeId}
          onChange={setClassTypeId}
          options={[
            { value: 'all', label: texts.all },
            ...classTypes.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <label
          htmlFor="view-zone"
          className="flex items-center gap-[var(--space-200)]"
        >
          <span className="font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] text-[var(--text-gray-secondary)]">
            {texts.timeZone}
          </span>
          <div className="w-52">
            <Select
              id="view-zone"
              value={viewZone}
              onValueChange={setViewZone}
              options={zones.map((zone) => ({ value: zone, label: zone }))}
            />
          </div>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <WeekGrid
          model={model}
          earlyOpen={earlyOpen}
          lateOpen={lateOpen}
          closedDays={closedDays}
          allowCreate={allowActions}
          isPast={(date, minutes) => cellPast(date, minutes, viewZone)}
          onToggleDay={(date) =>
            setClosedDays((current) =>
              current.includes(date)
                ? current.filter((item) => item !== date)
                : [...current, date],
            )
          }
          onToggleEarly={() => {
            const next = !earlyOpen;
            setEarlyPref(next);
            remember({ early: next, late: latePref });
          }}
          onToggleLate={() => {
            const next = !lateOpen;
            setLatePref(next);
            remember({ early: earlyPref, late: next });
          }}
          onCreate={openCreate}
          onOpenClass={openClass}
          onOpenCancelled={(classIds) => {
            setAlert(null);
            setDialog({ kind: 'list', classIds });
          }}
        />
      </div>
      {calendar && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setCalendar(false);
          }}
          title={weekLabel(monday)}
          actions={
            <Button
              type="button"
              variant="outlined"
              size="md"
              onClick={() => setCalendar(false)}
            >
              {texts.back}
            </Button>
          }
        >
          <Field id="week-date" label={texts.date}>
            <Input
              id="week-date"
              type="date"
              value={monday}
              onChange={(event) => {
                if (!event.target.value) return;
                setMonday(mondayOf(event.target.value));
                setClosedDays([]);
                setCalendar(false);
              }}
            />
          </Field>
        </Modal>
      )}
      {form && (
        <ClassWindow
          key={`${form.mode}-${form.classId ?? 'new'}`}
          mode={form.mode}
          initial={form.draft}
          halls={halls}
          trainers={trainers}
          classTypes={classTypes}
          errors={errors}
          alert={alert}
          pending={pending}
          allowActions={allowActions}
          onEdit={() => {
            setErrors({});
            setAlert(null);
          }}
          onSubmit={(draft) => void save(draft)}
          onBack={() => {
            setErrors({});
            setAlert(null);
            setDialog(form.returnTo ?? null);
          }}
          onCancelClass={() =>
            form.classId &&
            setDialog({
              kind: 'confirm',
              action: 'cancel',
              classId: form.classId,
              returnTo: form,
            })
          }
          onReplace={(draft) =>
            setDialog({
              kind: 'form',
              mode: 'replace',
              classId: form.classId,
              draft: { ...draft, classTypeId: '' },
              returnTo: { ...form, draft },
            })
          }
          onDelete={() =>
            form.classId &&
            setDialog({
              kind: 'confirm',
              action: 'delete',
              classId: form.classId,
              returnTo: form,
            })
          }
          onRestore={() => form.classId && void restore(form.classId)}
        />
      )}
      {list && (
        <CancelledList
          classIds={list.classIds}
          classes={classes ?? []}
          halls={halls}
          trainers={trainers}
          classTypes={classTypes}
          viewZone={viewZone}
          allowActions={allowActions}
          alert={alert}
          pending={pending}
          onRestore={(classId) => void restore(classId)}
          onDelete={(classId) =>
            setDialog({
              kind: 'confirm',
              action: 'delete',
              classId,
              returnTo: list,
            })
          }
          onBack={() => {
            setAlert(null);
            setDialog(null);
          }}
        />
      )}
      {confirm && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open && !pending) setDialog(confirm.returnTo);
          }}
          title={
            confirm.action === 'cancel' ? texts.cancelTitle : texts.deleteTitle
          }
          actions={
            <>
              <Button
                type="button"
                variant="outlined"
                size="md"
                disabled={pending}
                onClick={() => setDialog(confirm.returnTo)}
              >
                {texts.back}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                loading={pending}
                onClick={() => void runConfirm()}
              >
                {confirm.action === 'cancel' ? texts.cancelClass : texts.delete}
              </Button>
            </>
          }
        >
          {alert && <p role="alert">{alert}</p>}
          <p>
            {confirm.action === 'cancel' ? texts.cancelBody : texts.deleteBody}
          </p>
        </Modal>
      )}
    </div>
  );
}

function CancelledList({
  classIds,
  classes,
  halls,
  trainers,
  classTypes,
  viewZone,
  allowActions,
  alert,
  pending,
  onRestore,
  onDelete,
  onBack,
}: {
  classIds: string[];
  classes: ClassInfo[];
  halls: HallInfo[];
  trainers: Named[];
  classTypes: ClassTypeInfo[];
  viewZone: string;
  allowActions: boolean;
  alert: string | null;
  pending: boolean;
  onRestore: (classId: string) => void;
  onDelete: (classId: string) => void;
  onBack: () => void;
}) {
  const rows = classIds.flatMap((id) => {
    const item = classes.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onBack();
      }}
      title={texts.cancelled}
      actions={
        <Button type="button" variant="outlined" size="md" onClick={onBack}>
          {texts.back}
        </Button>
      }
    >
      {alert && <p role="alert">{alert}</p>}
      <ul className="flex flex-col gap-[var(--space-300)]">
        {rows.map((item) => {
          const hall = halls.find((entry) => entry.id === item.hallId);
          const future = hall
            ? !hasStarted(item.date, item.startTime, hall.timeZone)
            : false;
          return (
            <li key={item.id} className="flex flex-col gap-[var(--space-100)]">
              <span>
                {
                  classTypes.find((entry) => entry.id === item.classTypeId)
                    ?.name
                }
              </span>
              <span>{rowTime(item, hall, viewZone)}</span>
              <span>{hall?.name}</span>
              <span>
                {item.trainerIds
                  .map((id) => trainers.find((entry) => entry.id === id)?.name)
                  .filter((name): name is string => name !== undefined)
                  .join(', ')}
              </span>
              <span>{formatLabel(item.format)}</span>
              {item.places !== null && <span>{item.places}</span>}
              {allowActions && future && (
                <span className="flex gap-[var(--space-200)]">
                  <Button
                    type="button"
                    variant="outlined"
                    size="md"
                    disabled={pending}
                    onClick={() => onRestore(item.id)}
                  >
                    {texts.restore}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    disabled={pending}
                    onClick={() => onDelete(item.id)}
                  >
                    {texts.delete}
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

function rowTime(
  item: ClassInfo,
  hall: HallInfo | undefined,
  viewZone: string,
): string {
  if (!hall) return item.startTime;
  const start = clockInZone(item.date, item.startTime, hall.timeZone, viewZone);
  const end = wallOf(
    new Date(
      instantOf(item.date, item.startTime, hall.timeZone).getTime() +
        item.durationMinutes * 60_000,
    ),
    viewZone,
  );
  const endText =
    end.time === '00:00' && end.date !== start.date ? '24:00' : end.time;
  return `${start.time}–${endText}`;
}

function failureAlert(error: ApiError): string {
  return (
    applyApiError(
      error,
      emptyDraft({ date: '', time: '00:00', hallId: 'all', trainerId: 'all' }),
      undefined,
      'UTC',
    ).alert ?? texts.failed
  );
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function readBands(key: string): { early: boolean; late: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { early: false, late: false };
    const parsed = JSON.parse(raw) as { early?: unknown; late?: unknown };
    return { early: parsed.early === true, late: parsed.late === true };
  } catch {
    return { early: false, late: false };
  }
}

async function loadAll<T>(path: string, item: z.ZodType<T>): Promise<T[]> {
  const schema = pageSchema(item);
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = schema.parse(
      await getApi().request(
        `${path}?currentPage=${page}&perPage=100&sortBy=name&order=ASC`,
      ),
    );
    items.push(...body.items);
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return items;
}
