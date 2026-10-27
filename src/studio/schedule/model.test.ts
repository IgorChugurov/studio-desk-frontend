import { describe, expect, it } from 'vitest';
import { toApiError } from '../api/api-error';
import { clockInZone, mondayOf, todayIn, weekLabel } from './clock';
import { buildGrid, classBody, type ClassInfo, type HallInfo } from './model';

const ny: HallInfo = {
  id: 'ny',
  name: 'East',
  type: 'ordinary',
  timeZone: 'America/New_York',
};
const yoga = {
  id: 'yoga',
  name: 'Yoga',
  defaultDuration: 60,
  trainerIds: ['anna'],
};

function klass(overrides: Partial<ClassInfo> = {}): ClassInfo {
  return {
    id: 'c1',
    hallId: 'ny',
    date: '2026-10-17',
    startTime: '12:00',
    durationMinutes: 60,
    trainerIds: ['anna'],
    classTypeId: 'yoga',
    audience: 'group',
    format: 'offline',
    places: 8,
    cancelled: false,
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

  it('moves a hall clock into the view zone and back', () => {
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
  it('places a class by the view zone and keeps the hall clock on save', () => {
    const grid = buildGrid({
      classes: [klass()],
      halls: [ny],
      trainers: [{ id: 'anna', name: 'Anna' }],
      classTypes: [yoga],
      viewZone: 'Europe/Bratislava',
      hallId: 'all',
      trainerId: 'all',
      classTypeId: 'all',
      columns: 'halls',
      monday: '2026-10-12',
      now: new Date('2026-10-17T12:00:00Z'),
    });
    expect(grid.cards.map((card) => card.lines[0])).toEqual(['18:00–19:00']);
    const body = classBody(
      {
        date: '2026-10-17',
        time: '18:00',
        hallId: 'ny',
        classTypeId: 'yoga',
        duration: '60',
        trainerIds: ['anna'],
        audience: 'group',
        format: 'offline',
        places: '8',
      },
      ny,
      'Europe/Bratislava',
      true,
    );
    expect(body).toMatchObject({
      date: '2026-10-17',
      startTime: '12:00',
      hallId: 'ny',
    });
  });

  it('shows one hall week with only the chosen trainer', () => {
    const grid = buildGrid({
      classes: [
        klass({ id: 'anna-class', trainerIds: ['anna'] }),
        klass({ id: 'boris-class', trainerIds: ['boris'] }),
      ],
      halls: [ny],
      trainers: [
        { id: 'anna', name: 'Anna' },
        { id: 'boris', name: 'Boris' },
      ],
      classTypes: [yoga],
      viewZone: 'America/New_York',
      hallId: 'ny',
      trainerId: 'anna',
      classTypeId: 'all',
      columns: 'halls',
      monday: '2026-10-12',
      now: new Date('2026-10-17T12:00:00Z'),
    });
    expect(grid.kind).toBe('week');
    expect(grid.cards.map((card) => card.classId)).toEqual(['anna-class']);
  });
});

describe('conflict text', () => {
  it('builds the sentence from conflict and drops message', async () => {
    const error = await toApiError(
      new Response(
        JSON.stringify({
          code: 'HALL_BUSY',
          message: 'The hall is busy at this time: Yoga 18:00–19:00',
          conflict: {
            classTypeName: 'Yoga',
            start: '18:00:00',
            end: '19:00:00',
          },
        }),
        { status: 409 },
      ),
    );
    expect(error.message).toBe('409 HALL_BUSY');
    expect(error.conflict).toEqual({
      classTypeName: 'Yoga',
      start: '18:00',
      end: '19:00',
    });
  });
});
