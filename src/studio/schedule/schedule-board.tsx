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
import { ApiError, type ApiConflict } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import {
  resourcePageSchema,
  sortedTypes,
  typeLabel,
  type CatalogResource,
  type ResourceTypeConfig,
} from '../catalogs/resource-types';
import {
  addDays,
  hasStarted,
  mondayOf,
  todayIn,
  weekDates,
  weekLabel,
} from './clock';
import {
  applyApiError,
  buildGrid,
  canWriteSchedule,
  cellPast,
  columnTypes,
  defaultColumnTypeId,
  draftFromSlot,
  emptyDraft,
  slotPayload,
  validateDraft,
  viewZoneFor,
  type SlotDraft,
  type SlotInfo,
} from './model';
import { SlotWindow, type SlotMode } from './slot-window';
import { statusLabel, texts } from './texts';
import { WeekActions } from './week-actions';
import { WeekGrid } from './week-grid';

const slotSchema = z.object({
  id: z.string(),
  kind: z.enum(['service', 'block']),
  placeResourceId: z.string(),
  resourceIds: z.array(z.string()),
  date: z.string(),
  startTime: z.string(),
  durationMinutes: z.number(),
  audience: z.enum(['group', 'one_person']).nullable(),
  format: z.enum(['offline', 'offline_and_online', 'online_only']).nullable(),
  places: z.number().nullable(),
  note: z.string().nullable(),
  blocksAll: z.boolean(),
  status: z.string(),
  occupiesResources: z.boolean(),
});

type FormDialog = {
  kind: 'form';
  mode: SlotMode;
  slotId?: string;
  draft: SlotDraft;
};
type ListDialog = { kind: 'list'; slotIds: string[] };
type ConfirmDialog = {
  kind: 'confirm';
  action: 'cancel' | 'delete';
  slotId: string;
  returnTo: FormDialog | ListDialog;
};
type Dialog = FormDialog | ListDialog | ConfirmDialog;

/** Week grid of schedule slots. Embedded pages lock one resource and hide week actions. */
export function ScheduleBoard({
  embeddedResourceId,
}: {
  embeddedResourceId?: string;
}) {
  const session = useSession();
  if (session.status !== 'signed-in') return null;
  return (
    <Board
      email={session.email}
      language={session.language}
      types={sortedTypes(session.config.catalogConfig.resourceTypes)}
      schedule={session.config.scheduleConfig}
      embeddedResourceId={embeddedResourceId}
    />
  );
}

function Board({
  email,
  language,
  types,
  schedule,
  embeddedResourceId,
}: {
  email: string;
  language: 'en' | 'sk' | 'uk';
  types: ResourceTypeConfig[];
  schedule: {
    audienceEnabled: boolean;
    formatEnabled: boolean;
    statuses: string[];
  };
  embeddedResourceId?: string;
}) {
  const storageKey = `schedule-night-bands:${email}`;
  const typeKey = types.map((type) => type.id).join(',');
  const [role, setRole] = useState<string | null>(null);
  const [resources, setResources] = useState<CatalogResource[] | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [orgZone, setOrgZone] = useState<string | null>(null);
  const [zoneChoice, setZoneChoice] = useState<string | null>(null);
  const [monday, setMonday] = useState<string | null>(null);
  const [columnTypeId, setColumnTypeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<SlotInfo[] | null>(null);
  const [reload, setReload] = useState(0);
  const [closedChoice, setClosedChoice] = useState<{
    key: string;
    dates: string[];
  } | null>(null);
  const [earlyPref, setEarlyPref] = useState(() => readBands(storageKey).early);
  const [latePref, setLatePref] = useState(() => readBands(storageKey).late);
  const [calendar, setCalendar] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ApiConflict[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [me, settings, options, lists] = await Promise.all([
          getApi().request<unknown>('/me'),
          getApi().request<unknown>('/settings'),
          getApi().request<unknown>('/settings/options'),
          Promise.all(types.map((type) => loadResources(type.id))),
        ]);
        if (gone) return;
        const zone = z
          .object({ timeZone: z.string() })
          .parse(settings).timeZone;
        const list = z
          .object({ timeZones: z.array(z.string()) })
          .parse(options).timeZones;
        const loaded = lists.flat();
        setRole(z.object({ role: z.string() }).parse(me).role);
        setResources(loaded);
        setZones(list.includes(zone) ? list : [zone, ...list]);
        setOrgZone(zone);
        setMonday((current) => current ?? mondayOf(todayIn(zone)));
        setColumnTypeId(
          (current) => current ?? defaultColumnTypeId(types, loaded),
        );
        setFilters((current) => {
          if (Object.keys(current).length > 0) return current;
          const next: Record<string, string> = {};
          for (const type of types) next[type.id] = 'all';
          return next;
        });
      } catch {
        if (!gone) notify.error(texts.failed);
      }
    })();
    return () => {
      gone = true;
    };
  }, [typeKey, types]);

  useEffect(() => {
    if (!monday) return;
    let gone = false;
    const params = new URLSearchParams({
      from: monday,
      to: addDays(monday, 6),
    });
    if (embeddedResourceId) params.set('resourceId', embeddedResourceId);
    void getApi()
      .request<unknown>(`/schedule-slots?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        setSlots(
          z
            .object({ items: z.array(slotSchema) })
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
  }, [monday, reload, embeddedResourceId]);

  const ruleZone =
    orgZone && resources
      ? viewZoneFor({
          orgZone,
          resources,
          types,
          filters,
          embeddedResourceId,
        })
      : null;
  const viewZone = zoneChoice ?? ruleZone;
  const closedKey = monday && viewZone ? `${monday}|${viewZone}` : '';
  const closedDays =
    monday && viewZone ? chosenClosedDays(monday, viewZone, closedChoice) : [];

  const model = useMemo(() => {
    if (!viewZone || !monday || !slots || !resources || !columnTypeId)
      return null;
    return buildGrid({
      slots,
      resources,
      types,
      viewZone,
      columnTypeId,
      filters,
      monday,
      layout: embeddedResourceId ? 'week' : undefined,
      contextResourceId: embeddedResourceId,
      audienceEnabled: schedule.audienceEnabled,
      formatEnabled: schedule.formatEnabled,
      language,
    });
  }, [
    viewZone,
    monday,
    slots,
    resources,
    columnTypeId,
    filters,
    types,
    embeddedResourceId,
    schedule.audienceEnabled,
    schedule.formatEnabled,
    language,
  ]);

  useEffect(() => {
    if (model?.kind !== 'down') return;
    const today = document.getElementById('schedule-today');
    if (today && typeof today.scrollIntoView === 'function') {
      today.scrollIntoView({ block: 'nearest' });
    }
  }, [model?.kind, monday]);

  if (!model || !viewZone || !monday || !resources || !columnTypeId || !slots) {
    return null;
  }

  const allowActions = canWriteSchedule(role);
  const earlyOpen = earlyPref || model.night.early;
  const lateOpen = latePref || model.night.late;
  const form = dialog?.kind === 'form' ? dialog : null;
  const list = dialog?.kind === 'list' ? dialog : null;
  const confirm = dialog?.kind === 'confirm' ? dialog : null;

  function remember(bands: { early: boolean; late: boolean }) {
    localStorage.setItem(storageKey, JSON.stringify(bands));
  }

  function moveWeek(days: number) {
    setMonday(addDays(monday!, days));
  }

  function openCreate(date: string, minutes: number, columnId: string) {
    setErrors({});
    setAlert(null);
    setWarnings([]);
    setDialog({
      kind: 'form',
      mode: 'new',
      draft: emptyDraft({
        date,
        time: minutesToTime(minutes),
        placeResourceId: '',
        columnTypeId:
          model?.kind === 'down' ? (columnTypeId ?? undefined) : undefined,
        columnResourceId: model?.kind === 'down' ? columnId : undefined,
        resources: resources ?? [],
        types,
        audienceEnabled: schedule.audienceEnabled,
      }),
    });
  }

  function openSlot(slotId: string) {
    const slot = slots?.find((item) => item.id === slotId);
    if (!slot || !viewZone || !resources) return;
    if (!slot.occupiesResources) {
      setDialog({ kind: 'list', slotIds: [slotId] });
      return;
    }
    const place = resources.find((item) => item.id === slot.placeResourceId);
    const past = place?.timeZone
      ? hasStarted(slot.date, slot.startTime, place.timeZone)
      : false;
    setErrors({});
    setAlert(null);
    setWarnings([]);
    setDialog({
      kind: 'form',
      mode: past ? 'past' : 'edit',
      slotId,
      draft: draftFromSlot(slot, resources, types, viewZone),
    });
  }

  async function save(draft: SlotDraft) {
    if (!resources || !viewZone || !form) return;
    const fields = validateDraft(
      draft,
      resources,
      types,
      viewZone,
      schedule,
      language,
    );
    if (form.mode !== 'past' && Object.keys(fields).length > 0) {
      setErrors(fields);
      return;
    }
    const place = resources.find((item) => item.id === draft.placeResourceId);
    if (!place) return;
    const confirmOverlap = warnings.length > 0;
    setPending(true);
    try {
      if (form.mode === 'past' && form.slotId) {
        await getApi().request(`/schedule-slots/${form.slotId}`, {
          method: 'PATCH',
          body: {
            status: draft.status,
            ...(confirmOverlap ? { confirmOverlap: true } : {}),
          },
        });
        notify.success(texts.updated);
      } else if (form.mode === 'new') {
        const body = slotPayload(
          draft,
          place,
          viewZone,
          schedule,
          confirmOverlap,
        );
        await getApi().request('/schedule-slots', { method: 'POST', body });
        notify.success(texts.added);
      } else if (form.mode === 'replace' && form.slotId) {
        const body = slotPayload(
          draft,
          place,
          viewZone,
          schedule,
          confirmOverlap,
        );
        await getApi().request(`/schedule-slots/${form.slotId}/replace`, {
          method: 'POST',
          body,
        });
        notify.success(texts.slotReplaced);
      } else if (form.slotId) {
        const body = slotPayload(
          draft,
          place,
          viewZone,
          schedule,
          confirmOverlap,
        );
        delete body.kind;
        await getApi().request(`/schedule-slots/${form.slotId}`, {
          method: 'PATCH',
          body,
        });
        notify.success(texts.updated);
      }
      setDialog(null);
      setWarnings([]);
      setReload((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'OVERLAP_WARNING') {
        setWarnings(error.conflicts);
        setAlert(null);
      } else if (error instanceof ApiError) {
        const applied = applyApiError(error, draft, place, viewZone);
        setErrors(applied.fields);
        setAlert(applied.alert);
        setWarnings([]);
      } else notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

  async function runAction(
    action: 'cancel' | 'delete' | 'restore',
    slotId: string,
    confirmOverlap = false,
  ) {
    setPending(true);
    try {
      if (action === 'cancel') {
        await getApi().request(`/schedule-slots/${slotId}/cancel`, {
          method: 'POST',
        });
        notify.success(texts.slotCancelled);
      } else if (action === 'delete') {
        await getApi().request(`/schedule-slots/${slotId}`, {
          method: 'DELETE',
        });
        notify.success(texts.slotDeleted);
      } else {
        await getApi().request(`/schedule-slots/${slotId}/restore`, {
          method: 'POST',
          body: confirmOverlap ? { confirmOverlap: true } : {},
        });
        notify.success(texts.slotRestored);
      }
      setDialog(null);
      setWarnings([]);
      setReload((value) => value + 1);
    } catch (error) {
      if (
        action === 'restore' &&
        error instanceof ApiError &&
        error.code === 'OVERLAP_WARNING'
      ) {
        setWarnings(error.conflicts);
        setAlert(null);
      } else if (error instanceof ApiError) {
        setAlert(applyApiError(error, emptyFallback(), undefined, 'UTC').alert);
      } else notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

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
        {!embeddedResourceId &&
          model.kind === 'down' &&
          columnTypes(types).map((type) => (
            <Button
              key={type.id}
              type="button"
              size="md"
              variant={columnTypeId === type.id ? 'cta' : 'outlined'}
              aria-pressed={columnTypeId === type.id}
              onClick={() => setColumnTypeId(type.id)}
            >
              {typeLabel(type, language, 'plural')}
            </Button>
          ))}
        {types.map((type) => (
          <FilterMenu
            key={type.id}
            label={typeLabel(type, language, 'singular')}
            showLabel
            value={filters[type.id] ?? 'all'}
            onChange={(value) => {
              setFilters({ ...filters, [type.id]: value });
              if (type.role === 'place') setZoneChoice(null);
            }}
            options={[
              { value: 'all', label: texts.all },
              ...resources
                .filter((item) => item.resourceTypeId === type.id)
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        ))}
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
              onValueChange={setZoneChoice}
              options={zones.map((zone) => ({ value: zone, label: zone }))}
            />
          </div>
        </label>
        {allowActions && !embeddedResourceId && (
          <WeekActions
            from={monday}
            to={addDays(monday, 6)}
            onDone={() => setReload((value) => value + 1)}
          />
        )}
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
            setClosedChoice((current) => {
              const base =
                current?.key === closedKey
                  ? current.dates
                  : initiallyClosedDays(monday, viewZone);
              return {
                key: closedKey,
                dates: base.includes(date)
                  ? base.filter((item) => item !== date)
                  : [...base, date],
              };
            })
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
          onOpenSlot={openSlot}
          onOpenInactive={(slotIds) => {
            setAlert(null);
            setWarnings([]);
            setDialog({ kind: 'list', slotIds });
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
                setCalendar(false);
              }}
            />
          </Field>
        </Modal>
      )}
      {form && (
        <SlotWindow
          key={`${form.mode}-${form.slotId ?? 'new'}-${form.draft.kind}`}
          mode={form.mode}
          initial={form.draft}
          resources={resources}
          types={types}
          config={schedule}
          language={language}
          errors={errors}
          alert={alert}
          warnings={warnings}
          pending={pending}
          allowActions={allowActions}
          onEdit={() => {
            setErrors({});
            setAlert(null);
            setWarnings([]);
          }}
          onSubmit={(draft) => void save(draft)}
          onBack={() => {
            setDialog(null);
            setWarnings([]);
          }}
          onCancelSlot={() => {
            if (!form.slotId) return;
            setDialog({
              kind: 'confirm',
              action: 'cancel',
              slotId: form.slotId,
              returnTo: form,
            });
          }}
          onReplace={(draft) => setDialog({ ...form, mode: 'replace', draft })}
          onDelete={() => {
            if (!form.slotId) return;
            setDialog({
              kind: 'confirm',
              action: 'delete',
              slotId: form.slotId,
              returnTo: form,
            });
          }}
        />
      )}
      {list && (
        <InactiveList
          slotIds={list.slotIds}
          slots={slots}
          resources={resources}
          allowActions={allowActions}
          alert={alert}
          warnings={warnings}
          pending={pending}
          onRestore={(slotId) =>
            void runAction('restore', slotId, warnings.length > 0)
          }
          onDelete={(slotId) =>
            setDialog({
              kind: 'confirm',
              action: 'delete',
              slotId,
              returnTo: list,
            })
          }
          onBack={() => {
            setDialog(null);
            setWarnings([]);
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
                onClick={() => void runAction(confirm.action, confirm.slotId)}
              >
                {confirm.action === 'cancel' ? texts.cancelSlot : texts.delete}
              </Button>
            </>
          }
        >
          <p>
            {confirm.action === 'cancel' ? texts.cancelBody : texts.deleteBody}
          </p>
        </Modal>
      )}
    </div>
  );
}

function InactiveList({
  slotIds,
  slots,
  resources,
  allowActions,
  alert,
  warnings,
  pending,
  onRestore,
  onDelete,
  onBack,
}: {
  slotIds: string[];
  slots: SlotInfo[];
  resources: CatalogResource[];
  allowActions: boolean;
  alert: string | null;
  warnings: ApiConflict[];
  pending: boolean;
  onRestore: (slotId: string) => void;
  onDelete: (slotId: string) => void;
  onBack: () => void;
}) {
  const rows = slotIds.flatMap((id) => {
    const item = slots.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  const title = rows.every((item) => item.status === 'no_show')
    ? texts.noShow
    : texts.cancelled;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onBack();
      }}
      title={title}
      actions={
        <Button type="button" variant="outlined" size="md" onClick={onBack}>
          {texts.back}
        </Button>
      }
    >
      {alert && <p role="alert">{alert}</p>}
      {warnings.length > 0 && (
        <ul>
          {warnings.map((warning) => (
            <li key={`${warning.resourceName}-${warning.start}`}>
              {warning.resourceName} {warning.title} {warning.start}–
              {warning.end}
            </li>
          ))}
        </ul>
      )}
      <ul className="flex flex-col gap-[var(--space-300)]">
        {rows.map((item) => {
          const place = resources.find(
            (entry) => entry.id === item.placeResourceId,
          );
          const future = place?.timeZone
            ? !hasStarted(item.date, item.startTime, place.timeZone)
            : false;
          return (
            <li key={item.id} className="flex flex-col gap-[var(--space-100)]">
              <span>{statusLabel(item.status)}</span>
              <span>
                {item.startTime} · {place?.name}
              </span>
              {allowActions && future && (
                <span className="flex gap-[var(--space-200)]">
                  <Button
                    type="button"
                    variant="outlined"
                    size="md"
                    disabled={pending}
                    onClick={() => onRestore(item.id)}
                  >
                    {warnings.length > 0 ? texts.saveAnyway : texts.restore}
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

function emptyFallback(): SlotDraft {
  return {
    kind: 'service',
    date: '',
    time: '00:00',
    placeResourceId: '',
    byType: {},
    duration: '60',
    audience: 'group',
    format: 'offline',
    places: '',
    note: '',
    blocksAll: false,
    status: 'planned',
  };
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function chosenClosedDays(
  monday: string,
  viewZone: string,
  choice: { key: string; dates: string[] } | null,
): string[] {
  const key = `${monday}|${viewZone}`;
  return choice?.key === key
    ? choice.dates
    : initiallyClosedDays(monday, viewZone);
}

function initiallyClosedDays(monday: string, viewZone: string): string[] {
  const today = todayIn(viewZone);
  return weekDates(monday).filter((date) => date < today);
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

async function loadResources(typeId: string): Promise<CatalogResource[]> {
  const items: CatalogResource[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = resourcePageSchema.parse(
      await getApi().request(
        `/resources?resourceTypeId=${typeId}&currentPage=${page}&perPage=100&sortBy=name&order=ASC`,
      ),
    );
    items.push(...body.items);
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return items;
}
