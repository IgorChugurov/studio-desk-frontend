// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StaffList } from './staff-list';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({ request }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

describe('Staff list trainer column', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
  });

  it('shows the linked trainer name and leaves other roles empty', async () => {
    request.mockImplementation((path: string) => {
      if (String(path).startsWith('/trainers')) {
        return Promise.resolve({
          items: [{ id: 'anna', name: 'Anna' }],
          meta: { totalPages: 1 },
        });
      }
      return Promise.resolve({
        items: [
          {
            id: 'one',
            email: 'anna@example.com',
            role: 'trainer',
            trainerId: 'anna',
            createdAt: '2026-10-16T10:00:00Z',
          },
          {
            id: 'two',
            email: 'olga@example.com',
            role: 'administrator',
            trainerId: null,
            createdAt: '2026-10-16T11:00:00Z',
          },
        ],
        meta: { currentPage: 1, perPage: 15, totalItems: 2, totalPages: 1 },
      });
    });
    render(<StaffList />);
    expect(await screen.findByRole('cell', { name: 'Anna' })).toBeTruthy();
    const rows = screen.getAllByRole('row');
    const olga = rows.find((row) =>
      row.textContent?.includes('olga@example.com'),
    );
    expect(olga?.textContent).toContain('Administrator');
    expect(olga?.textContent).not.toContain('Anna');
  });
});
