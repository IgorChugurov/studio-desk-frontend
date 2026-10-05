// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { notify } from '../../shared/ui/toaster';
import { CrumbsProvider } from '../shell/crumbs';
import { rememberListQuery } from './list-state';
import { StudioPage } from './studio-page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const request = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../api/api', () => ({ getApi: () => ({ request }) }));
vi.mock('../../shared/config/public-env', () => ({
  loadPublicEnv: () => ({ studioAdminUrl: 'https://app.test/impersonate' }),
}));
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

describe('StudioPage: actions', () => {
  const deactivated = { ...studio, status: 'deactivated' };
  const active = { ...studio, status: 'active' };

  it('shows Deactivate for an active studio and asks to confirm', async () => {
    request.mockResolvedValue(active);
    await renderPage('s1');
    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
    await press('Deactivate');
    expect(screen.getByText('Deactivate studio?')).toBeTruthy();
    expect(
      screen.getByText(
        /Studio "Yoga Space" will be closed: its owner and staff won't be able to sign in and its public site will be hidden\. Data is kept\. You can activate it again at any time/,
      ),
    ).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('Cancel closes the window without a request', async () => {
    request.mockResolvedValue(active);
    await renderPage('s1');
    await press('Deactivate');
    await press('Cancel');
    expect(screen.queryByText('Deactivate studio?')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('deactivates after the confirmation and stays on the page', async () => {
    request.mockResolvedValueOnce(active).mockResolvedValueOnce(deactivated);
    await renderPage('s1');
    await press('Deactivate');
    const confirm = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Deactivate',
    });
    await act(async () => {
      fireEvent.click(confirm);
    });
    expect(request).toHaveBeenLastCalledWith('/studios/s1/deactivate', {
      method: 'POST',
    });
    expect(notify.success).toHaveBeenCalledWith('Studio deactivated');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByText('Deactivate studio?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeTruthy();
    expect(screen.getByText('Deactivated')).toBeTruthy();
  });

  it('activates at once, without a window', async () => {
    request.mockResolvedValueOnce(deactivated).mockResolvedValueOnce(active);
    await renderPage('s1');
    await press('Activate');
    expect(request).toHaveBeenLastCalledWith('/studios/s1/activate', {
      method: 'POST',
    });
    expect(notify.success).toHaveBeenCalledWith('Studio activated');
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeTruthy();
  });

  it('shows the generic toast when an action fails', async () => {
    request
      .mockResolvedValueOnce(deactivated)
      .mockRejectedValueOnce(new Error('x'));
    await renderPage('s1');
    await press('Activate');
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
    expect(screen.getByRole('button', { name: 'Activate' })).toBeTruthy();
  });

  describe('Log in as studio', () => {
    const tab = { location: { href: '' }, close: vi.fn(), opener: {} };
    let open: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tab.location.href = '';
      tab.close.mockClear();
      open = vi.fn().mockReturnValue(tab);
      vi.stubGlobal('open', open);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('opens the tab at once, then sends it to the studio admin with the code after #', async () => {
      let answer: (value: unknown) => void = () => {};
      request.mockResolvedValueOnce(studio).mockReturnValueOnce(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
      await renderPage('s1');
      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Log in as studio' }),
        );
      });
      // The tab is opened before the API has answered.
      expect(open).toHaveBeenCalledWith('', '_blank');
      expect(tab.opener).toBeNull();
      expect(tab.location.href).toBe('');
      expect(request).toHaveBeenLastCalledWith('/studios/s1/impersonate', {
        method: 'POST',
      });
      await act(async () => {
        answer({ code: 'k3J/x', expiresIn: 60 });
      });
      expect(tab.location.href).toBe(
        'https://app.test/impersonate#code=k3J%2Fx',
      );
      expect(tab.location.href.split('#')[0]).not.toContain('k3J');
    });

    it('closes the tab and shows the toast when the API fails', async () => {
      request
        .mockResolvedValueOnce(studio)
        .mockRejectedValueOnce(new Error('x'));
      await renderPage('s1');
      await press('Log in as studio');
      expect(tab.close).toHaveBeenCalled();
      expect(notify.error).toHaveBeenCalledWith(
        'Something went wrong. Try again',
      );
    });

    it('does not call the API when the browser blocks the new tab', async () => {
      open.mockReturnValue(null);
      request.mockResolvedValueOnce(studio);
      await renderPage('s1');
      await press('Log in as studio');
      expect(request).toHaveBeenCalledTimes(1);
      expect(notify.error).toHaveBeenCalledWith(
        'Something went wrong. Try again',
      );
    });
  });
});
