'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { notify } from '../../shared/ui/toaster';
import { ApiError, type ApiConflict } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import {
  resourcePageSchema,
  sortedTypes,
  type CatalogResource,
  type ResourceTypeConfig,
} from '../catalogs/resource-types';
import { useCrumbs } from '../shell/crumbs';
import {
  TEMPLATE_MONDAY,
  applyApiError,
  buildGrid,
  dateOfWeekday,
  defaultColumnTypeId,
  draftFromSlot,
  emptyDraft,
  slotPayload,
  validateDraft,
  type SlotDraft,
  type SlotInfo,
  type Weekday,
} from './model';
import { ScheduleTabs } from './schedule-tabs';
import { SlotWindow } from './slot-window';
import { texts } from './texts';
import { WeekGrid } from './week-grid';

const rowSchema = z.object({
  id: z.string(),
  kind: z.enum(['service', 'block']),
  weekday: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  startTime: z.string(),
  durationMinutes: z.number(),
  placeResourceId: z.string(),
  resourceIds: z.array(z.string()),
  audience: z.enum(['group', 'one_person']).nullable(),
  format: z.enum(['offline', 'offline_and_online', 'online_only']).nullable(),
  places: z.number().nullable(),
  note: z.string().nullable(),
  blocksAll: z.boolean(),
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  rows: z.array(rowSchema),
});

/** Rename a template and edit its service and block rows on a dateless week. */
export function TemplateEditor({ templateId }: { templateId: string }) {
  const session = useSession();
  if (session.status !== 'signed-in') return null;
  return (
    <Editor
      templateId={templateId}
      language={session.language}
      types={sortedTypes(session.config.catalogConfig.resourceTypes)}
      schedule={session.config.scheduleConfig}
    />
  );
}

function Editor({
  templateId,
  language,
  types,
  schedule,
}: {
  templateId: string;
  language: 'en' | 'sk' | 'uk';
  types: ResourceTypeConfig[];
  schedule: {
    audienceEnabled: boolean;
    formatEnabled: boolean;
    statuses: string[];
  };
}) {
  const copyTexts = copy(language);
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [resources, setResources] = useState<CatalogResource[] | null>(null);
  const [rows, setRows] = useState<z.infer<typeof rowSchema>[] | null>(null);
  const [zone, setZone] = useState('UTC');
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState<{
    mode: 'new' | 'edit';
    rowId?: string;
    draft: SlotDraft;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<ApiConflict[]>([]);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  useCrumbs([
    { label: copyTexts.schedule, href: '/schedule' },
    { label: texts.templates, href: '/schedule/templates' },
    { label: name || '…' },
  ]);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const [template, settings, lists] = await Promise.all([
          getApi().request<unknown>(`/week-templates/${templateId}`),
          getApi().request<unknown>('/settings'),
          Promise.all(types.map((type) => loadResources(type.id))),
        ]);
        if (gone) return;
        const parsed = templateSchema.parse(template);
        setName(parsed.name);
        setRows(parsed.rows);
        setResources(lists.flat());
        setZone(z.object({ timeZone: z.string() }).parse(settings).timeZone);
      } catch {
        if (!gone) notify.error(texts.failed);
      }
    })();
    return () => {
      gone = true;
    };
  }, [templateId, reload, types]);

  const slots = useMemo<SlotInfo[]>(() => {
    return (rows ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      placeResourceId: row.placeResourceId,
      resourceIds: row.resourceIds,
      date: dateOfWeekday(row.weekday),
      startTime: row.startTime.slice(0, 5),
      durationMinutes: row.durationMinutes,
      audience: row.audience,
      format: row.format,
      places: row.places,
      note: row.note,
      blocksAll: row.blocksAll,
      status: 'planned',
      occupiesResources: true,
    }));
  }, [rows]);

  const model = useMemo(() => {
    if (!resources) return null;
    return buildGrid({
      slots,
      resources,
      types,
      viewZone: zone,
      columnTypeId: defaultColumnTypeId(types, resources),
      filters: {},
      monday: TEMPLATE_MONDAY,
      layout: 'week',
      audienceEnabled: schedule.audienceEnabled,
      formatEnabled: schedule.formatEnabled,
      language,
    });
  }, [slots, resources, types, zone, schedule, language]);

  if (!resources || !rows || !model) return null;

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === '') {
      setNameError(texts.enterName);
      return;
    }
    setPending(true);
    try {
      await getApi().request(`/week-templates/${templateId}`, {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      notify.success(texts.templateUpdated);
    } catch {
      notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

  async function removeTemplate() {
    setPending(true);
    try {
      await getApi().request(`/week-templates/${templateId}`, {
        method: 'DELETE',
      });
      notify.success(texts.templateDeleted);
      router.push('/schedule/templates');
    } catch {
      notify.error(texts.failed);
    } finally {
      setPending(false);
      setRemoving(false);
    }
  }

  async function saveRow(draft: SlotDraft) {
    const fields = validateDraft(
      draft,
      resources!,
      types,
      zone,
      schedule,
      language,
    );
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      return;
    }
    const place = resources!.find((item) => item.id === draft.placeResourceId);
    if (!place) return;
    const confirmOverlap = warnings.length > 0;
    const body = slotPayload(
      draft,
      place,
      zone,
      schedule,
      confirmOverlap,
      true,
    );
    delete body.date;
    setPending(true);
    try {
      if (dialog?.mode === 'edit' && dialog.rowId) {
        await getApi().request(
          `/week-templates/${templateId}/rows/${dialog.rowId}`,
          { method: 'PATCH', body },
        );
      } else {
        await getApi().request(`/week-templates/${templateId}/rows`, {
          method: 'POST',
          body,
        });
      }
      setDialog(null);
      setWarnings([]);
      setReload((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'OVERLAP_WARNING') {
        setWarnings(error.conflicts);
      } else if (error instanceof ApiError) {
        const applied = applyApiError(error, draft, place, zone);
        setErrors(applied.fields);
        setAlert(applied.alert);
      } else notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

  async function deleteRow(rowId: string) {
    setPending(true);
    try {
      await getApi().request(`/week-templates/${templateId}/rows/${rowId}`, {
        method: 'DELETE',
      });
      setDialog(null);
      setReload((value) => value + 1);
    } catch {
      notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScheduleTabs current="templates" />
      <form
        className="flex flex-col gap-[var(--space-300)] p-[var(--space-400)]"
        onSubmit={(event) => void rename(event)}
      >
        <div className="flex flex-wrap justify-end gap-[var(--space-200)]">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => router.push('/schedule/templates')}
          >
            {texts.back}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => setRemoving(true)}
          >
            {texts.delete}
          </Button>
          <Button type="submit" variant="cta" size="md" loading={pending}>
            {texts.save}
          </Button>
        </div>
        <Field id="template-name" label={texts.name} required error={nameError}>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
            }}
          />
        </Field>
      </form>
      <div className="min-h-0 flex-1 overflow-auto px-[var(--space-400)] pb-[var(--space-400)]">
        <WeekGrid
          model={model}
          earlyOpen={model.night.early}
          lateOpen={model.night.late}
          closedDays={[]}
          allowCreate
          isPast={() => false}
          onToggleDay={() => undefined}
          onToggleEarly={() => undefined}
          onToggleLate={() => undefined}
          onCreate={(date, minutes) => {
            setErrors({});
            setAlert(null);
            setWarnings([]);
            setDialog({
              mode: 'new',
              draft: emptyDraft({
                date,
                time: minutesToTime(minutes),
                placeResourceId: '',
                resources,
                types,
                audienceEnabled: schedule.audienceEnabled,
              }),
            });
          }}
          onOpenSlot={(slotId) => {
            const slot = slots.find((item) => item.id === slotId);
            if (!slot) return;
            setDialog({
              mode: 'edit',
              rowId: slotId,
              draft: draftFromSlot(slot, resources, types, zone),
            });
          }}
          onOpenInactive={() => undefined}
        />
      </div>
      {dialog && (
        <SlotWindow
          key={`${dialog.mode}-${dialog.rowId ?? 'new'}`}
          mode={dialog.mode === 'edit' ? 'edit' : 'new'}
          template
          initial={dialog.draft}
          resources={resources}
          types={types}
          config={schedule}
          language={language}
          errors={errors}
          alert={alert}
          warnings={warnings}
          pending={pending}
          allowActions
          onEdit={() => {
            setErrors({});
            setAlert(null);
            setWarnings([]);
          }}
          onSubmit={(draft) => void saveRow(draft)}
          onBack={() => setDialog(null)}
          onCancelSlot={() => undefined}
          onReplace={() => undefined}
          onDelete={() => {
            if (dialog.rowId) void deleteRow(dialog.rowId);
          }}
        />
      )}
      {removing && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open && !pending) setRemoving(false);
          }}
          title={texts.deleteTemplateTitle}
          actions={
            <>
              <Button
                type="button"
                variant="outlined"
                size="md"
                onClick={() => setRemoving(false)}
              >
                {texts.back}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                loading={pending}
                onClick={() => void removeTemplate()}
              >
                {texts.delete}
              </Button>
            </>
          }
        >
          <p>{texts.deleteTemplateBody}</p>
        </Modal>
      )}
    </div>
  );
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
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

export type { Weekday };
