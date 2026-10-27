import { useState } from 'react';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Modal } from '../../shared/ui/modal';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError, type WeekConflict } from '../api/api-error';
import { getApi } from '../api/api';
import { texts } from './texts';

type Action = 'apply' | 'clear' | 'replace';
type Choice = 'keep_existing' | 'apply_new';

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
});
const pageSchema = z.object({
  items: z.array(templateSchema),
  meta: z.object({ totalPages: z.number() }),
});

/** Apply, clear, and replace weeks. Hidden from specialists and embedded pages. */
export function WeekActions({
  from,
  to,
  onDone,
}: {
  from: string;
  to: string;
  onDone: () => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [clearMode, setClearMode] = useState<'template_places' | 'all_places'>(
    'template_places',
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<WeekConflict[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [pending, setPending] = useState(false);

  async function open(next: Action) {
    setAction(next);
    setStart(from);
    setEnd(to);
    setPreview(null);
    setConflicts(null);
    setChoices({});
    if (next === 'clear') return;
    try {
      setTemplates(await loadTemplates());
    } catch {
      notify.error(texts.failed);
    }
  }

  function close() {
    if (pending) return;
    setAction(null);
    setConflicts(null);
    setPreview(null);
  }

  async function run(confirm: boolean) {
    if (!action || pending) return;
    setPending(true);
    try {
      const choiceList = (conflicts ?? []).map((item) => ({
        rowId: item.rowId,
        date: item.date,
        choice: choices[keyOf(item)] ?? 'keep_existing',
      }));
      const body = payload(action, {
        templateId,
        from: start,
        to: end,
        clearMode,
        preview: action !== 'apply' && !confirm,
        choices: confirm ? choiceList : undefined,
      });
      const result = z
        .object({ text: z.string().optional() })
        .parse(
          await getApi().request(pathOf(action), { method: 'POST', body }),
        );
      if (!confirm && action !== 'apply') {
        setPreview(result.text ?? null);
        setPending(false);
        return;
      }
      if (result.text) notify.success(result.text);
      setAction(null);
      setPreview(null);
      setConflicts(null);
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'WEEK_CONFLICTS') {
        setConflicts(error.weekConflicts);
        setPreview(null);
      } else notify.error(texts.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        size="md"
        onClick={() => void open('apply')}
      >
        {texts.applyTemplate}
      </Button>
      <Button
        type="button"
        variant="outlined"
        size="md"
        onClick={() => void open('clear')}
      >
        {texts.clearWeeks}
      </Button>
      <Button
        type="button"
        variant="outlined"
        size="md"
        onClick={() => void open('replace')}
      >
        {texts.replaceWithTemplate}
      </Button>
      {action && conflicts === null && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) close();
          }}
          title={titleOf(action)}
          actions={
            <>
              <Button
                type="button"
                variant="outlined"
                size="md"
                onClick={close}
              >
                {texts.back}
              </Button>
              <Button
                type="button"
                variant="cta"
                size="md"
                loading={pending}
                onClick={() => void run(preview !== null)}
              >
                {preview ? titleOf(action) : texts.save}
              </Button>
            </>
          }
        >
          {action !== 'clear' && (
            <Field id="week-template" label={texts.templates}>
              <Select
                id="week-template"
                value={templateId}
                onValueChange={setTemplateId}
                placeholder={texts.templates}
                options={templates.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Field>
          )}
          <Field id="week-from" label={texts.date}>
            <Input
              id="week-from"
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </Field>
          <Field id="week-to" label={texts.date}>
            <Input
              id="week-to"
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </Field>
          {action === 'replace' && (
            <Field id="week-clear" label={texts.clearWeeks}>
              <Select
                id="week-clear"
                value={clearMode}
                onValueChange={(value) =>
                  setClearMode(value as 'template_places' | 'all_places')
                }
                options={[
                  { value: 'template_places', label: texts.templatePlaces },
                  { value: 'all_places', label: texts.allPlaces },
                ]}
              />
            </Field>
          )}
          {preview && <p>{preview}</p>}
        </Modal>
      )}
      {conflicts && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) close();
          }}
          title={texts.conflicts}
          actions={
            <>
              <Button
                type="button"
                variant="outlined"
                size="md"
                onClick={close}
              >
                {texts.back}
              </Button>
              <Button
                type="button"
                variant="cta"
                size="md"
                loading={pending}
                onClick={() => void run(true)}
              >
                {texts.save}
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-[var(--space-300)]">
            {conflicts.map((item) => {
              const key = keyOf(item);
              return (
                <li key={key} className="flex flex-col gap-[var(--space-100)]">
                  <span>
                    {item.title} {item.start}–{item.end} · {item.date}
                  </span>
                  <span>
                    {item.existing.map((row) => row.resourceName).join(', ')}
                  </span>
                  <span className="flex gap-[var(--space-200)]">
                    <Button
                      type="button"
                      size="md"
                      variant={
                        choices[key] === 'keep_existing' ? 'cta' : 'outlined'
                      }
                      onClick={() =>
                        setChoices({ ...choices, [key]: 'keep_existing' })
                      }
                    >
                      {texts.keepExisting}
                    </Button>
                    <Button
                      type="button"
                      size="md"
                      variant={
                        choices[key] === 'apply_new' ? 'cta' : 'outlined'
                      }
                      onClick={() =>
                        setChoices({ ...choices, [key]: 'apply_new' })
                      }
                    >
                      {texts.applyNew}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </>
  );
}

function titleOf(action: Action): string {
  if (action === 'clear') return texts.clearWeeks;
  if (action === 'replace') return texts.replaceWithTemplate;
  return texts.applyTemplate;
}

function pathOf(action: Action): string {
  if (action === 'clear') return '/weeks/clear';
  if (action === 'replace') return '/weeks/replace';
  return '/weeks/apply';
}

function payload(
  action: Action,
  input: {
    templateId: string;
    from: string;
    to: string;
    clearMode: 'template_places' | 'all_places';
    preview: boolean;
    choices?: { rowId: string; date: string; choice: Choice }[];
  },
): Record<string, unknown> {
  if (action === 'clear') {
    return {
      from: input.from,
      to: input.to,
      placeResourceIds: null,
      preview: input.preview,
    };
  }
  const body: Record<string, unknown> = {
    templateId: input.templateId,
    from: input.from,
    to: input.to,
  };
  if (input.choices && input.choices.length > 0) body.choices = input.choices;
  if (action === 'replace') {
    body.clear = input.clearMode;
    body.preview = input.preview;
  }
  return body;
}

function keyOf(item: WeekConflict): string {
  return `${item.rowId}|${item.date}`;
}

async function loadTemplates(): Promise<{ id: string; name: string }[]> {
  const items: { id: string; name: string }[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= 20) {
    const body = pageSchema.parse(
      await getApi().request(
        `/week-templates?currentPage=${page}&perPage=100&sortBy=name&order=ASC`,
      ),
    );
    items.push(...body.items);
    totalPages = body.meta.totalPages;
    page += 1;
  }
  return items;
}
