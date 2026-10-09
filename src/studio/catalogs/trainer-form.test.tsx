// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { TrainerForm } from './trainer-form';
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

const trainer = {
  name: 'Anna',
  description: null,
  instagram: null,
  tiktok: null,
  images: [
    {
      id: 'vid',
      index: 0,
      kind: 'video' as const,
      contentType: 'video/mp4',
      url: '/files/trainers/t1/vid.mp4',
    },
  ],
};

describe('Trainer form', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    request.mockReset();
  });

  it('creates without a gallery and keeps empty optional fields', async () => {
    request.mockResolvedValue(trainer);
    render(<TrainerForm />);
    expect(screen.queryByRole('button', { name: 'Add file' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Anna' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(notify.success).toHaveBeenCalledWith('Trainer added');
    });
    expect(request).toHaveBeenCalledWith('/trainers', {
      method: 'POST',
      body: {
        name: 'Anna',
        description: null,
        instagram: null,
        tiktok: null,
      },
    });
  });

  it('shows the fixed link errors and does not save', () => {
    render(<TrainerForm />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Instagram' }), {
      target: { value: 'https://example.com/anna' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'TikTok' }), {
      target: { value: 'https://tiktok.com/anna' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a name')).toBeTruthy();
    expect(screen.getByText('Enter an Instagram link')).toBeTruthy();
    expect(screen.getByText('Enter a TikTok link')).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('shows a video on edit and reorders without saving the trainer', async () => {
    request.mockResolvedValue({
      ...trainer,
      images: [
        trainer.images[0],
        {
          id: 'img',
          index: 1,
          kind: 'image',
          contentType: 'image/jpeg',
          url: '/files/trainers/t1/img.jpg',
        },
      ],
    });
    const { container } = render(<TrainerForm trainerId="t1" />);
    await waitFor(() => {
      expect(container.querySelector('video')).toBeTruthy();
    });
    const tiles = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(tiles[0]!);
    fireEvent.drop(tiles[1]!);
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/trainers/t1/files/order', {
        method: 'PUT',
        body: { fileIds: ['img', 'vid'] },
      });
    });
    expect(request).not.toHaveBeenCalledWith(
      '/trainers/t1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
