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
import { isInstagramLink, isTikTokLink } from './social-link';

const trainerSchema = z.object({
  name: z.string(),
  description: z.string().nullable().nullish(),
  instagram: z.string().nullable().nullish(),
  tiktok: z.string().nullable().nullish(),
  images: recordImagesSchema.shape.images,
});

function blank(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}

/** Create a trainer, or edit the saved one and its gallery. */
export function TrainerForm({ trainerId }: { trainerId?: string }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const router = useRouter();
  const editing = trainerId !== undefined;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [images, setImages] = useState<HallFile[]>([]);
  const [pending, setPending] = useState(false);

  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: texts.trainers, href: '/catalogs/trainers' },
    {
      label: editing
        ? name || '…'
        : name.trim()
          ? name.trim()
          : texts.newTrainer,
    },
  ]);

  useEffect(() => {
    if (!trainerId) return;
    let gone = false;
    void getApi()
      .request<unknown>(`/trainers/${trainerId}`)
      .then((body) => {
        if (gone) return;
        const trainer = trainerSchema.parse(body);
        setName(trainer.name);
        setDescription(trainer.description ?? '');
        setInstagram(trainer.instagram ?? '');
        setTiktok(trainer.tiktok ?? '');
        setImages(trainer.images);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [trainerId, texts.somethingWentWrong]);

  function showApiErrors(error: unknown): boolean {
    if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') {
      return false;
    }
    let matched = false;
    for (const item of error.fieldErrors) {
      if (item.field === 'name' && item.code === 'REQUIRED') {
        setNameError(texts.enterName);
        matched = true;
      }
      if (item.field === 'instagram' && item.code === 'INVALID_FORMAT') {
        setInstagramError(texts.enterInstagram);
        matched = true;
      }
      if (item.field === 'tiktok' && item.code === 'INVALID_FORMAT') {
        setTiktokError(texts.enterTiktok);
        matched = true;
      }
    }
    return matched;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const nextName = name.trim() === '' ? texts.enterName : null;
    const nextInstagram =
      instagram.trim() !== '' && !isInstagramLink(instagram.trim())
        ? texts.enterInstagram
        : null;
    const nextTiktok =
      tiktok.trim() !== '' && !isTikTokLink(tiktok.trim())
        ? texts.enterTiktok
        : null;
    setNameError(nextName);
    setInstagramError(nextInstagram);
    setTiktokError(nextTiktok);
    if (nextName || nextInstagram || nextTiktok) return;

    const body = {
      name: name.trim(),
      description: blank(description),
      instagram: blank(instagram),
      tiktok: blank(tiktok),
    };
    setPending(true);
    try {
      if (editing && trainerId) {
        await getApi().request(`/trainers/${trainerId}`, {
          method: 'PATCH',
          body,
        });
        notify.success(texts.trainerUpdated);
      } else {
        await getApi().request('/trainers', { method: 'POST', body });
        notify.success(texts.trainerAdded);
      }
      router.push('/catalogs/trainers');
    } catch (error) {
      if (!showApiErrors(error)) notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current="/catalogs/trainers" />
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
            onClick={() => router.push('/catalogs/trainers')}
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
          <Field id="instagram" label={texts.instagram} error={instagramError}>
            <Input
              id="instagram"
              value={instagram}
              data-invalid={instagramError ? true : undefined}
              onChange={(event) => {
                setInstagram(event.target.value);
                setInstagramError(null);
              }}
            />
          </Field>
          <Field id="tiktok" label={texts.tiktok} error={tiktokError}>
            <Input
              id="tiktok"
              value={tiktok}
              data-invalid={tiktokError ? true : undefined}
              onChange={(event) => {
                setTiktok(event.target.value);
                setTiktokError(null);
              }}
            />
          </Field>
        </div>
        {editing && trainerId && (
          <HallGallery
            hallId={trainerId}
            filesBase={`/trainers/${trainerId}`}
            removeBody={texts.trainerFileBody}
            images={images}
            onChange={setImages}
          />
        )}
      </form>
    </div>
  );
}
