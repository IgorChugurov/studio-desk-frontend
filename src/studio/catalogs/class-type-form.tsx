'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { CatalogTabs } from './catalog-tabs';
import { HallGallery } from './hall-gallery';
import { recordImagesSchema, type HallFile } from './hall-types';

const classTypeSchema = z.object({
  name: z.string(),
  description: z.string().nullable().nullish(),
  images: recordImagesSchema.shape.images,
});

/** Create a class type, or edit the saved one and its gallery. */
export function ClassTypeForm({ classTypeId }: { classTypeId?: string }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const router = useRouter();
  const editing = classTypeId !== undefined;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [images, setImages] = useState<HallFile[]>([]);
  const [pending, setPending] = useState(false);

  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: texts.classTypes, href: '/catalogs/class-types' },
    {
      label: editing
        ? name || '…'
        : name.trim()
          ? name.trim()
          : texts.newClassType,
    },
  ]);

  useEffect(() => {
    if (!classTypeId) return;
    let gone = false;
    void getApi()
      .request<unknown>(`/class-types/${classTypeId}`)
      .then((body) => {
        if (gone) return;
        const record = classTypeSchema.parse(body);
        setName(record.name);
        setDescription(record.description ?? '');
        setImages(record.images);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [classTypeId, texts.somethingWentWrong]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (name.trim() === '') {
      setNameError(texts.enterName);
      return;
    }
    setNameError(null);
    const body = {
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
    };
    setPending(true);
    try {
      if (editing && classTypeId) {
        await getApi().request(`/class-types/${classTypeId}`, {
          method: 'PATCH',
          body,
        });
        notify.success(texts.classTypeUpdated);
      } else {
        await getApi().request('/class-types', { method: 'POST', body });
        notify.success(texts.classTypeAdded);
      }
      router.push('/catalogs/class-types');
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'VALIDATION_ERROR' &&
        error.fieldErrors.some(
          (item) => item.field === 'name' && item.code === 'REQUIRED',
        )
      ) {
        setNameError(texts.enterName);
      } else {
        notify.error(texts.somethingWentWrong);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current="/catalogs/class-types" />
      <form
        noValidate
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[var(--space-400)] sm:px-[var(--space-600)]"
        onSubmit={(event) => void save(event)}
      >
        <div className="mb-[var(--space-400)] flex flex-wrap justify-end gap-[var(--space-200)]">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => router.push('/catalogs/class-types')}
          >
            {texts.back}
          </Button>
          <Button type="submit" variant="cta" size="md" loading={pending}>
            {editing ? texts.update : texts.save}
          </Button>
        </div>
        <div className="flex max-w-xl flex-col gap-[var(--space-400)]">
          <Field id="name" label={texts.name} required error={nameError}>
            <Input
              id="name"
              value={name}
              data-invalid={nameError ? true : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
            />
          </Field>
          <Field id="description" label={texts.description}>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
        {editing && classTypeId && (
          <HallGallery
            hallId={classTypeId}
            filesBase={`/class-types/${classTypeId}`}
            removeBody={texts.classTypeFileBody}
            images={images}
            onChange={setImages}
          />
        )}
      </form>
    </div>
  );
}
