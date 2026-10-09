// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { HallForm } from './hall-form';
import { notify } from '../../shared/ui/toaster';

const { push, request } = vi.hoisted(() => ({
  push: vi.fn(),
  request: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock('../api/session-provider', () => ({
  useSession: () => ({ status: 'signed-in', language: 'en' }),
}));

vi.mock('../api/api', () => ({
  getApi: () => ({
    request,
    upload: vi.fn(),
    readFile: vi.fn(async () => new Blob(['bytes'])),
  }),
}));

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

const hall = {
  id: 'h1',
  name: 'Main hall',
  address: 'Hlavná 1',
  videoLink: null,
  images: [
    {
      id: 'img',
      index: 0,
      kind: 'image' as const,
      contentType: 'image/jpeg',
      url: '/api/files/img',
    },
    {
      id: 'vid',
      index: 1,
      kind: 'video' as const,
      contentType: 'video/mp4',
      url: '/api/files/vid',
    },
  ],
  createdAt: '2026-10-08T18:00:00Z',
  updatedAt: '2026-10-08T18:00:00Z',
};

describe('Hall form', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => cleanup());

  it('creates without a gallery and keeps an empty video link', async () => {
    request.mockResolvedValue(hall);
    render(<HallForm />);
    expect(screen.queryByRole('button', { name: 'Add file' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Main hall' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /^Address/ }), {
      target: { value: 'Hlavná 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('Hall added');
    });
    expect(request).toHaveBeenCalledWith('/halls', {
      method: 'POST',
      body: {
        name: 'Main hall',
        address: 'Hlavná 1',
        description: null,
        videoLink: null,
      },
    });
    expect(push).toHaveBeenCalledWith('/catalogs');
  });

  it('shows the fixed texts for an empty name, an empty address, and a bad link', () => {
    request.mockClear();
    render(<HallForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Video link' }), {
      target: { value: 'https://example.com/clip' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a name')).toBeTruthy();
    expect(screen.getByText('Enter an address')).toBeTruthy();
    expect(screen.getByText('Enter a YouTube or Vimeo link')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('shows an image, a video, and removes a file only after confirmation', async () => {
    request.mockImplementation((path: string, init?: { method?: string }) => {
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ...hall, images: [hall.images[1]] });
      }
      return Promise.resolve(hall);
    });
    const { container } = render(<HallForm hallId="h1" />);
    expect(
      await screen.findByRole('button', { name: 'Add file' }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(container.querySelector('img')).toBeTruthy();
      expect(container.querySelector('video')).toBeTruthy();
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove file?' })[0]!,
    );
    expect(
      screen.getByText(
        'This file will be removed from the hall. You can add it again at any time',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/halls/h1/files/img', {
        method: 'DELETE',
      });
    });
    expect(notify.success).toHaveBeenCalledWith('File removed');
    expect(request).not.toHaveBeenCalledWith(
      '/halls/h1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('reorders files without saving the hall', async () => {
    request.mockResolvedValue(hall);
    const { container } = render(<HallForm hallId="h1" />);
    await screen.findByRole('button', { name: 'Add file' });
    const tiles = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(tiles[0]!);
    fireEvent.dragOver(tiles[1]!);
    fireEvent.drop(tiles[1]!);
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/halls/h1/files/order', {
        method: 'PUT',
        body: { fileIds: ['vid', 'img'] },
      });
    });
    expect(request).not.toHaveBeenCalledWith(
      '/halls/h1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
