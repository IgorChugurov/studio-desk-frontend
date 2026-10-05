// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { notify } from '../../shared/ui/toaster';
import { CrumbsProvider } from '../shell/crumbs';
import { StudiosList } from './studios-list';
import { formatCreated } from './studios-table';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const location = vi.hoisted(() => ({ search: '' }));
const request = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(location.search),
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../api/api', () => ({ getApi: () => ({ request }) }));
vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const studio = {
  id: 's1',
  name: 'Northline Portraits',
  subdomain: 'northline',
  customDomain: null,
  owner: { email: 'maya@example.com' },
  status: 'active',
  createdAt: '2026-09-30T10:00:00Z',
};

function page(items: unknown[], meta: Record<string, number> = {}) {
  return {
    items,
    meta: {
      currentPage: 1,
      perPage: 15,
      totalItems: items.length,
      totalPages: 1,
      ...meta,
    },
  };
}

async function renderList() {
  await act(async () => {
    render(
      <CrumbsProvider>
        <StudiosList />
      </CrumbsProvider>,
    );
  });
}

beforeEach(() => {
  location.search = '';
  router.push.mockClear();
  router.replace.mockClear();
  request.mockReset();
  vi.mocked(notify.error).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StudiosList', () => {
  it('asks the API for active studios, page 1, 15 rows, and shows the rows', async () => {
    request.mockResolvedValue(page([studio]));
    await renderList();
    expect(request).toHaveBeenCalledWith(
      '/studios?status=active&currentPage=1&perPage=15',
    );
    expect(screen.getByText('Northline Portraits')).toBeTruthy();
    expect(screen.getByText('maya@example.com')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('takes search, status, page and perPage from the address', async () => {
    location.search = 'search=yoga&status=deactivated&page=2&perPage=30';
    request.mockResolvedValue(page([studio]));
    await renderList();
    expect(request).toHaveBeenCalledWith(
      '/studios?status=deactivated&currentPage=2&perPage=30&search=yoga',
    );
  });

  it('shows the empty state and Reset goes to the default list', async () => {
    location.search = 'search=zzz';
    request.mockResolvedValue(page([]));
    await renderList();
    expect(screen.getByText('No studios found')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset search and filters' }),
    );
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('shows the failure text and a toast when the list cannot be loaded', async () => {
    request.mockRejectedValue(new Error('boom'));
    await renderList();
    expect(screen.getByText('Something went wrong. Try again')).toBeTruthy();
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
  });

  it('opens a studio by a click on its row', async () => {
    request.mockResolvedValue(page([studio]));
    await renderList();
    fireEvent.click(screen.getByText('maya@example.com'));
    expect(router.push).toHaveBeenCalledWith('/studios/s1');
  });

  it('Create studio leads to the new studio page', async () => {
    request.mockResolvedValue(page([studio]));
    await renderList();
    expect(
      screen.getByRole('link', { name: 'Create studio' }).getAttribute('href'),
    ).toBe('/studios/new');
  });

  it('goes to the next page and keeps it in the address', async () => {
    request.mockResolvedValue(
      page([studio], { totalItems: 40, totalPages: 3 }),
    );
    await renderList();
    expect(screen.getByText('1-15 of 40')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(router.push).toHaveBeenCalledWith('/?page=2');
  });

  it('sends the search after a pause and returns to page 1', async () => {
    request.mockResolvedValue(page([studio]));
    await renderList();
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Search studios'), {
      target: { value: 'yoga' },
    });
    expect(router.replace).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(router.replace).toHaveBeenCalledWith('/?search=yoga');
  });
});

describe('formatCreated', () => {
  it('writes the date as day, month name, year', () => {
    expect(formatCreated('2026-09-30T12:00:00Z')).toBe('30 Sep 2026');
    expect(formatCreated('not a date')).toBe('');
  });
});
