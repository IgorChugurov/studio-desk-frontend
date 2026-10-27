import { describe, expect, it } from 'vitest';
import { toApiError } from '../api/api-error';
import type {
  CatalogResource,
  ResourceTypeConfig,
} from '../catalogs/resource-types';
import { clockInZone, mondayOf, todayIn, weekLabel } from './clock';
import {
  buildGrid,
  defaultColumnTypeId,
  optionsForType,
  slotPayload,
  validateDraft,
  type SlotDraft,
  type SlotInfo,
} from './model';
import { texts } from './texts';

const placeType: ResourceTypeConfig = {
  id: 'place-type',
  sortOrder: 0,
  role: 'place',
  labels: pair('hall', 'halls'),
  geography: true,
  duration: false,
  showcase: false,
  person: false,
  skills: false,
  required: true,
  multiple: false,
  conflictMode: 'strict',
};
const trainerType: ResourceTypeConfig = {
  id: 'trainer-type',
  sortOrder: 1,
  role: 'resource',
  labels: pair('trainer', 'trainers'),
  geography: false,
  duration: false,
  showcase: false,
  person: true,
  skills: true,
  required: true,
  multiple: true,
  conflictMode: 'warning',
};
const offeringType: ResourceTypeConfig = {
  id: 'offering-type',
  sortOrder: 2,
  role: 'offering',
  labels: pair('class type', 'class types'),
  geography: false,
  duration: true,
  showcase: false,
  person: false,
  skills: true,
  required: true,
  multiple: false,
  conflictMode: 'none',
};
const types = [placeType, trainerType, offeringType];

function pair(singular: string, plural: string) {
  const labels = { singular, plural };
  return { en: labels, sk: labels, uk: labels };
}

function resource(
  partial: Pick<CatalogResource, 'id' | 'resourceTypeId' | 'name'> &
    Partial<CatalogResource>,
): CatalogResource {
  return {
    type: null,
    address: null,
    timeZone: null,
    defaultDuration: null,
    description: null,
    videoLink: null,
    instagram: null,
    tiktok: null,
    relatedResourceIds: [],
    images: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...partial,
  };
}

const ny = resource({
  id: 'ny',
  resourceTypeId: 'place-type',
  name: 'East',
  type: 'ordinary',
  timeZone: 'America/New_York',
});
const anna = resource({
  id: 'anna',
  resourceTypeId: 'trainer-type',
  name: 'Anna',
  relatedResourceIds: ['yoga'],
});
const yoga = resource({
  id: 'yoga',
  resourceTypeId: 'offering-type',
  name: 'Yoga',
  defaultDuration: 60,
  relatedResourceIds: ['anna'],
});

function slot(overrides: Partial<SlotInfo> = {}): SlotInfo {
  return {
    id: 'c1',
    kind: 'service',
    placeResourceId: 'ny',
    resourceIds: ['anna', 'yoga'],
    date: '2026-10-17',
    startTime: '12:00',
    durationMinutes: 60,
    audience: 'group',
    format: 'offline',
    places: 8,
    note: null,
    blocksAll: false,
    status: 'planned',
    occupiesResources: true,
    ...overrides,
  };
}

const schedule = {
  audienceEnabled: true,
  formatEnabled: true,
  statuses: ['planned', 'cancelled', 'completed', 'no_show'],
};

function draft(overrides: Partial<SlotDraft> = {}): SlotDraft {
  return {
    kind: 'service',
    date: '2026-10-17',
    time: '18:00',
    placeResourceId: 'ny',
    byType: { 'trainer-type': ['anna'], 'offering-type': ['yoga'] },
    duration: '60',
    audience: 'group',
    format: 'offline',
    places: '8',
    note: '',
    blocksAll: false,
    status: 'planned',
    ...overrides,
  };
}

describe('schedule clock', () => {
  it('opens the studio week that contains today', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    const monday = mondayOf(todayIn('Europe/Bratislava', now));
    expect(monday).toBe('2026-10-12');
    expect(weekLabel(monday)).toBe('12.10.2026–18.10.2026');
  });

  it('moves a place clock into the view zone and back', () => {
    expect(
      clockInZone(
        '2026-10-17',
        '12:00',
        'America/New_York',
        'Europe/Bratislava',
      ),
    ).toEqual({ date: '2026-10-17', time: '18:00' });
    expect(
      clockInZone(
        '2026-10-17',
        '18:00',
        'Europe/Bratislava',
        'America/New_York',
      ),
    ).toEqual({ date: '2026-10-17', time: '12:00' });
  });
});

describe('schedule grid', () => {
  it('places a service by the view zone and keeps the place clock on save', () => {
    const grid = buildGrid({
      slots: [slot()],
      resources: [ny, anna, yoga],
      types,
      viewZone: 'Europe/Bratislava',
      columnTypeId: 'place-type',
      filters: {},
      monday: '2026-10-12',
      audienceEnabled: true,
      formatEnabled: true,
      language: 'en',
      now: new Date('2026-10-17T12:00:00Z'),
    });
    expect(grid.cards.map((card) => card.lines[0])).toEqual(['18:00–19:00']);
    const body = slotPayload(draft(), ny, 'Europe/Bratislava', schedule, false);
    expect(body).toMatchObject({
      kind: 'service',
      placeResourceId: 'ny',
      date: '2026-10-17',
      startTime: '12:00',
      durationMinutes: 60,
      resourceIds: ['anna', 'yoga'],
    });
    expect(body.confirmOverlap).toBeUndefined();
  });

  it('uses the second resource type when the organization has one place', () => {
    expect(defaultColumnTypeId(types, [ny, anna])).toBe('trainer-type');
    expect(
      defaultColumnTypeId(types, [ny, { resourceTypeId: 'place-type' }, anna]),
    ).toBe('place-type');
  });

  it('draws an organization block in every column and an inactive slot as a card', () => {
    const grid = buildGrid({
      slots: [
        slot({
          id: 'block',
          kind: 'block',
          resourceIds: [],
          blocksAll: true,
          note: null,
          audience: null,
          format: null,
          places: null,
        }),
        slot({
          id: 'gone',
          date: '2026-10-18',
          startTime: '10:00',
          status: 'cancelled',
          occupiesResources: false,
          audience: null,
          format: null,
          places: null,
        }),
      ],
      resources: [
        ny,
        resource({ ...ny, id: 'west', name: 'West' }),
        anna,
        yoga,
      ],
      types,
      viewZone: 'America/New_York',
      columnTypeId: 'place-type',
      filters: {},
      monday: '2026-10-12',
      audienceEnabled: false,
      formatEnabled: false,
      language: 'en',
    });
    const blocks = grid.cards.filter((card) => card.slotId === 'block');
    expect(blocks.map((card) => card.columnId).sort()).toEqual(['ny', 'west']);
    expect(blocks[0]?.neutral).toBe(true);
    expect(blocks[0]?.title).toBe('Blocked time');
    expect(grid.cards.some((card) => card.title === 'Cancelled')).toBe(true);
  });
});

describe('slot payload', () => {
  it('sends confirmOverlap only when the warning is confirmed', () => {
    const body = slotPayload(draft(), ny, 'Europe/Bratislava', schedule, true);
    expect(body.confirmOverlap).toBe(true);
  });

  it('sends a block without an offering', () => {
    const body = slotPayload(
      draft({
        kind: 'block',
        blocksAll: true,
        note: 'Lunch',
        byType: { 'offering-type': ['yoga'] },
      }),
      ny,
      'Europe/Bratislava',
      schedule,
      false,
    );
    expect(body).toMatchObject({
      kind: 'block',
      blocksAll: true,
      note: 'Lunch',
      resourceIds: [],
      audience: null,
    });
  });

  it('rejects a duration outside 5 to 1440', () => {
    const errors = validateDraft(
      draft({ duration: '7' }),
      [ny, anna, yoga],
      types,
      'Europe/Bratislava',
      schedule,
      'en',
    );
    expect(errors.duration).toBe(texts.durationError);
  });

  it('keeps selected trainers and filters by the offering link', () => {
    const boris = resource({
      id: 'boris',
      resourceTypeId: 'trainer-type',
      name: 'Boris',
    });
    const options = optionsForType(
      trainerType,
      [anna, boris, yoga],
      types,
      draft(),
    );
    expect(options.map((item) => item.id)).toEqual(['anna']);
    const kept = optionsForType(
      trainerType,
      [anna, boris, yoga],
      types,
      draft({
        byType: { 'trainer-type': ['boris'], 'offering-type': ['yoga'] },
      }),
    );
    expect(kept.map((item) => item.id).sort()).toEqual(['anna', 'boris']);
  });
});

describe('conflict text', () => {
  it('builds the sentence from conflict and drops message', async () => {
    const error = await toApiError(
      new Response(
        JSON.stringify({
          code: 'RESOURCE_BUSY',
          message: 'ignore',
          conflict: {
            resourceName: 'East',
            title: 'Yoga',
            start: '12:00',
            end: '13:00',
          },
        }),
        { status: 409 },
      ),
    );
    expect(error.message).toBe('409 RESOURCE_BUSY');
    expect(error.conflict).toEqual({
      classTypeName: undefined,
      trainerName: undefined,
      hallName: undefined,
      resourceId: undefined,
      resourceName: 'East',
      title: 'Yoga',
      slotId: undefined,
      start: '12:00',
      end: '13:00',
    });
  });

  it('reads an overlap warning list', async () => {
    const error = await toApiError(
      new Response(
        JSON.stringify({
          code: 'OVERLAP_WARNING',
          message: 'ignore',
          conflicts: [
            {
              resourceName: 'Anna',
              title: 'Yoga',
              start: '18:00:00',
              end: '19:00',
            },
          ],
        }),
        { status: 409 },
      ),
    );
    expect(error.conflicts).toEqual([
      {
        classTypeName: undefined,
        trainerName: undefined,
        hallName: undefined,
        resourceId: undefined,
        resourceName: 'Anna',
        title: 'Yoga',
        slotId: undefined,
        start: '18:00',
        end: '19:00',
      },
    ]);
  });
});
