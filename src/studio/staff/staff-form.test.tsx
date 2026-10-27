// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ApiError } from '../api/api-error';
import { notify } from '../../shared/ui/toaster';
import { StaffForm } from './staff-form';

const { request, push } = vi.hoisted(() => ({
  request: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({
    status: 'signed-in',
    language: 'en',
    config: {
      catalogConfig: {
        resourceTypes: [
          {
            id: 'rt-trainer',
            sortOrder: 1,
            role: 'resource',
            labels: {
              en: { singular: 'Trainer', plural: 'Trainers' },
              sk: { singular: 'Tréner', plural: 'Tréneri' },
              uk: { singular: 'Тренер', plural: 'Тренери' },
            },
            person: true,
          },
        ],
      },
    },
  }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({ request }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

const anna = { id: 'anna', name: 'Anna' };
const boris = { id: 'boris', name: 'Boris' };

function lists(linked: { id: string; resourceId: string | null }[] = []) {
  request.mockImplementation((path: string) => {
    if (String(path).startsWith('/resources')) {
      return Promise.resolve({
        items: [anna, boris],
        meta: { totalPages: 1 },
      });
    }
    if (String(path).startsWith('/staff?')) {
      return Promise.resolve({
        items: linked.map((item) => ({
          id: item.id,
          email: `${item.id}@example.com`,
          role: item.resourceId ? 'specialist' : 'administrator',
          resourceId: item.resourceId,
          createdAt: '2026-10-16T10:00:00Z',
        })),
        meta: {
          currentPage: 1,
          perPage: 100,
          totalItems: linked.length,
          totalPages: 1,
        },
      });
    }
    return Promise.resolve({});
  });
}

describe('Staff form trainer link', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  afterEach(() => {
    cleanup();
    request.mockReset();
    push.mockReset();
  });

  it('adds an administrator without a trainer field', async () => {
    lists();
    render(<StaffForm />);
    expect(screen.queryByRole('combobox', { name: 'Trainer' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), {
      target: { value: 'olga@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/staff', {
        method: 'POST',
        body: { email: 'olga@example.com', role: 'administrator' },
      });
    });
  });

  it('refuses a trainer role until a free card is chosen', async () => {
    lists([{ id: 'busy', resourceId: 'boris' }]);
    render(<StaffForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Trainer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toBe('Select a specialist');
    expect(request).not.toHaveBeenCalledWith(
      '/staff',
      expect.objectContaining({ method: 'POST' }),
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Trainer' }));
    expect(screen.queryByRole('option', { name: 'Boris' })).toBeNull();
    fireEvent.click(await screen.findByRole('option', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/staff', {
        method: 'POST',
        body: {
          email: 'anna@example.com',
          role: 'specialist',
          resourceId: 'anna',
        },
      });
    });
  });

  it('keeps the current card, saves a new one, and drops the link when the role changes', async () => {
    lists([{ id: 'member', resourceId: 'anna' }]);
    request.mockImplementation((path: string, init?: { method?: string }) => {
      if (init?.method === 'PATCH') return Promise.resolve({});
      if (String(path) === '/staff/member') {
        return Promise.resolve({
          id: 'member',
          email: 'anna@example.com',
          role: 'specialist',
          resourceId: 'anna',
          createdAt: '2026-10-16T10:00:00Z',
        });
      }
      if (String(path).startsWith('/resources')) {
        return Promise.resolve({
          items: [anna, boris],
          meta: { totalPages: 1 },
        });
      }
      return Promise.resolve({
        items: [
          {
            id: 'member',
            email: 'anna@example.com',
            role: 'specialist',
            resourceId: 'anna',
            createdAt: '2026-10-16T10:00:00Z',
          },
        ],
        meta: { currentPage: 1, perPage: 100, totalItems: 1, totalPages: 1 },
      });
    });
    render(<StaffForm memberId="member" />);
    const update = await screen.findByRole('button', { name: 'Update' });
    expect((update as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(await screen.findByRole('combobox', { name: 'Trainer' }));
    expect(await screen.findByRole('option', { name: 'Anna' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'Boris' }));
    expect((update as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(update);
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/staff/member', {
        method: 'PATCH',
        body: { resourceId: 'boris' },
      });
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Accountant' }));
    expect(screen.queryByRole('combobox', { name: 'Trainer' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/staff/member', {
        method: 'PATCH',
        body: { role: 'accountant' },
      });
    });
  });

  it('shows the linked-card error at the trainer field', async () => {
    lists();
    request.mockImplementation((path: string, init?: { method?: string }) => {
      if (init?.method === 'POST') {
        return Promise.reject(new ApiError(409, 'SPECIALIST_ALREADY_LINKED'));
      }
      if (String(path).startsWith('/resources')) {
        return Promise.resolve({ items: [anna], meta: { totalPages: 1 } });
      }
      return Promise.resolve({
        items: [],
        meta: { currentPage: 1, perPage: 100, totalItems: 0, totalPages: 1 },
      });
    });
    render(<StaffForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'E-mail' }), {
      target: { value: 'anna@example.com' },
    });
    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Trainer' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Trainer' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This specialist is already linked to another staff member',
    );
    expect(notify.error).not.toHaveBeenCalled();
  });
});
