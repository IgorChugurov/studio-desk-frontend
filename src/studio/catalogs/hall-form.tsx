'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { addressAfterTypeChange, type HallType } from './hall-address';
import { CatalogTabs } from './catalog-tabs';
import { HallGallery } from './hall-gallery';
import { hallSchema, type HallFile } from './hall-types';
import { isVideoLink } from './video-link';

const TIME_ZONES = Intl.supportedValuesOf('timeZone').sort();

/** Create a hall, or edit its name, address, video link, and gallery. */
export function HallForm({ hallId }: { hallId?: string }) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  const router = useRouter();
  const editing = hallId !== undefined;
  const [type, setType] = useState<HallType>('ordinary');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [images, setImages] = useState<HallFile[]>([]);
  const [pending, setPending] = useState(false);

  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: texts.halls, href: '/catalogs' },
    {
      label: editing ? name || '…' : name.trim() ? name.trim() : texts.newHall,
    },
  ]);

  useEffect(() => {
    let gone = false;
    if (!hallId) {
      void getApi()
        .request<unknown>('/settings')
        .then((body) => {
          if (gone) return;
          const zone = z.object({ timeZone: z.string() }).parse(body).timeZone;
          setTimeZone(zone);
        })
        .catch(() => {
          if (!gone) setTimeZone('');
        });
      return () => {
        gone = true;
      };
    }
    void getApi()
      .request<unknown>(`/halls/${hallId}`)
      .then((body) => {
        if (gone) return;
        const hall = hallSchema.parse(body);
        setType(hall.type);
        setName(hall.name);
        setAddress(hall.address);
        setTimeZone(hall.timeZone);
        setDescription(hall.description ?? '');
        setVideoLink(hall.videoLink ?? '');
        setImages(hall.images);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [hallId, texts.somethingWentWrong]);

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
      if (item.field === 'address' && item.code === 'REQUIRED') {
        setAddressError(texts.enterAddress);
        matched = true;
      }
      if (item.field === 'videoLink' && item.code === 'INVALID_FORMAT') {
        setVideoError(texts.enterVideoLink);
        matched = true;
      }
    }
    return matched;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const nextName = name.trim() === '' ? texts.enterName : null;
    const nextAddress =
      type === 'ordinary' && address.trim() === '' ? texts.enterAddress : null;
    const nextVideo =
      videoLink.trim() !== '' && !isVideoLink(videoLink.trim())
        ? texts.enterVideoLink
        : null;
    setNameError(nextName);
    setAddressError(nextAddress);
    setVideoError(nextVideo);
    if (nextName || nextAddress || nextVideo) return;

    const body = {
      type,
      name: name.trim(),
      address: type === 'virtual' ? 'Virtual hall' : address.trim(),
      ...(timeZone === '' ? {} : { timeZone }),
      description: description.trim() === '' ? null : description.trim(),
      videoLink: videoLink.trim() === '' ? null : videoLink.trim(),
    };
    setPending(true);
    try {
      if (editing && hallId) {
        await getApi().request(`/halls/${hallId}`, { method: 'PATCH', body });
        notify.success(texts.hallUpdated);
      } else {
        await getApi().request('/halls', { method: 'POST', body });
        notify.success(texts.hallAdded);
      }
      router.push('/catalogs');
    } catch (error) {
      if (!showApiErrors(error)) notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current="/catalogs" />
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
            onClick={() => router.push('/catalogs')}
          >
            {texts.back}
          </Button>
          <Button type="submit" variant="cta" size="md" loading={pending}>
            {editing ? texts.update : texts.save}
          </Button>
        </div>
        <div className="flex max-w-xl flex-col gap-[var(--space-400)]">
          <Field id="type" label={texts.hallType} required>
            <Select
              id="type"
              value={type}
              onValueChange={(next) => {
                const hallType = next as HallType;
                setAddress(addressAfterTypeChange(hallType, type, address));
                setType(hallType);
                setAddressError(null);
              }}
              options={[
                { value: 'ordinary', label: texts.ordinary },
                { value: 'virtual', label: texts.virtual },
              ]}
            />
          </Field>
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
          <Field
            id="address"
            label={texts.address}
            required
            error={addressError}
          >
            <Input
              id="address"
              value={address}
              readOnly={type === 'virtual'}
              data-invalid={addressError ? true : undefined}
              onChange={(event) => {
                setAddress(event.target.value);
                setAddressError(null);
              }}
            />
          </Field>
          <Field id="time-zone" label={texts.timeZone} required>
            <Select
              id="time-zone"
              value={timeZone}
              onValueChange={setTimeZone}
              options={TIME_ZONES.map((zone) => ({ value: zone, label: zone }))}
            />
          </Field>
          <Field id="description" label={texts.description}>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field id="video-link" label={texts.videoLink} error={videoError}>
            <Input
              id="video-link"
              value={videoLink}
              data-invalid={videoError ? true : undefined}
              onChange={(event) => {
                setVideoLink(event.target.value);
                setVideoError(null);
              }}
            />
          </Field>
        </div>
        {editing && hallId && (
          <HallGallery hallId={hallId} images={images} onChange={setImages} />
        )}
      </form>
    </div>
  );
}
