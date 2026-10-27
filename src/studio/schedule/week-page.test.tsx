// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { WeekPage } from './week-page';
import { notify } from '../../shared/ui/toaster';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'owner@example.com',
    language: 'en',
  }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({ request }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

const main = {
  id: 'h1',
  name: 'Main',
  type: 'ordinary' as const,
  timeZone: 'Europe/Bratislava',
};
const east = {
  id: 'h2',
  name: 'East',
  type: 'ordinary' as const,
  timeZone: 'America/New_York',
};
const anna = { id: 'anna', name: 'Anna' };
const boris = { id: 'boris', name: 'Boris' };
const yoga = {
  id: 'yoga',
  name: 'Yoga',
  defaultDuration: 60,
  trainerIds: ['anna'],
};

function klass(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    hallId: 'h1',
    date: '2026-10-12',
    startTime: '10:00',
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

function install(options: {
  role?: string;
  halls?: (typeof main)[];
  classes?: Record<string, unknown>[];
}) {
  request.mockImplementation(async (path: string) => {
    if (path === '/me') return { role: options.role ?? 'owner' };
    if (path === '/settings') return { timeZone: 'Europe/Bratislava' };
    if (path === '/settings/options') {
      return { timeZones: ['Europe/Bratislava', 'America/New_York'] };
    }
    if (path.startsWith('/halls')) {
      return { items: options.halls ?? [main], meta: { totalPages: 1 } };
    }
    if (path.startsWith('/trainers')) {
      return { items: [anna, boris], meta: { totalPages: 1 } };
    }
    if (path.startsWith('/class-types')) {
      return { items: [yoga], meta: { totalPages: 1 } };
    }
    if (path.startsWith('/classes')) return { items: options.classes ?? [] };
    return {};
  });
}

async function openMenu(name: string) {
  await act(async () => {
    fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' });
  });
}

async function openWeek() {
  render(<WeekPage />);
  await screen.findByRole('button', { name: /12\.10\.2026/ });
}

describe('Schedule week', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    Element.prototype.scrollIntoView = () => {};
    localStorage.clear();
    request.mockReset();
    vi.mocked(notify.success).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens the current week, keeps filters across weeks, and clears them on leave', async () => {
    install({});
    const first = render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    await openMenu('Hall');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Main' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await waitFor(() => {
      const last = request.mock.calls
        .map((call) => String(call[0]))
        .filter((path) => path.startsWith('/classes?'))
        .at(-1);
      expect(last).toContain('from=2026-10-19');
      expect(last).toContain('hallId=h1');
    });
    first.unmount();
    request.mockClear();
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    await waitFor(() => {
      const paths = request.mock.calls
        .map((call) => String(call[0]))
        .filter((path) => path.startsWith('/classes?'));
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.every((path) => !path.includes('hallId'))).toBe(true);
    });
  });

  it('does not open a past cell, and a past class has no actions', async () => {
    install({ classes: [klass()] });
    await openWeek();
    expect(
      screen.queryByRole('button', { name: 'Monday 12.10 10:00 Main' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Saturday 17.10 15:00 Main' }),
    );
    expect(screen.getByRole('heading', { name: 'New class' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: /Yoga/ }));
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel class' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
  });

  it('offers only Restore and Delete for a future cancelled class', async () => {
    install({
      classes: [
        klass({
          id: 'later',
          date: '2026-10-17',
          startTime: '18:00',
          cancelled: true,
        }),
      ],
    });
    await openWeek();
    fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }));
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel class' })).toBeNull();
  });

  it('shows the hall week with only that trainer', async () => {
    install({
      classes: [
        klass({ id: 'anna-class', date: '2026-10-17', startTime: '18:00' }),
        klass({
          id: 'boris-class',
          date: '2026-10-17',
          startTime: '19:00',
          trainerIds: ['boris'],
        }),
      ],
    });
    await openWeek();
    await openMenu('Hall');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Main' }));
    await openMenu('Trainer');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Anna' }));
    await waitFor(() => {
      const last = request.mock.calls
        .map((call) => String(call[0]))
        .filter((path) => path.startsWith('/classes?'))
        .at(-1);
      expect(last).toContain('hallId=h1');
      expect(last).toContain('trainerId=anna');
    });
    expect(screen.getByRole('button', { name: /Yoga/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Halls' })).toBeNull();
    expect(document.querySelector('[data-layout="week"]')).toBeTruthy();
  });

  it('moves a class when the view zone changes and still sends the hall clock', async () => {
    install({
      halls: [east],
      classes: [
        klass({
          hallId: 'h2',
          date: '2026-10-17',
          startTime: '12:00',
        }),
      ],
    });
    await openWeek();
    expect(screen.getByRole('button', { name: /18:00–19:00/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /18:00–19:00/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/classes/c1', {
        method: 'PATCH',
        body: expect.objectContaining({
          hallId: 'h2',
          date: '2026-10-17',
          startTime: '12:00',
        }),
      });
    });
    fireEvent.click(screen.getByRole('combobox', { name: /Time zone/ }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'America/New_York' }),
    );
    expect(
      await screen.findByRole('button', { name: /12:00–13:00/ }),
    ).toBeTruthy();
  });

  it('lets a trainer look and not save', async () => {
    install({
      role: 'trainer',
      classes: [klass({ date: '2026-10-17', startTime: '18:00' })],
    });
    await openWeek();
    expect(
      screen.queryByRole('button', { name: 'Saturday 17.10 15:00 Main' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Yoga/ }));
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('remembers a night band and forgets a collapsed day', async () => {
    install({});
    const first = render(<WeekPage />);
    const band = async () =>
      (await screen.findAllByRole('button', { name: '00:00–08:00' }))[0];
    expect((await band()).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(await band());
    expect((await band()).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Monday 12.10' }));
    expect(
      screen
        .getByRole('button', { name: 'Monday 12.10' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    first.unmount();
    render(<WeekPage />);
    expect((await band()).getAttribute('aria-expanded')).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Monday 12.10' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Monday 12.10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(
      screen
        .getByRole('button', { name: 'Monday 19.10' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
