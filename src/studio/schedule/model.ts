import type { ApiError } from '../api/api-error';
import type { OrganizationConfig } from '../api/auth-types';
import type {
  CatalogResource,
  ResourceTypeConfig,
} from '../catalogs/resource-types';
import { sortedTypes, typeLabel } from '../catalogs/resource-types';
import {
  addDays,
  clockInZone,
  dateNumbers,
  dayHeading,
  endsAfterMidnight,
  hasStarted,
  minutesOf,
  timeLabel,
  todayIn,
  wallOf,
  instantOf,
  weekDates,
} from './clock';
import {
  busySentence,
  formatLabel,
  selectResource,
  statusLabel,
  texts,
} from './texts';

export type ScheduleConfig = OrganizationConfig['scheduleConfig'];
export type SlotKind = 'service' | 'block';
export type Audience = 'group' | 'one_person';
export type SlotFormat = 'offline' | 'offline_and_online' | 'online_only';
export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Monday used to turn a template weekday into a clock date. */
export const TEMPLATE_MONDAY = '2026-10-12';

export interface SlotInfo {
  id: string;
  kind: SlotKind;
  placeResourceId: string;
  resourceIds: string[];
  date: string;
  startTime: string;
  durationMinutes: number;
  audience: Audience | null;
  format: SlotFormat | null;
  places: number | null;
  note: string | null;
  blocksAll: boolean;
  status: string;
  occupiesResources: boolean;
}

export interface SlotDraft {
  kind: SlotKind;
  date: string;
  time: string;
  placeResourceId: string;
  byType: Record<string, string[]>;
  duration: string;
  audience: Audience;
  format: SlotFormat;
  places: string;
  note: string;
  blocksAll: boolean;
  status: string;
}

export interface GridCard {
  key: string;
  slotId: string;
  columnId: string;
  date: string;
  startMin: number;
  endMin: number;
  title: string;
  lines: string[];
  past?: boolean;
  neutral?: boolean;
  listIds?: string[];
}

export interface GridStrip {
  key: string;
  slotIds: string[];
  label: string;
  columnId: string;
  date: string;
  startMin: number;
  endMin: number;
}

export interface GridModel {
  kind: 'down' | 'week';
  days: { date: string; heading: string; today: boolean }[];
  columns: { id: string; label: string; today: boolean }[];
  cards: GridCard[];
  strips: GridStrip[];
  night: { early: boolean; late: boolean };
}

const HOUR = 48;
const BAND = 28;

export function bandHeight(open: boolean, hours: number): number {
  return open ? BAND + hours * HOUR : BAND;
}

export function minuteTop(
  minutes: number,
  earlyOpen: boolean,
  lateOpen: boolean,
): number {
  if (minutes < 8 * 60) {
    return earlyOpen ? BAND + (minutes / 60) * HOUR : 0;
  }
  const early = bandHeight(earlyOpen, 8);
  if (minutes < 22 * 60) {
    return early + ((minutes - 8 * 60) / 60) * HOUR;
  }
  if (!lateOpen) return early + 14 * HOUR;
  return early + 14 * HOUR + BAND + ((minutes - 22 * 60) / 60) * HOUR;
}

export function columnHeight(earlyOpen: boolean, lateOpen: boolean): number {
  return bandHeight(earlyOpen, 8) + 14 * HOUR + bandHeight(lateOpen, 2);
}

export function columnTypes(types: ResourceTypeConfig[]): ResourceTypeConfig[] {
  return sortedTypes(types).filter(
    (type) => type.role === 'place' || type.role === 'resource',
  );
}

/** One place plus another resource type opens on that second type. */
export function defaultColumnTypeId(
  types: ResourceTypeConfig[],
  resources: { resourceTypeId: string }[],
): string {
  const columns = columnTypes(types);
  const place = columns.find((type) => type.role === 'place');
  const placeCount = place
    ? resources.filter((item) => item.resourceTypeId === place.id).length
    : 0;
  const second = columns.find((type) => type.role === 'resource');
  if (placeCount === 1 && second) return second.id;
  return columns[0]?.id ?? '';
}

export function singlePlace(
  types: ResourceTypeConfig[],
  resources: CatalogResource[],
): CatalogResource | null {
  const place = types.find((type) => type.role === 'place');
  if (!place) return null;
  const rows = resources.filter((item) => item.resourceTypeId === place.id);
  return rows.length === 1 ? (rows[0] ?? null) : null;
}

export function canWriteSchedule(role: string | null): boolean {
  return role === 'owner' || role === 'administrator';
}

export function buildGrid(input: {
  slots: SlotInfo[];
  resources: CatalogResource[];
  types: ResourceTypeConfig[];
  viewZone: string;
  columnTypeId: string;
  filters: Record<string, string>;
  monday: string;
  layout?: 'down' | 'week';
  contextResourceId?: string;
  audienceEnabled: boolean;
  formatEnabled: boolean;
  language: 'en' | 'sk' | 'uk';
  now?: Date;
}): GridModel {
  const now = input.now ?? new Date();
  const today = todayIn(input.viewZone, now);
  const columnType = input.types.find((type) => type.id === input.columnTypeId);
  const visible = input.slots.filter((slot) =>
    matchesFilters(slot, input.filters, input.types),
  );
  const specific = input.types.some((type) => {
    const selected = input.filters[type.id];
    return (
      selected !== undefined &&
      selected !== 'all' &&
      (type.role === 'place' || type.role === 'resource')
    );
  });
  const kind: GridModel['kind'] =
    input.layout ??
    (specific || input.contextResourceId !== undefined ? 'week' : 'down');
  const days = weekDates(input.monday).map((date) => ({
    date,
    heading: dayHeading(date),
    today: date === today,
  }));
  const placed = visible.flatMap((slot) =>
    placeSlot(slot, input, columnType, kind, now),
  );
  const night = {
    early: placed.some((item) => item.startMin < 8 * 60),
    late: placed.some((item) => item.endMin > 22 * 60),
  };
  const hideEmpty = input.types.some((type) => {
    const selected = input.filters[type.id];
    return selected !== undefined && selected !== 'all';
  });
  const columns =
    kind === 'week'
      ? days
          .filter(
            (day) =>
              !hideEmpty || placed.some((item) => item.date === day.date),
          )
          .map((day) => ({
            id: day.date,
            label: day.heading,
            today: day.today,
          }))
      : resourceColumns(input.resources, columnType, placed, hideEmpty);

  const cards: GridCard[] = [];
  const strips: GridStrip[] = [];
  for (const group of groupBy(
    placed,
    (item) => `${item.columnId}|${item.date}`,
  )) {
    const live = group.filter((item) => !item.inactive);
    const inactive = group.filter((item) => item.inactive);
    cards.push(...live);
    for (const status of ['cancelled', 'no_show']) {
      const rows = inactive.filter((item) => item.status === status);
      for (const cluster of clusters(rows)) {
        const startMin = Math.min(...cluster.map((item) => item.startMin));
        const endMin = Math.max(...cluster.map((item) => item.endMin));
        const covered = live.some(
          (item) => item.startMin < endMin && startMin < item.endMin,
        );
        const first = cluster[0];
        if (!first) continue;
        const slotIds = [...new Set(cluster.map((item) => item.slotId))];
        const label = statusLabel(status);
        if (covered) {
          strips.push({
            key: `strip-${first.columnId}-${first.date}-${status}-${startMin}`,
            slotIds,
            label,
            columnId: first.columnId,
            date: first.date,
            startMin,
            endMin,
          });
        } else {
          cards.push({
            key: `inactive-${first.columnId}-${first.date}-${status}-${startMin}`,
            slotId: slotIds[0] ?? '',
            columnId: first.columnId,
            date: first.date,
            startMin,
            endMin,
            title: label,
            lines: [`${timeLabel(startMin)}–${timeLabel(endMin)}`],
            listIds: slotIds,
            past: cluster.every((item) => item.past),
          });
        }
      }
    }
  }

  return { kind, days, columns, cards, strips, night };
}

interface Placed extends GridCard {
  inactive: boolean;
  status: string;
}

function placeSlot(
  slot: SlotInfo,
  input: {
    resources: CatalogResource[];
    types: ResourceTypeConfig[];
    viewZone: string;
    contextResourceId?: string;
    audienceEnabled: boolean;
    formatEnabled: boolean;
  },
  columnType: ResourceTypeConfig | undefined,
  kind: 'down' | 'week',
  now: Date,
): Placed[] {
  const place = input.resources.find(
    (item) => item.id === slot.placeResourceId,
  );
  const zone = place?.timeZone ?? input.viewZone;
  const start = instantOf(slot.date, slot.startTime, zone);
  const end = new Date(start.getTime() + slot.durationMinutes * 60_000);
  const startWall = wallOf(start, input.viewZone);
  const endWall = wallOf(end, input.viewZone);
  const endText =
    endWall.time === '00:00' && endWall.date !== startWall.date
      ? '24:00'
      : endWall.time;
  const lines = detailLines(
    slot,
    input,
    columnType,
    kind,
    `${startWall.time}–${endText}`,
  );
  const title = slotTitle(slot, input.resources, input.types);
  const past = hasStarted(slot.date, slot.startTime, zone, now);
  const spans = spansOf(startWall, endWall);
  const cards: Placed[] = [];
  for (const span of spans) {
    const columnIds =
      kind === 'week'
        ? [span.date]
        : columnsFor(slot, input.resources, columnType);
    for (const columnId of columnIds) {
      cards.push({
        key: `${slot.id}-${columnId}-${span.date}`,
        slotId: slot.id,
        columnId,
        date: span.date,
        startMin: span.startMin,
        endMin: span.endMin,
        title,
        lines,
        past,
        neutral: slot.kind === 'block',
        inactive: !slot.occupiesResources,
        status: slot.status,
      });
    }
  }
  return cards;
}

function slotTitle(
  slot: SlotInfo,
  resources: CatalogResource[],
  types: ResourceTypeConfig[],
): string {
  if (slot.kind === 'block') {
    const note = slot.note?.trim();
    return note ? note : texts.blockedTime;
  }
  const offeringIds = new Set(
    types.filter((type) => type.role === 'offering').map((type) => type.id),
  );
  const names = slot.resourceIds
    .map((id) => resources.find((item) => item.id === id))
    .filter(
      (item): item is CatalogResource =>
        item !== undefined && offeringIds.has(item.resourceTypeId),
    )
    .map((item) => item.name);
  return names.length > 0 ? names.join(', ') : texts.service;
}

function detailLines(
  slot: SlotInfo,
  input: {
    resources: CatalogResource[];
    types: ResourceTypeConfig[];
    contextResourceId?: string;
    audienceEnabled: boolean;
    formatEnabled: boolean;
  },
  columnType: ResourceTypeConfig | undefined,
  kind: 'down' | 'week',
  timeLine: string,
): string[] {
  const lines = [timeLine];
  const place = input.resources.find(
    (item) => item.id === slot.placeResourceId,
  );
  const hidePlace = kind === 'down' && columnType?.role === 'place';
  if (
    place &&
    !hidePlace &&
    place.id !== input.contextResourceId &&
    slot.kind === 'service'
  ) {
    lines.push(place.name);
  }
  for (const id of slot.resourceIds) {
    if (id === input.contextResourceId) continue;
    const resource = input.resources.find((item) => item.id === id);
    if (!resource) continue;
    const type = input.types.find(
      (item) => item.id === resource.resourceTypeId,
    );
    if (type?.role === 'offering') continue;
    if (kind === 'down' && resource.resourceTypeId === columnType?.id) continue;
    lines.push(resource.name);
  }
  if (slot.blocksAll) lines.push(texts.allResources);
  if (
    slot.kind === 'service' &&
    slot.occupiesResources &&
    slot.status !== 'planned'
  ) {
    lines.push(statusLabel(slot.status));
  }
  if (
    slot.kind === 'service' &&
    input.formatEnabled &&
    slot.format &&
    slot.format !== 'offline'
  ) {
    lines.push(formatLabel(slot.format));
  }
  if (
    slot.kind === 'service' &&
    input.audienceEnabled &&
    slot.audience === 'one_person'
  ) {
    lines.push(texts.onePerson);
  }
  return lines;
}

function columnsFor(
  slot: SlotInfo,
  resources: CatalogResource[],
  columnType: ResourceTypeConfig | undefined,
): string[] {
  if (!columnType) return [];
  if (slot.blocksAll) {
    return resources
      .filter((item) => item.resourceTypeId === columnType.id)
      .map((item) => item.id);
  }
  if (columnType.role === 'place') return [slot.placeResourceId];
  return slot.resourceIds.filter(
    (id) =>
      resources.find((item) => item.id === id)?.resourceTypeId ===
      columnType.id,
  );
}

function matchesFilters(
  slot: SlotInfo,
  filters: Record<string, string>,
  types: ResourceTypeConfig[],
): boolean {
  if (slot.blocksAll) return true;
  for (const type of types) {
    const selected = filters[type.id];
    if (selected === undefined || selected === 'all') continue;
    if (type.role === 'place') {
      if (slot.placeResourceId !== selected) return false;
    } else if (!slot.resourceIds.includes(selected)) return false;
  }
  return true;
}

function resourceColumns(
  resources: CatalogResource[],
  columnType: ResourceTypeConfig | undefined,
  placed: Placed[],
  hideEmpty: boolean,
): { id: string; label: string; today: boolean }[] {
  if (!columnType) return [];
  return resources
    .filter((item) => item.resourceTypeId === columnType.id)
    .filter(
      (item) => !hideEmpty || placed.some((card) => card.columnId === item.id),
    )
    .map((item) => ({ id: item.id, label: item.name, today: false }));
}

function spansOf(
  start: { date: string; time: string },
  end: { date: string; time: string },
): { date: string; startMin: number; endMin: number }[] {
  const startMin = minutesOf(start.time);
  if (start.date === end.date) {
    const endMin = minutesOf(end.time);
    return [
      { date: start.date, startMin, endMin: endMin === 0 ? startMin : endMin },
    ];
  }
  const spans = [{ date: start.date, startMin, endMin: 24 * 60 }];
  if (end.time !== '00:00') {
    spans.push({
      date: end.date,
      startMin: 0,
      endMin: minutesOf(end.time),
    });
  }
  return spans;
}

function groupBy<T>(items: T[], key: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const id = key(item);
    const group = groups.get(id);
    if (group) group.push(item);
    else groups.set(id, [item]);
  }
  return [...groups.values()];
}

function clusters<T extends { startMin: number; endMin: number }>(
  items: T[],
): T[][] {
  const remaining = [...items];
  const groups: T[][] = [];
  while (remaining.length > 0) {
    const group = [remaining.shift()!];
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        const item = remaining[index];
        if (!item) continue;
        if (
          group.some(
            (kept) =>
              kept.startMin < item.endMin && item.startMin < kept.endMin,
          )
        ) {
          group.push(item);
          remaining.splice(index, 1);
          grew = true;
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

export function hourTaken(
  cards: { columnId: string; date: string; startMin: number; endMin: number }[],
  strips: {
    columnId: string;
    date: string;
    startMin: number;
    endMin: number;
  }[],
  columnId: string,
  date: string,
  hour: number,
): boolean {
  const start = hour * 60;
  const end = start + 60;
  return [...cards, ...strips].some(
    (item) =>
      item.columnId === columnId &&
      item.date === date &&
      item.startMin < end &&
      start < item.endMin,
  );
}

export function cellPast(
  date: string,
  minutes: number,
  viewZone: string,
  now = new Date(),
): boolean {
  return hasStarted(date, timeLabel(minutes), viewZone, now);
}

export function dateOfWeekday(weekday: Weekday): string {
  return addDays(TEMPLATE_MONDAY, WEEKDAYS.indexOf(weekday));
}

export function weekdayOfDate(date: string): Weekday {
  const [year, month, day] = dateNumbers(date);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAYS[index === 0 ? 6 : index - 1] ?? 'monday';
}

export function emptyDraft(seed: {
  date: string;
  time: string;
  placeResourceId: string;
  columnTypeId?: string;
  columnResourceId?: string;
  resources: CatalogResource[];
  types: ResourceTypeConfig[];
  audienceEnabled: boolean;
}): SlotDraft {
  const only = singlePlace(seed.types, seed.resources);
  const placeId =
    seed.placeResourceId ||
    only?.id ||
    (seed.columnTypeId &&
    seed.types.find((type) => type.id === seed.columnTypeId)?.role === 'place'
      ? (seed.columnResourceId ?? '')
      : '');
  const place = seed.resources.find((item) => item.id === placeId);
  const byType: Record<string, string[]> = {};
  if (
    seed.columnResourceId &&
    seed.columnTypeId &&
    seed.types.find((type) => type.id === seed.columnTypeId)?.role !== 'place'
  ) {
    byType[seed.columnTypeId] = [seed.columnResourceId];
  }
  return {
    kind: 'service',
    date: seed.date,
    time: seed.time,
    placeResourceId: placeId,
    byType,
    duration: '60',
    audience: seed.audienceEnabled ? 'group' : 'one_person',
    format: place?.type === 'virtual' ? 'online_only' : 'offline',
    places: '',
    note: '',
    blocksAll: false,
    status: 'planned',
  };
}

export function draftFromSlot(
  slot: SlotInfo,
  resources: CatalogResource[],
  types: ResourceTypeConfig[],
  viewZone: string,
): SlotDraft {
  const place = resources.find((item) => item.id === slot.placeResourceId);
  const zone = place?.timeZone ?? viewZone;
  const wall = clockInZone(slot.date, slot.startTime, zone, viewZone);
  const byType: Record<string, string[]> = {};
  for (const id of slot.resourceIds) {
    const resource = resources.find((item) => item.id === id);
    if (!resource) continue;
    const list = byType[resource.resourceTypeId] ?? [];
    list.push(id);
    byType[resource.resourceTypeId] = list;
  }
  return {
    kind: slot.kind,
    date: wall.date,
    time: wall.time,
    placeResourceId: slot.placeResourceId,
    byType,
    duration: String(slot.durationMinutes),
    audience: slot.audience ?? 'one_person',
    format:
      slot.format ?? (place?.type === 'virtual' ? 'online_only' : 'offline'),
    places: slot.places === null ? '' : String(slot.places),
    note: slot.note ?? '',
    blocksAll: slot.blocksAll,
    status: slot.status,
  };
}

export function optionsForType(
  type: ResourceTypeConfig,
  resources: CatalogResource[],
  types: ResourceTypeConfig[],
  draft: SlotDraft,
): CatalogResource[] {
  const ofType = resources.filter((item) => item.resourceTypeId === type.id);
  if (!type.skills || draft.kind === 'block') return ofType;
  const offeringIds = types
    .filter((item) => item.role === 'offering')
    .flatMap((item) => draft.byType[item.id] ?? []);
  if (offeringIds.length === 0) return ofType;
  const linked = ofType.filter((resource) =>
    offeringIds.some((offeringId) => {
      const offering = resources.find((item) => item.id === offeringId);
      return (
        offering?.relatedResourceIds.includes(resource.id) ||
        resource.relatedResourceIds.includes(offeringId)
      );
    }),
  );
  if (linked.length === 0) return ofType;
  const selected = new Set(draft.byType[type.id] ?? []);
  return ofType.filter(
    (resource) =>
      linked.some((item) => item.id === resource.id) ||
      selected.has(resource.id),
  );
}

export function placesRequired(
  draft: SlotDraft,
  place: CatalogResource | undefined,
  audienceEnabled: boolean,
): boolean {
  return (
    draft.kind === 'service' &&
    audienceEnabled &&
    draft.audience === 'group' &&
    draft.format !== 'online_only' &&
    place?.type !== 'virtual'
  );
}

export function validateDraft(
  draft: SlotDraft,
  resources: CatalogResource[],
  types: ResourceTypeConfig[],
  viewZone: string,
  config: ScheduleConfig,
  language: 'en' | 'sk' | 'uk',
): Record<string, string> {
  const errors: Record<string, string> = {};
  const place = resources.find((item) => item.id === draft.placeResourceId);
  if (!draft.date) errors.date = texts.selectDate;
  if (!draft.placeResourceId || !place) errors.place = texts.selectPlace;
  const duration = Number(draft.duration);
  const durationBad =
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 1440 ||
    duration % 5 !== 0;
  if (durationBad) errors.duration = texts.durationError;
  const stepBad =
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time) ||
    Number(draft.time.slice(3)) % 5 !== 0;
  if (stepBad) errors.time = texts.step;
  else if (place?.timeZone && !durationBad && draft.date) {
    const placeTime = clockInZone(
      draft.date,
      draft.time,
      viewZone,
      place.timeZone,
    );
    if (Number(placeTime.time.slice(3)) % 5 !== 0) errors.time = texts.step;
    else if (endsAfterMidnight(placeTime.time, duration))
      errors.time = texts.midnight;
  }
  if (draft.kind === 'service') {
    for (const type of types) {
      if (type.role === 'place' || !type.required) continue;
      const chosen = draft.byType[type.id] ?? [];
      if (chosen.length === 0) {
        errors[`type:${type.id}`] = selectResource(
          typeLabel(type, language, 'singular'),
        );
      }
    }
    if (placesRequired(draft, place, config.audienceEnabled)) {
      const count = Number(draft.places);
      if (!Number.isInteger(count) || count < 1)
        errors.places = texts.placesError;
    }
  }
  return errors;
}

export function slotPayload(
  draft: SlotDraft,
  place: CatalogResource,
  viewZone: string,
  config: ScheduleConfig,
  confirmOverlap: boolean,
  template = false,
): Record<string, unknown> {
  const zone = place.timeZone ?? viewZone;
  const clock = clockInZone(draft.date, draft.time, viewZone, zone);
  const resourceIds =
    draft.kind === 'block' && draft.blocksAll
      ? []
      : Object.values(draft.byType)
          .flat()
          .filter((id) => id !== place.id);
  const body: Record<string, unknown> = {
    kind: draft.kind,
    placeResourceId: draft.placeResourceId,
    resourceIds,
    startTime: clock.time,
    durationMinutes: Number(draft.duration),
  };
  if (template) body.weekday = weekdayOfDate(clock.date);
  else body.date = clock.date;
  if (confirmOverlap) body.confirmOverlap = true;
  if (draft.kind === 'block') {
    body.note = draft.note.trim() === '' ? null : draft.note.trim();
    body.blocksAll = draft.blocksAll;
    body.audience = null;
    body.format = null;
    body.places = null;
    return body;
  }
  const virtual = place.type === 'virtual';
  const format = !config.formatEnabled
    ? virtual
      ? 'online_only'
      : 'offline'
    : virtual
      ? 'online_only'
      : draft.format;
  const audience = config.audienceEnabled ? draft.audience : 'one_person';
  body.audience = audience;
  body.format = format;
  body.places =
    !config.audienceEnabled ||
    audience === 'one_person' ||
    format === 'online_only' ||
    virtual
      ? null
      : Number(draft.places);
  body.note = null;
  body.blocksAll = false;
  return body;
}

export function applyApiError(
  error: ApiError,
  draft: SlotDraft,
  place: CatalogResource | undefined,
  viewZone: string,
): { fields: Record<string, string>; alert: string | null } {
  if (error.code === 'RESOURCE_BUSY' && error.conflict) {
    return {
      fields: {},
      alert: busySentence(error.conflict) ?? texts.failed,
    };
  }
  const fields: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    const text = fieldText(item.field, draft, place, viewZone);
    if (item.field === 'date' && text) fields.date = text;
    if (item.field === 'startTime' && text) fields.time = text;
    if (item.field === 'placeResourceId' && text) fields.place = text;
    if (item.field === 'durationMinutes' && text) fields.duration = text;
    if (item.field === 'places' && text) fields.places = text;
    if (item.field === 'resourceIds' && text) fields.resources = text;
  }
  if (Object.keys(fields).length > 0) return { fields, alert: null };
  return { fields: {}, alert: texts.failed };
}

function fieldText(
  field: string,
  draft: SlotDraft,
  place: CatalogResource | undefined,
  viewZone: string,
): string | null {
  if (field === 'date') return texts.selectDate;
  if (field === 'placeResourceId') return texts.selectPlace;
  if (field === 'durationMinutes') return texts.durationError;
  if (field === 'places') return texts.placesError;
  if (field === 'resourceIds') return texts.failed;
  if (field === 'startTime') {
    if (place?.timeZone && draft.time && draft.duration && draft.date) {
      const duration = Number(draft.duration);
      if (Number.isInteger(duration)) {
        const placeTime = clockInZone(
          draft.date,
          draft.time,
          viewZone,
          place.timeZone,
        );
        if (endsAfterMidnight(placeTime.time, duration)) return texts.midnight;
      }
    }
    return texts.step;
  }
  return null;
}

export function viewZoneFor(input: {
  orgZone: string;
  resources: CatalogResource[];
  types: ResourceTypeConfig[];
  filters: Record<string, string>;
  embeddedResourceId?: string;
}): string {
  if (input.embeddedResourceId) {
    const resource = input.resources.find(
      (item) => item.id === input.embeddedResourceId,
    );
    const type = input.types.find(
      (item) => item.id === resource?.resourceTypeId,
    );
    if (type?.role === 'place' && resource?.timeZone) return resource.timeZone;
    return input.orgZone;
  }
  const placeType = input.types.find((type) => type.role === 'place');
  const selected = placeType ? input.filters[placeType.id] : undefined;
  if (selected && selected !== 'all') {
    const place = input.resources.find((item) => item.id === selected);
    if (place?.timeZone) return place.timeZone;
  }
  return input.orgZone;
}
