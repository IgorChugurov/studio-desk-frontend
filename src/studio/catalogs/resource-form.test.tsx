// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ResourceForm } from './resource-form';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';

const { push, request, upload } = vi.hoisted(() => ({
  push: vi.fn(),
  request: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    language: 'en',
    email: 'owner@example.com',
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
            showcase: true,
            person: false,
            skills: true,
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
            conflictMode: 'strict',
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
            required: true,
            multiple: false,
            conflictMode: 'none',
          },
        ],
      },
      scheduleConfig: {
        audienceEnabled: true,
        formatEnabled: true,
        statuses: ['planned', 'cancelled'],
      },
      billingConfig: { settlementMode: 'subscription' },
    },
  }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({
    request,
    upload,
    readFile: vi.fn(async () => new Blob(['bytes'])),
  }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

function labels(singular: string, plural: string) {
  const pair = { singular, plural };
  return { en: pair, sk: pair, uk: pair };
}

function blank(partial: Record<string, unknown>) {
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

describe('Resource form', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    Element.prototype.scrollIntoView = () => {};
  });

  afterEach(() => {
    cleanup();
    request.mockReset();
    vi.mocked(notify.success).mockReset();
  });

  it('fills a virtual place address and clears it for an ordinary place', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/settings') return { timeZone: 'Europe/Bratislava' };
      if (path === '/settings/options') {
        return { timeZones: ['Europe/Bratislava'] };
      }
      if (path === '/me') return { role: 'owner' };
      if (String(path).startsWith('/resources?')) {
        return {
          items: [],
          meta: {
            currentPage: 1,
            perPage: 100,
            totalItems: 0,
            totalPages: 1,
          },
        };
      }
      if (String(path).startsWith('/schedule-slots')) return { items: [] };
      return {};
    });
    render(<ResourceForm typeId="place-type" />);
    await screen.findByRole('combobox', { name: 'Time zone' });
    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Virtual' }));
    const address = screen.getByRole('textbox', { name: 'Address' });
    expect((address as HTMLInputElement).value).toBe('Virtual place');
    expect((address as HTMLInputElement).readOnly).toBe(true);
    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Ordinary' }));
    expect(
      (screen.getByRole('textbox', { name: 'Address' }) as HTMLInputElement)
        .value,
    ).toBe('');
  });

  it('rejects a duration outside 5 to 1440 and saves a valid one', async () => {
    request.mockImplementation(async (path: string) => {
      if (String(path).startsWith('/resources?')) {
        return {
          items: [
            blank({ id: 'anna', resourceTypeId: 'trainer-type', name: 'Anna' }),
          ],
          meta: { currentPage: 1, perPage: 100, totalItems: 1, totalPages: 1 },
        };
      }
      return {};
    });
    render(<ResourceForm typeId="offering-type" />);
    const duration = await screen.findByRole('textbox', {
      name: 'Default duration',
    });
    expect((duration as HTMLInputElement).value).toBe('60');
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Yoga' },
    });
    fireEvent.change(duration, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        'Enter a duration from 5 to 1440 minutes in steps of 5',
      ),
    ).toBeTruthy();
    expect(request).not.toHaveBeenCalledWith('/resources', expect.anything());
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Default duration' }),
      {
        target: { value: '90' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'trainers' }));
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/resources', {
        method: 'POST',
        body: expect.objectContaining({
          resourceTypeId: 'offering-type',
          name: 'Yoga',
          defaultDuration: 90,
          relatedResourceIds: ['anna'],
        }),
      });
    });
  });

  it('shows the gallery and the embedded schedule on a saved place', async () => {
    request.mockImplementation(
      async (path: string, init?: { method?: string }) => {
        if (path === '/resources/h1' && init?.method === 'DELETE') {
          return { images: [] };
        }
        if (path === '/resources/h1/files/img' && init?.method === 'DELETE') {
          return { images: [] };
        }
        if (path === '/resources/h1') {
          return blank({
            id: 'h1',
            resourceTypeId: 'place-type',
            name: 'Main hall',
            type: 'ordinary',
            address: 'Hlavná 1',
            timeZone: 'Europe/Bratislava',
            images: [
              {
                id: 'img',
                index: 0,
                kind: 'image',
                contentType: 'image/jpeg',
                url: '/files/resources/h1/img.jpg',
              },
            ],
          });
        }
        if (path === '/me') return { role: 'owner' };
        if (path === '/settings') return { timeZone: 'Europe/Bratislava' };
        if (path === '/settings/options')
          return { timeZones: ['Europe/Bratislava'] };
        if (String(path).startsWith('/resources?')) {
          return {
            items: [],
            meta: {
              currentPage: 1,
              perPage: 100,
              totalItems: 0,
              totalPages: 1,
            },
          };
        }
        if (String(path).startsWith('/schedule-slots')) return { items: [] };
        return {};
      },
    );
    render(<ResourceForm typeId="place-type" resourceId="h1" />);
    expect(await screen.findByDisplayValue('Main hall')).toBeTruthy();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove file?' }),
    );
    expect(
      screen.getByText(
        'This file will be removed. You can add it again at any time',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/resources/h1/files/img', {
        method: 'DELETE',
      });
    });
    await waitFor(() => {
      const slots = request.mock.calls
        .map((call) => String(call[0]))
        .filter((path) => path.startsWith('/schedule-slots'));
      expect(slots.some((path) => path.includes('resourceId=h1'))).toBe(true);
    });
  });

  it('shows the busy slot when a time zone change is refused', async () => {
    request.mockImplementation(
      async (path: string, init?: { method?: string }) => {
        if (init?.method === 'PATCH') {
          throw new ApiError(409, 'RESOURCE_BUSY', [], {
            resourceName: 'Anna',
            title: 'Yoga',
            start: '10:00',
            end: '11:00',
          });
        }
        if (path === '/resources/h1') {
          return blank({
            id: 'h1',
            resourceTypeId: 'place-type',
            name: 'Main hall',
            type: 'ordinary',
            address: 'Hlavná 1',
            timeZone: 'Europe/Bratislava',
          });
        }
        if (path === '/me') return { role: 'owner' };
        if (path === '/settings') return { timeZone: 'Europe/Bratislava' };
        if (path === '/settings/options')
          return { timeZones: ['Europe/Bratislava'] };
        if (String(path).startsWith('/resources?')) {
          return {
            items: [],
            meta: {
              currentPage: 1,
              perPage: 100,
              totalItems: 0,
              totalPages: 1,
            },
          };
        }
        if (String(path).startsWith('/schedule-slots')) return { items: [] };
        return {};
      },
    );
    render(<ResourceForm typeId="place-type" resourceId="h1" />);
    await screen.findByDisplayValue('Main hall');
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Anna is busy at this time: Yoga 10:00–11:00',
    );
  });
});
