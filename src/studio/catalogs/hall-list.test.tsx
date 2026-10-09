// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HallList } from './hall-list';

const query = vi.hoisted(() => ({ search: '' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(query.search),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({
    request: () =>
      Promise.resolve({
        items: [],
        meta: { currentPage: 1, perPage: 15, totalItems: 0, totalPages: 1 },
      }),
  }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

describe('Halls list', () => {
  beforeEach(() => {
    query.search = '';
  });

  afterEach(() => cleanup());

  it('has search and Add hall, and no Back', async () => {
    render(<HallList />);
    expect(
      screen.getByRole('link', { name: 'Halls' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy();
    expect(
      screen.getAllByRole('link', { name: 'Add hall' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(await screen.findByText('No halls yet')).toBeTruthy();
    expect(screen.queryByText('No halls found')).toBeNull();
  });

  it('shows the empty search texts', async () => {
    query.search = 'search=missing';
    render(<HallList />);
    expect(await screen.findByText('No halls found')).toBeTruthy();
    expect(
      screen.getByText(
        "Change the search term to find what you're looking for.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset search' })).toBeTruthy();
    expect(screen.queryByText('No halls yet')).toBeNull();
  });
});
