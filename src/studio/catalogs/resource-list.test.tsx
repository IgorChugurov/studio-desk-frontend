// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResourceList } from './resource-list';

const query = vi.hoisted(() => ({ search: '', empty: false }));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(query.search),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    language: 'en',
    config: {
      catalogConfig: {
        resourceTypes: [
          {
            id: 'place-type',
            sortOrder: 0,
            role: 'place',
            labels: {
              en: { singular: 'hall', plural: 'halls' },
              sk: { singular: 'hall', plural: 'halls' },
              uk: { singular: 'hall', plural: 'halls' },
            },
            geography: true,
            duration: false,
            showcase: true,
            person: false,
            skills: false,
            required: true,
            multiple: false,
            conflictMode: 'strict',
          },
          {
            id: 'offering-type',
            sortOrder: 1,
            role: 'offering',
            labels: {
              en: { singular: 'class type', plural: 'class types' },
              sk: { singular: 'class type', plural: 'class types' },
              uk: { singular: 'class type', plural: 'class types' },
            },
            geography: false,
            duration: true,
            showcase: false,
            person: false,
            skills: false,
            required: true,
            multiple: false,
            conflictMode: 'none',
          },
        ],
      },
      scheduleConfig: {
        audienceEnabled: false,
        formatEnabled: false,
        statuses: ['planned', 'cancelled'],
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

describe('Resource list', () => {
  beforeEach(() => {
    query.search = '';
    query.empty = false;
    request.mockReset();
    request.mockImplementation(async (path: string) => {
      if (String(path).includes('offering-type')) {
        return {
          items: [
            {
              id: 'yoga',
              resourceTypeId: 'offering-type',
              name: 'Yoga',
              type: null,
              address: null,
              timeZone: null,
              defaultDuration: 60,
              description: null,
              videoLink: null,
              instagram: null,
              tiktok: null,
              relatedResourceIds: [],
              images: [],
              createdAt: '2026-10-01T00:00:00Z',
              updatedAt: '2026-10-01T00:00:00Z',
            },
          ],
          meta: { currentPage: 1, perPage: 15, totalItems: 1, totalPages: 1 },
        };
      }
      if (query.empty) {
        return {
          items: [],
          meta: { currentPage: 1, perPage: 15, totalItems: 0, totalPages: 1 },
        };
      }
      return {
        items: [
          {
            id: 'h1',
            resourceTypeId: 'place-type',
            name: 'Main hall',
            type: 'ordinary',
            address: 'Hlavná 1',
            timeZone: 'Europe/Bratislava',
            defaultDuration: null,
            description: null,
            videoLink: null,
            instagram: null,
            tiktok: null,
            relatedResourceIds: [],
            images: [],
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-01T00:00:00Z',
          },
        ],
        meta: { currentPage: 1, perPage: 15, totalItems: 1, totalPages: 1 },
      };
    });
  });

  afterEach(() => cleanup());

  it('builds tabs from resource types and shows the place columns', async () => {
    render(<ResourceList />);
    expect(
      screen.getByRole('link', { name: 'halls' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.getByRole('link', { name: 'class types' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
    expect(
      screen.getAllByRole('link', { name: 'Add hall' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(await screen.findByText('Main hall')).toBeTruthy();
    expect(screen.getByText('Hlavná 1')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Address' })).toBeTruthy();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('resourceTypeId=place-type'),
    );
    expect(String(request.mock.calls[0]?.[0])).not.toContain('/halls');
  });

  it('shows the empty search texts', async () => {
    query.empty = true;
    query.search = 'search=missing';
    render(<ResourceList />);
    expect(await screen.findByText('No halls found')).toBeTruthy();
    expect(
      screen.getByText(
        "Change the search term to find what you're looking for.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset search' })).toBeTruthy();
  });

  it('shows default duration for an offering type', async () => {
    render(<ResourceList typeId="offering-type" />);
    expect(await screen.findByText('Yoga')).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: 'Default duration' }),
    ).toBeTruthy();
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Address' })).toBeNull();
  });
});
