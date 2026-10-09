// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ClassTypeForm } from './class-type-form';
import { notify } from '../../shared/ui/toaster';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({ request, upload: vi.fn(), readFile: vi.fn() }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

describe('Class type form', () => {
  afterEach(() => {
    cleanup();
    request.mockReset();
  });

  it('creates without a gallery and keeps an empty description', async () => {
    request.mockResolvedValue({ name: 'Yoga', description: null, images: [] });
    render(<ClassTypeForm />);
    expect(screen.queryByRole('button', { name: 'Add file' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Yoga' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('Class type added');
    });
    expect(request).toHaveBeenCalledWith('/class-types', {
      method: 'POST',
      body: { name: 'Yoga', description: null },
    });
  });
});
