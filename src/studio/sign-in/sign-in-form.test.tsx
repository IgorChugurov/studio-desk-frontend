// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ApiError } from '../api/api-error';
import { notify } from '../../shared/ui/toaster';
import { SignInForm, type SignInAuth } from './sign-in-form';

vi.mock('../../shared/ui/toaster', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

function auth(signIn = vi.fn().mockResolvedValue('signed-in')): SignInAuth {
  return {
    requestCode: vi
      .fn()
      .mockResolvedValue({ codeExpiresIn: 600, resendAvailableIn: 60 }),
    signIn,
  };
}

async function reachCode(api: SignInAuth) {
  render(<SignInForm auth={api} onSignedIn={() => undefined} />);
  fireEvent.change(screen.getByLabelText(/E-mail/), {
    target: { value: 'anna@example.com' },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
      'performance',
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('studio sign-in errors', () => {
  it('shows the invalid code text and clears the field', async () => {
    const api = auth(
      vi.fn().mockRejectedValue(new ApiError(400, 'INVALID_CODE')),
    );
    await reachCode(api);
    fireEvent.change(screen.getByLabelText(/^Code/), {
      target: { value: '123456' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getByText('Invalid or expired code')).toBeTruthy();
    expect((screen.getByLabelText(/^Code/) as HTMLInputElement).value).toBe('');
  });

  it('shows the expired code text', async () => {
    const api = auth(
      vi.fn().mockRejectedValue(new ApiError(400, 'CODE_EXPIRED')),
    );
    await reachCode(api);
    fireEvent.change(screen.getByLabelText(/^Code/), {
      target: { value: '123456' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(
      screen.getByText('The code has expired. Request a new one'),
    ).toBeTruthy();
  });

  it('shows the too-many-attempts text', async () => {
    const api = auth(
      vi.fn().mockRejectedValue(new ApiError(429, 'TOO_MANY_ATTEMPTS')),
    );
    await reachCode(api);
    fireEvent.change(screen.getByLabelText(/^Code/), {
      target: { value: '123456' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getByText('Too many attempts. Try again later')).toBeTruthy();
  });

  it('shows the generic text for any other failure', async () => {
    const api = auth(
      vi.fn().mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR')),
    );
    await reachCode(api);
    fireEvent.change(screen.getByLabelText(/^Code/), {
      target: { value: '123456' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
  });
});
