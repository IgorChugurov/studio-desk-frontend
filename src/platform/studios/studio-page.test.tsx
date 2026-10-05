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
import { rememberListQuery } from './list-state';
import { StudioPage } from './studio-page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const request = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../api/api', () => ({ getApi: () => ({ request }) }));
vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const studio = {
  id: 's1',
  name: 'Yoga Space',
  subdomain: 'yoga-space',
  customDomain: null,
  owner: { email: 'owner@example.com' },
  status: 'deactivated',
  createdAt: '2026-10-03T10:00:00Z',
  updatedAt: '2026-10-03T10:00:00Z',
};

async function renderPage(id?: string) {
  await act(async () => {
    render(
      <CrumbsProvider>
        <StudioPage id={id} />
      </CrumbsProvider>,
    );
  });
}

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const press = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  request.mockReset();
  vi.mocked(notify.success).mockClear();
  vi.mocked(notify.error).mockClear();
  rememberListQuery('status=deactivated&page=2');
});

afterEach(cleanup);

describe('StudioPage: new', () => {
  it('creates the studio, shows the message and returns to the same list', async () => {
    request.mockResolvedValue(studio);
    await renderPage();
    type(/^Name/, 'Yoga Space');
    type(/^Owner e-mail/, 'owner@example.com');
    await press('Save');
    expect(request).toHaveBeenCalledWith('/studios', {
      method: 'POST',
      body: {
        name: 'Yoga Space',
        subdomain: 'yoga-space',
        customDomain: null,
        owner: { email: 'owner@example.com' },
      },
    });
    expect(notify.success).toHaveBeenCalledWith('Studio created');
    expect(router.push).toHaveBeenCalledWith('/?status=deactivated&page=2');
  });

  it('Back returns to the list the administrator left', async () => {
    await renderPage();
    await press('Back');
    expect(router.push).toHaveBeenCalledWith('/?status=deactivated&page=2');
  });
});

describe('StudioPage: edit', () => {
  it('loads the studio and fills the form', async () => {
    request.mockResolvedValue(studio);
    await renderPage('s1');
    expect(request).toHaveBeenCalledWith('/studios/s1');
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe(
      'Yoga Space',
    );
    expect(screen.getByText('Deactivated')).toBeTruthy();
  });

  it('sends only the changed fields and returns to the list', async () => {
    request.mockResolvedValueOnce(studio).mockResolvedValueOnce(studio);
    await renderPage('s1');
    type(/^Name/, 'New name');
    await press('Update');
    expect(request).toHaveBeenLastCalledWith('/studios/s1', {
      method: 'PATCH',
      body: { name: 'New name' },
    });
    expect(notify.success).toHaveBeenCalledWith('Studio updated');
    expect(router.push).toHaveBeenCalledWith('/?status=deactivated&page=2');
  });

  it('shows the toast and goes back to the list when the studio cannot be loaded', async () => {
    request.mockRejectedValue(new Error('404'));
    await renderPage('s1');
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
    expect(router.replace).toHaveBeenCalledWith('/?status=deactivated&page=2');
  });
});
