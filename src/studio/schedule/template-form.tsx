'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { ScheduleTabs } from './schedule-tabs';
import { texts } from './texts';

/** Create a week template. Rows are added on the edit page. */
export function TemplateForm() {
  const session = useSession();
  const language = session.status === 'signed-in' ? session.language : 'en';
  const copyTexts = copy(language);
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useCrumbs([
    { label: copyTexts.schedule, href: '/schedule' },
    { label: texts.templates, href: '/schedule/templates' },
    { label: texts.newTemplate },
  ]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (name.trim() === '') {
      setError(texts.enterName);
      return;
    }
    setPending(true);
    try {
      const created = z.object({ id: z.string() }).parse(
        await getApi().request('/week-templates', {
          method: 'POST',
          body: { name: name.trim() },
        }),
      );
      notify.success(texts.templateAdded);
      router.push(`/schedule/templates/${created.id}`);
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
        className="flex flex-col gap-[var(--space-400)] p-[var(--space-400)]"
        onSubmit={(event) => void save(event)}
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
          <Button type="submit" variant="cta" size="md" loading={pending}>
            {texts.save}
          </Button>
        </div>
        <Field id="template-name" label={texts.name} required error={error}>
          <Input
            id="template-name"
            value={name}
            data-invalid={error ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </Field>
      </form>
    </div>
  );
}
