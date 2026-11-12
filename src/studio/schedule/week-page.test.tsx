// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ApiError } from '../api/api-error';
import { notify } from '../../shared/ui/toaster';
import { WeekPage } from './week-page';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'owner@example.com',
    language: 'en',
    config: {
      catalogConfig: {
        resourceTypes: [
          {
            id: 'place-type',
            sortOrder: 0,
            role: 'place',
            labels: labels('hall', 'halls'),
            geography: true,
            duration: false,
            showcase: false,
            person: false,
            skills: false,
            required: true,
            multiple: false,
            conflictMode: 'strict',
          },
          {
            id: 'trainer-type',
            sortOrder: 1,
            role: 'resource',
            labels: labels('trainer', 'trainers'),
            geography: false,
            duration: false,
            showcase: false,
            person: true,
            skills: true,
            required: false,
            multiple: true,
            conflictMode: 'warning',
          },
          {
            id: 'offering-type',
            sortOrder: 2,
            role: 'offering',
            labels: labels('class type', 'class types'),
            geography: false,
            duration: true,
            showcase: false,
            person: false,
            skills: true,
            required: false,
            multiple: false,
            conflictMode: 'none',
          },
        ],
      },
      scheduleConfig: {
        audienceEnabled: true,
        formatEnabled: true,
        statuses: ['planned', 'cancelled', 'completed', 'no_show'],
      },
      billingConfig: { settlementMode: 'subscription' },
    },
  }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({ request }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

function labels(singular: string, plural: string) {
  const pair = { singular, plural };
  return { en: pair, sk: pair, uk: pair };
}

function catalog(partial: Record<string, unknown>) {
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

const main = catalog({
  id: 'h1',
  resourceTypeId: 'place-type',
  name: 'Main',
  type: 'ordinary',
  address: 'Hlavná 1',
  timeZone: 'Europe/Bratislava',
});
const east = catalog({
  id: 'h2',
  resourceTypeId: 'place-type',
  name: 'East',
  type: 'ordinary',
  address: 'East 2',
  timeZone: 'America/New_York',
});
const anna = catalog({
  id: 'anna',
  resourceTypeId: 'trainer-type',
  name: 'Anna',
});
const yoga = catalog({
  id: 'yoga',
  resourceTypeId: 'offering-type',
  name: 'Yoga',
  defaultDuration: 60,
  relatedResourceIds: ['anna'],
});

function slot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    kind: 'service',
    placeResourceId: 'h1',
    resourceIds: ['anna', 'yoga'],
    date: '2026-10-12',
    startTime: '10:00',
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

function page(items: unknown[]) {
  return {
    items,
    meta: {
      currentPage: 1,
      perPage: 100,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

function install(options: {
  role?: string;
  halls?: Record<string, unknown>[];
  slots?: Record<string, unknown>[];
  overlap?: boolean;
}) {
  request.mockImplementation(
    async (
      path: string,
      init?: { method?: string; body?: { confirmOverlap?: boolean } },
    ) => {
      if (path === '/me') return { role: options.role ?? 'owner' };
      if (path === '/settings') return { timeZone: 'Europe/Bratislava' };
      if (path === '/settings/options') {
        return { timeZones: ['Europe/Bratislava', 'America/New_York'] };
      }
      if (path.startsWith('/resources?')) {
        const type = new URL(path, 'http://local').searchParams.get(
          'resourceTypeId',
        );
        if (type === 'place-type') return page(options.halls ?? [main, east]);
        if (type === 'trainer-type') return page([anna]);
        if (type === 'offering-type') return page([yoga]);
        return page([]);
      }
      if (path === '/schedule-slots' && init?.method === 'POST') {
        if (options.overlap && init.body?.confirmOverlap !== true) {
          throw new ApiError(409, 'OVERLAP_WARNING', [], undefined, [
            {
              resourceName: 'Anna',
              title: 'Yoga',
              start: '15:00',
              end: '16:00',
            },
          ]);
        }
        return { id: 'created' };
      }
      if (path.startsWith('/schedule-slots'))
        return { items: options.slots ?? [] };
      if (path.startsWith('/week-templates')) return page([]);
      return {};
    },
  );
}

function openMenu(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name }), {
    key: 'Enter',
  });
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

  it('opens trainer columns when there is a single place', async () => {
    install({ halls: [main] });
    render(<WeekPage />);
    const trainers = await screen.findByRole('button', { name: 'trainers' });
    expect(trainers.getAttribute('aria-pressed')).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'halls' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('does not open a past cell and lets a past service change status', async () => {
    install({ slots: [slot()] });
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    expect(
      screen.queryByRole('button', { name: 'Monday 12.10 10:00 Main' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Saturday 17.10 15:00 Main' }),
    );
    expect(screen.getByRole('combobox', { name: 'Service' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Monday 12.10' }));
    fireEvent.click(screen.getByRole('button', { name: /Yoga/ }));
    expect(screen.queryByRole('button', { name: 'Cancel slot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Completed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/schedule-slots/c1', {
        method: 'PATCH',
        body: { status: 'completed' },
      });
    });
  });

  it('saves a block and confirms an overlap warning', async () => {
    install({ overlap: true });
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    fireEvent.click(
      screen.getByRole('button', { name: 'Saturday 17.10 15:00 Main' }),
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Service' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Block time' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason / Note' }), {
      target: { value: 'Lunch' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Block entire organization' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Anna is busy at this time: Yoga 15:00–16:00'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/schedule-slots', {
        method: 'POST',
        body: expect.objectContaining({
          kind: 'block',
          note: 'Lunch',
          blocksAll: true,
          placeResourceId: 'h1',
          confirmOverlap: true,
        }),
      });
    });
  });

  it('offers Restore and Delete for a future cancelled slot', async () => {
    install({
      slots: [
        slot({
          id: 'later',
          date: '2026-10-17',
          startTime: '18:00',
          status: 'cancelled',
          occupiesResources: false,
        }),
      ],
    });
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    fireEvent.click(screen.getByRole('button', { name: /Cancelled/ }));
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('filters to one hall and forgets the filter when the page is left', async () => {
    install({
      slots: [
        slot({ id: 'main-slot', date: '2026-10-17', startTime: '18:00' }),
        slot({
          id: 'east-slot',
          placeResourceId: 'h2',
          date: '2026-10-17',
          startTime: '19:00',
        }),
      ],
    });
    const first = render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    openMenu('hall');
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Main' }));
    expect(document.querySelector('[data-layout="week"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Yoga/ })).toBeTruthy();
    first.unmount();
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    expect(document.querySelector('[data-layout="down"]')).toBeTruthy();
  });

  it('moves a slot into the view zone and still sends the place clock', async () => {
    install({
      halls: [east],
      slots: [
        slot({
          placeResourceId: 'h2',
          date: '2026-10-17',
          startTime: '12:00',
        }),
      ],
    });
    render(<WeekPage />);
    expect(
      await screen.findByRole('button', { name: /18:00–19:00/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /18:00–19:00/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/schedule-slots/c1', {
        method: 'PATCH',
        body: expect.objectContaining({
          placeResourceId: 'h2',
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

  it('hides week actions and saving from a specialist', async () => {
    install({
      role: 'specialist',
      slots: [slot({ date: '2026-10-17', startTime: '18:00' })],
    });
    render(<WeekPage />);
    await screen.findByRole('button', { name: /12\.10\.2026/ });
    expect(screen.queryByRole('button', { name: 'Apply template' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear weeks' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Replace with template' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Saturday 17.10 15:00 Main' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Yoga/ }));
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('shows week actions to an owner', async () => {
    install({});
    render(<WeekPage />);
    expect(
      await screen.findByRole('button', { name: 'Apply template' }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Templates' })).toBeTruthy();
  });

  it('remembers a night band and forgets a collapsed day', async () => {
    install({});
    const first = render(<WeekPage />);
    const band = async () =>
      (await screen.findAllByRole('button', { name: '00:00–08:00' }))[0];
    expect((await band())?.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click((await band())!);
    expect((await band())?.getAttribute('aria-expanded')).toBe('true');
    const monday = screen.getByRole('button', { name: 'Monday 12.10' });
    const sunday = screen.getByRole('button', { name: 'Sunday 18.10' });
    expect(monday.getAttribute('aria-expanded')).toBe('false');
    expect(monday.querySelector('svg')?.getAttribute('class')).toContain(
      'lucide-chevron-right',
    );
    expect(sunday.getAttribute('aria-expanded')).toBe('true');
    expect(sunday.querySelector('svg')?.getAttribute('class')).toContain(
      'lucide-chevron-down',
    );
    fireEvent.click(sunday);
    expect(
      screen
        .getByRole('button', { name: 'Sunday 18.10' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    first.unmount();
    render(<WeekPage />);
    expect((await band())?.getAttribute('aria-expanded')).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Monday 12.10' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    expect(
      screen
        .getByRole('button', { name: 'Sunday 18.10' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
