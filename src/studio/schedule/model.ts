import type { ApiError } from '../api/api-error';
import {
  clockInZone,
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
import { formatLabel, hallBusy, texts, trainerBusy } from './texts';

export interface HallInfo {
  id: string;
  name: string;
  type: 'ordinary' | 'virtual';
  timeZone: string;
}

export interface Named {
  id: string;
  name: string;
}

export interface ClassTypeInfo extends Named {
  defaultDuration: number;
  trainerIds: string[];
}

export interface ClassInfo {
  id: string;
  hallId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  trainerIds: string[];
  classTypeId: string;
  audience: 'group' | 'one_person';
  format: 'offline' | 'offline_and_online' | 'online_only';
  places: number | null;
  cancelled: boolean;
}

export interface Draft {
  date: string;
  time: string;
  hallId: string;
  classTypeId: string;
  duration: string;
  trainerIds: string[];
  audience: 'group' | 'one_person';
  format: 'offline' | 'offline_and_online' | 'online_only';
  places: string;
}

export interface GridCard {
  key: string;
  classId: string;
  columnId: string;
  date: string;
  startMin: number;
  endMin: number;
  title: string;
  lines: string[];
  past?: boolean;
  /** Set on a «Cancelled» card. A click opens this list instead of the class. */
  listIds?: string[];
}

export interface GridStrip {
  key: string;
  classIds: string[];
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

/** Y of a minute from the top of a day column. */
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

export function buildGrid(input: {
  classes: ClassInfo[];
  halls: HallInfo[];
  trainers: Named[];
  classTypes: ClassTypeInfo[];
  viewZone: string;
  hallId: string;
  trainerId: string;
  classTypeId: string;
  columns: 'halls' | 'trainers';
  monday: string;
  now?: Date;
}): GridModel {
  const now = input.now ?? new Date();
  const today = todayIn(input.viewZone, now);
  const visible = input.classes.filter((item) => {
    if (input.hallId !== 'all' && item.hallId !== input.hallId) return false;
    if (
      input.trainerId !== 'all' &&
      !item.trainerIds.includes(input.trainerId)
    ) {
      return false;
    }
    if (input.classTypeId !== 'all' && item.classTypeId !== input.classTypeId) {
      return false;
    }
    return true;
  });
  const kind: GridModel['kind'] =
    input.hallId === 'all' && input.trainerId === 'all' ? 'down' : 'week';
  const showTrainers = input.hallId !== 'all' || input.columns === 'halls';
  const days = weekDates(input.monday).map((date) => ({
    date,
    heading: dayHeading(date),
    today: date === today,
  }));
  const placed = visible.flatMap((item) =>
    placeClass(item, input, showTrainers, kind),
  );
  const night = {
    early: placed.some((item) => item.startMin < 8 * 60),
    late: placed.some((item) => item.endMin > 22 * 60),
  };
  const hideEmpty = input.classTypeId !== 'all' || input.trainerId !== 'all';
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
      : namedColumns(input, placed, hideEmpty);

  const cards: GridCard[] = [];
  const strips: GridStrip[] = [];
  for (const group of groupBy(
    placed,
    (item) => `${item.columnId}|${item.date}`,
  )) {
    const live = group.filter((item) => !item.cancelled);
    const cancelled = group.filter((item) => item.cancelled);
    cards.push(...live);
    for (const cluster of clusters(cancelled)) {
      const startMin = Math.min(...cluster.map((item) => item.startMin));
      const endMin = Math.max(...cluster.map((item) => item.endMin));
      const covered = live.some(
        (item) => item.startMin < endMin && startMin < item.endMin,
      );
      const classIds = [...new Set(cluster.map((item) => item.classId))];
      if (covered) {
        strips.push({
          key: `strip-${cluster[0].columnId}-${cluster[0].date}-${startMin}`,
          classIds,
          columnId: cluster[0].columnId,
          date: cluster[0].date,
          startMin,
          endMin,
        });
      } else {
        cards.push({
          key: `cancelled-${cluster[0].columnId}-${cluster[0].date}-${startMin}`,
          classId: classIds[0],
          columnId: cluster[0].columnId,
          date: cluster[0].date,
          startMin,
          endMin,
          title: texts.cancelled,
          lines: [`${timeLabel(startMin)}–${timeLabel(endMin)}`],
          listIds: classIds,
          past: cluster.every((item) => item.past),
        });
      }
    }
  }

  return { kind, days, columns, cards, strips, night };
}

interface Placed extends GridCard {
  cancelled: boolean;
}

function placeClass(
  item: ClassInfo,
  input: {
    halls: HallInfo[];
    trainers: Named[];
    classTypes: ClassTypeInfo[];
    viewZone: string;
    columns: 'halls' | 'trainers';
    now?: Date;
  },
  showTrainers: boolean,
  kind: 'down' | 'week',
): Placed[] {
  const hall = input.halls.find((entry) => entry.id === item.hallId);
  if (!hall) return [];
  const start = instantOf(item.date, item.startTime, hall.timeZone);
  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  const startWall = wallOf(start, input.viewZone);
  const endWall = wallOf(end, input.viewZone);
  const endText =
    endWall.time === '00:00' && endWall.date !== startWall.date
      ? '24:00'
      : endWall.time;
  const lines = [`${startWall.time}–${endText}`];
  if (showTrainers) {
    const names = item.trainerIds
      .map((id) => input.trainers.find((entry) => entry.id === id)?.name)
      .filter((name): name is string => name !== undefined);
    if (names.length > 0) lines.push(names.join(', '));
  } else {
    lines.push(hall.name);
  }
  if (item.format !== 'offline') lines.push(formatLabel(item.format));
  if (item.audience === 'one_person') lines.push(texts.onePerson);
  const title =
    input.classTypes.find((entry) => entry.id === item.classTypeId)?.name ??
    item.classTypeId;
  const spans = spansOf(startWall, endWall);
  const cards: Placed[] = [];
  for (const span of spans) {
    const columnIds =
      kind === 'week'
        ? [span.date]
        : input.columns === 'halls'
          ? [item.hallId]
          : item.trainerIds;
    for (const columnId of columnIds) {
      cards.push(
        placed(
          item,
          columnId,
          span.date,
          span,
          title,
          lines,
          hasStarted(
            item.date,
            item.startTime,
            hall.timeZone,
            input.now ?? new Date(),
          ),
        ),
      );
    }
  }
  return cards;
}

function placed(
  item: ClassInfo,
  columnId: string,
  date: string,
  span: { date: string; startMin: number; endMin: number },
  title: string,
  lines: string[],
  past: boolean,
): Placed {
  return {
    key: `${item.id}-${columnId}-${span.date}`,
    classId: item.id,
    columnId,
    date,
    startMin: span.startMin,
    endMin: span.endMin,
    title,
    lines,
    past,
    cancelled: item.cancelled,
  };
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

function namedColumns(
  input: {
    halls: HallInfo[];
    trainers: Named[];
    columns: 'halls' | 'trainers';
  },
  placed: Placed[],
  hideEmpty: boolean,
): { id: string; label: string; today: boolean }[] {
  const source =
    input.columns === 'halls'
      ? input.halls.map((hall) => ({ id: hall.id, label: hall.name }))
      : input.trainers.map((trainer) => ({
          id: trainer.id,
          label: trainer.name,
        }));
  return source
    .filter(
      (column) =>
        !hideEmpty || placed.some((item) => item.columnId === column.id),
    )
    .map((column) => ({ ...column, today: false }));
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

export function emptyDraft(seed: {
  date: string;
  time: string;
  hallId: string;
  trainerId: string;
  hall?: HallInfo;
}): Draft {
  return {
    date: seed.date,
    time: seed.time,
    hallId: seed.hallId === 'all' ? '' : seed.hallId,
    classTypeId: '',
    duration: '',
    trainerIds: seed.trainerId === 'all' ? [] : [seed.trainerId],
    audience: 'group',
    format: seed.hall?.type === 'virtual' ? 'online_only' : 'offline',
    places: '',
  };
}

export function draftFromClass(
  item: ClassInfo,
  hallZone: string,
  viewZone: string,
): Draft {
  const wall = clockInZone(item.date, item.startTime, hallZone, viewZone);
  return {
    date: wall.date,
    time: wall.time,
    hallId: item.hallId,
    classTypeId: item.classTypeId,
    duration: String(item.durationMinutes),
    trainerIds: [...item.trainerIds],
    audience: item.audience,
    format: item.format,
    places: item.places === null ? '' : String(item.places),
  };
}

export function validateDraft(
  draft: Draft,
  hall: HallInfo | undefined,
  viewZone: string,
  requireType: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.date) errors.date = texts.selectDate;
  if (!draft.hallId || !hall) errors.hall = texts.selectHall;
  if (requireType && !draft.classTypeId)
    errors.classType = texts.selectClassType;
  if (draft.trainerIds.length === 0) errors.trainers = texts.selectTrainer;
  const duration = Number(draft.duration);
  const durationBad =
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 240 ||
    duration % 5 !== 0;
  if (durationBad) errors.duration = texts.durationError;
  const stepBad =
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time) ||
    Number(draft.time.slice(3)) % 5 !== 0;
  if (stepBad) errors.time = texts.step;
  else if (hall && !durationBad) {
    const hallTime = clockInZone(
      draft.date,
      draft.time,
      viewZone,
      hall.timeZone,
    );
    if (Number(hallTime.time.slice(3)) % 5 !== 0) errors.time = texts.step;
    else if (endsAfterMidnight(hallTime.time, duration))
      errors.time = texts.midnight;
  }
  if (placesRequired(draft, hall)) {
    const places = Number(draft.places);
    if (!Number.isInteger(places) || places < 1)
      errors.places = texts.placesError;
  }
  return errors;
}

export function placesRequired(
  draft: Draft,
  hall: HallInfo | undefined,
): boolean {
  return (
    draft.audience === 'group' &&
    draft.format !== 'online_only' &&
    hall?.type !== 'virtual'
  );
}

export function classBody(
  draft: Draft,
  hall: HallInfo,
  viewZone: string,
  includeType: boolean,
): Record<string, unknown> {
  const clock = clockInZone(draft.date, draft.time, viewZone, hall.timeZone);
  const format = hall.type === 'virtual' ? 'online_only' : draft.format;
  const body: Record<string, unknown> = {
    hallId: draft.hallId,
    date: clock.date,
    startTime: clock.time,
    durationMinutes: Number(draft.duration),
    trainerIds: draft.trainerIds,
    audience: draft.audience,
    format,
    places: placesRequired({ ...draft, format }, hall)
      ? Number(draft.places)
      : null,
  };
  if (includeType) body.classTypeId = draft.classTypeId;
  return body;
}

export function applyApiError(
  error: ApiError,
  draft: Draft,
  hall: HallInfo | undefined,
  viewZone: string,
): { fields: Record<string, string>; alert: string | null } {
  if (
    error.code === 'HALL_BUSY' &&
    error.conflict?.classTypeName &&
    error.conflict.start &&
    error.conflict.end
  ) {
    return {
      fields: {},
      alert: hallBusy(
        error.conflict.classTypeName,
        error.conflict.start,
        error.conflict.end,
      ),
    };
  }
  if (
    error.code === 'TRAINER_BUSY' &&
    error.conflict?.trainerName &&
    error.conflict.hallName
  ) {
    return {
      fields: {},
      alert: trainerBusy(
        error.conflict.trainerName,
        error.conflict.hallName,
        error.conflict.start,
        error.conflict.end,
      ),
    };
  }
  const fields: Record<string, string> = {};
  for (const item of error.fieldErrors) {
    const key = fieldKey(item.field);
    const text = fieldText(item.field, item.code, draft, hall, viewZone);
    if (key && text) fields[key] = text;
  }
  if (Object.keys(fields).length > 0) return { fields, alert: null };
  return { fields: {}, alert: texts.failed };
}

function fieldKey(field: string): string | null {
  if (field === 'date') return 'date';
  if (field === 'startTime') return 'time';
  if (field === 'hallId') return 'hall';
  if (field === 'classTypeId') return 'classType';
  if (field === 'durationMinutes') return 'duration';
  if (field === 'trainerIds') return 'trainers';
  if (field === 'places') return 'places';
  return null;
}

function fieldText(
  field: string,
  code: string,
  draft: Draft,
  hall: HallInfo | undefined,
  viewZone: string,
): string | null {
  if (field === 'date' && code === 'REQUIRED') return texts.selectDate;
  if (field === 'hallId' && code === 'REQUIRED') return texts.selectHall;
  if (field === 'classTypeId' && code === 'REQUIRED')
    return texts.selectClassType;
  if (field === 'trainerIds' && code === 'REQUIRED') return texts.selectTrainer;
  if (field === 'durationMinutes') return texts.durationError;
  if (field === 'places') return texts.placesError;
  if (field === 'startTime') {
    if (hall && draft.time && draft.duration) {
      const duration = Number(draft.duration);
      if (Number.isInteger(duration)) {
        const hallTime = clockInZone(
          draft.date,
          draft.time,
          viewZone,
          hall.timeZone,
        );
        if (endsAfterMidnight(hallTime.time, duration)) return texts.midnight;
      }
    }
    return texts.step;
  }
  return null;
}

export function offeredTrainers(
  classType: ClassTypeInfo | undefined,
  trainers: Named[],
  selected: string[],
): Named[] {
  const linked = classType?.trainerIds ?? [];
  if (linked.length === 0) return trainers;
  return trainers.filter(
    (trainer) => linked.includes(trainer.id) || selected.includes(trainer.id),
  );
}
