'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { MultiSelect } from '../../shared/ui/multi-select';
import { Select } from '../../shared/ui/select';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { ScheduleBoard } from '../schedule/schedule-board';
import { busySentence } from '../schedule/texts';
import { useCrumbs } from '../shell/crumbs';
import { CatalogTabs } from './catalog-tabs';
import { addressAfterTypeChange, type HallType } from './hall-address';
import { HallGallery } from './hall-gallery';
import { isInstagramLink, isTikTokLink } from './social-link';
import { isVideoLink } from './video-link';
import {
  recordSentence,
  resourcePageSchema,
  resourceSchema,
  sortedTypes,
  typeLabel,
  typePath,
  type CatalogResource,
  type ResourceFile,
} from './resource-types';

const TIME_ZONES = Intl.supportedValuesOf('timeZone').sort();

/** Create or edit one resource. Fields follow the cubes of its type. */
export function ResourceForm({
  typeId,
  resourceId,
}: {
  typeId: string;
  resourceId?: string;
}) {
  const session = useSession();
  const language = session.status === 'signed-in' ? session.language : 'en';
  const texts = copy(language);
  const types =
    session.status === 'signed-in'
      ? sortedTypes(session.config.catalogConfig.resourceTypes)
      : [];
  const type = types.find((item) => item.id === typeId);
  const router = useRouter();
  const editing = resourceId !== undefined;
  const listPath = typePath(typeId);
  const singular = type ? typeLabel(type, language, 'plural') : '';
  const one = type ? typeLabel(type, language, 'singular') : '';
  const [placeType, setPlaceType] = useState<HallType>('ordinary');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [duration, setDuration] = useState(type?.duration ? '60' : '');
  const [description, setDescription] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<Record<string, CatalogResource[]>>({});
  const skillTypes = types.filter((item) => item.skills && item.id !== typeId);
  const skillIds = skillTypes.map((item) => item.id).join(',');
  const [nameError, setNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [tiktokError, setTiktokError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [images, setImages] = useState<ResourceFile[]>([]);
  const [pending, setPending] = useState(false);

  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: singular, href: listPath },
    {
      label: editing ? name || '…' : name.trim() ? name.trim() : `New ${one}`,
    },
  ]);

  useEffect(() => {
    if (!type) return;
    let gone = false;
    if (!resourceId) {
      if (!type.geography) return;
      void getApi()
        .request<unknown>('/settings')
        .then((body) => {
          if (gone) return;
          setTimeZone(z.object({ timeZone: z.string() }).parse(body).timeZone);
        })
        .catch(() => {
          if (!gone) setTimeZone('');
        });
      return () => {
        gone = true;
      };
    }
    void getApi()
      .request<unknown>(`/resources/${resourceId}`)
      .then((body) => {
        if (gone) return;
        const resource = resourceSchema.parse(body);
        setName(resource.name);
        setPlaceType(resource.type === 'virtual' ? 'virtual' : 'ordinary');
        setAddress(resource.address ?? '');
        setTimeZone(resource.timeZone ?? '');
        setDuration(
          resource.defaultDuration === null
            ? ''
            : String(resource.defaultDuration),
        );
        setDescription(resource.description ?? '');
        setVideoLink(resource.videoLink ?? '');
        setInstagram(resource.instagram ?? '');
        setTiktok(resource.tiktok ?? '');
        setImages(resource.images);
        setRelatedIds(resource.relatedResourceIds);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [resourceId, type, texts.somethingWentWrong]);

  useEffect(() => {
    if (!type?.skills || skillIds === '') return;
    let gone = false;
    const ids = skillIds.split(',');
    void Promise.all(ids.map((id) => loadResources(id)))
      .then((lists) => {
        if (gone) return;
        const next: Record<string, CatalogResource[]> = {};
        ids.forEach((id, index) => {
          next[id] = lists[index] ?? [];
        });
        setOptions(next);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [type?.skills, skillIds, texts.somethingWentWrong]);

  if (!type) return null;

  function showApiErrors(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    if (error.code === 'RESOURCE_BUSY' && error.conflict) {
      setAlert(busySentence(error.conflict) ?? texts.somethingWentWrong);
      return true;
    }
    if (error.code !== 'VALIDATION_ERROR') return false;
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
      if (
        item.field === 'defaultDuration' &&
        (item.code === 'REQUIRED' || item.code === 'INVALID_VALUE')
      ) {
        setDurationError(texts.enterDuration);
        matched = true;
      }
      if (item.field === 'videoLink' && item.code === 'INVALID_FORMAT') {
        setVideoError(texts.enterVideoLink);
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
    if (pending || !type) return;
    const nextName = name.trim() === '' ? texts.enterName : null;
    const nextAddress =
      type.geography && placeType === 'ordinary' && address.trim() === ''
        ? texts.enterAddress
        : null;
    const nextDuration =
      type.duration && !validDuration(duration) ? texts.enterDuration : null;
    const nextVideo =
      type.showcase && videoLink.trim() !== '' && !isVideoLink(videoLink.trim())
        ? texts.enterVideoLink
        : null;
    const nextInstagram =
      type.showcase &&
      instagram.trim() !== '' &&
      !isInstagramLink(instagram.trim())
        ? texts.enterInstagram
        : null;
    const nextTiktok =
      type.showcase && tiktok.trim() !== '' && !isTikTokLink(tiktok.trim())
        ? texts.enterTiktok
        : null;
    setNameError(nextName);
    setAddressError(nextAddress);
    setDurationError(nextDuration);
    setVideoError(nextVideo);
    setInstagramError(nextInstagram);
    setTiktokError(nextTiktok);
    setAlert(null);
    if (
      nextName ||
      nextAddress ||
      nextDuration ||
      nextVideo ||
      nextInstagram ||
      nextTiktok
    ) {
      return;
    }

    const body: Record<string, unknown> = { name: name.trim() };
    if (!editing) body.resourceTypeId = type.id;
    if (type.geography) {
      body.type = placeType;
      body.address = placeType === 'virtual' ? 'Virtual place' : address.trim();
      if (timeZone !== '') body.timeZone = timeZone;
    }
    if (type.duration) body.defaultDuration = Number(duration);
    if (type.showcase) {
      body.description = emptyToNull(description);
      body.videoLink = emptyToNull(videoLink);
      body.instagram = emptyToNull(instagram);
      body.tiktok = emptyToNull(tiktok);
    }
    if (type.skills) body.relatedResourceIds = relatedIds;

    setPending(true);
    try {
      if (editing && resourceId) {
        await getApi().request(`/resources/${resourceId}`, {
          method: 'PATCH',
          body,
        });
        notify.success(recordSentence(one, 'updated'));
      } else {
        await getApi().request('/resources', { method: 'POST', body });
        notify.success(recordSentence(one, 'added'));
      }
      router.push(listPath);
    } catch (error) {
      if (!showApiErrors(error)) notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  const showSchedule =
    editing &&
    resourceId &&
    (type.role === 'place' || type.role === 'resource');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current={listPath} />
      <form
        noValidate
        className="flex flex-col p-[var(--space-400)] sm:px-[var(--space-600)]"
        onSubmit={(event) => void save(event)}
      >
        <div className="mb-[var(--space-400)] flex flex-wrap justify-end gap-[var(--space-200)]">
          <Button
            type="button"
            variant="outlined"
            size="md"
            onClick={() => router.push(listPath)}
          >
            {texts.back}
          </Button>
          <Button type="submit" variant="cta" size="md" loading={pending}>
            {editing ? texts.update : texts.save}
          </Button>
        </div>
        {alert && (
          <p role="alert" className="mb-[var(--space-300)]">
            {alert}
          </p>
        )}
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
          {type.geography && (
            <>
              <Field id="type" label={texts.hallType} required>
                <Select
                  id="type"
                  value={placeType}
                  onValueChange={(next) => {
                    const value = next as HallType;
                    setAddress(
                      addressAfterTypeChange(value, placeType, address),
                    );
                    setPlaceType(value);
                    setAddressError(null);
                  }}
                  options={[
                    { value: 'ordinary', label: texts.ordinary },
                    { value: 'virtual', label: texts.virtual },
                  ]}
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
                  readOnly={placeType === 'virtual'}
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
                  options={zones(timeZone)}
                />
              </Field>
            </>
          )}
          {type.duration && (
            <Field
              id="duration"
              label={texts.defaultDuration}
              required
              error={durationError}
            >
              <Input
                id="duration"
                inputMode="numeric"
                value={duration}
                data-invalid={durationError ? true : undefined}
                onChange={(event) => {
                  setDuration(event.target.value);
                  setDurationError(null);
                }}
              />
            </Field>
          )}
          {type.showcase && (
            <>
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
              <Field
                id="instagram"
                label={texts.instagram}
                error={instagramError}
              >
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
            </>
          )}
          {type.skills &&
            skillTypes.map((item) => (
              <Field
                key={item.id}
                id={`related-${item.id}`}
                label={typeLabel(item, language, 'plural')}
              >
                <MultiSelect
                  id={`related-${item.id}`}
                  value={idsOf(relatedIds, options[item.id] ?? [])}
                  onChange={(ids) =>
                    setRelatedIds(
                      mergeRelated(relatedIds, options[item.id] ?? [], ids),
                    )
                  }
                  options={(options[item.id] ?? []).map((resource) => ({
                    value: resource.id,
                    label: resource.name,
                  }))}
                  placeholder={typeLabel(item, language, 'plural')}
                  searchPlaceholder={texts.searchOptions}
                  emptyText={texts.noOptionsFound}
                  allSelectedText={texts.allSelected}
                />
              </Field>
            ))}
        </div>
        {editing && resourceId && type.showcase && (
          <HallGallery
            hallId={resourceId}
            images={images}
            onChange={setImages}
            filesBase={`/resources/${resourceId}`}
            removeBody={texts.removeFileBody}
          />
        )}
      </form>
      {showSchedule && resourceId && (
        <ScheduleBoard embeddedResourceId={resourceId} />
      )}
    </div>
  );
}

function validDuration(value: string): boolean {
  const duration = Number(value);
  return (
    Number.isInteger(duration) &&
    duration >= 5 &&
    duration <= 1440 &&
    duration % 5 === 0
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function zones(current: string) {
  const list =
    current !== '' && !TIME_ZONES.includes(current)
      ? [current, ...TIME_ZONES]
      : TIME_ZONES;
  return list.map((zone) => ({ value: zone, label: zone }));
}

function idsOf(selected: string[], known: CatalogResource[]): string[] {
  return selected.filter((id) => known.some((resource) => resource.id === id));
}

function mergeRelated(
  selected: string[],
  known: CatalogResource[],
  next: string[],
): string[] {
  const owned = new Set(known.map((resource) => resource.id));
  return [...selected.filter((id) => !owned.has(id)), ...next];
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
