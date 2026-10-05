// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
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

interface MockAuth {
  requestCode: Mock<SignInAuth['requestCode']>;
  signIn: Mock<SignInAuth['signIn']>;
}

function makeAuth(overrides: Partial<MockAuth> = {}): MockAuth {
  return {
    requestCode: vi
      .fn()
      .mockResolvedValue({ codeExpiresIn: 600, resendAvailableIn: 60 }),
    signIn: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const button = (name: string) => screen.getByRole('button', { name });
const emailInput = () => screen.getByLabelText(/E-mail/);
const codeInput = () => screen.getByLabelText(/^Code/);

async function goToCodeStep(auth: MockAuth) {
  render(<SignInForm auth={auth} />);
  fireEvent.change(emailInput(), { target: { value: 'admin@example.com' } });
  await act(async () => {
    fireEvent.click(button('Send code'));
  });
}

function typeCode(value: string) {
  fireEvent.change(codeInput(), { target: { value } });
}

async function submitCode(value = '123456') {
  typeCode(value);
  await act(async () => {
    fireEvent.click(button('Sign in'));
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
  vi.mocked(notify.success).mockClear();
  vi.mocked(notify.error).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SignInForm: e-mail step', () => {
  it('shows the session-expired notice', () => {
    render(<SignInForm auth={makeAuth()} sessionExpired />);
    expect(
      screen.getByText('Your session has expired. Sign in again'),
    ).toBeTruthy();
  });

  it('does not call the API for an invalid e-mail and shows the text', async () => {
    const auth = makeAuth();
    render(<SignInForm auth={auth} />);
    fireEvent.change(emailInput(), { target: { value: 'not-an-email' } });
    await act(async () => {
      fireEvent.click(button('Send code'));
    });
    expect(screen.getByText('Enter a valid e-mail address')).toBeTruthy();
    expect(auth.requestCode).not.toHaveBeenCalled();
  });

  it('shows the e-mail text when the server rejects the e-mail field', async () => {
    const auth = makeAuth({
      requestCode: vi
        .fn()
        .mockRejectedValue(
          new ApiError(400, 'VALIDATION_ERROR', [
            { code: 'INVALID_EMAIL', field: 'email' },
          ]),
        ),
    });
    render(<SignInForm auth={auth} />);
    fireEvent.change(emailInput(), { target: { value: 'a@b.co' } });
    await act(async () => {
      fireEvent.click(button('Send code'));
    });
    expect(screen.getByText('Enter a valid e-mail address')).toBeTruthy();
  });

  it('shows a toast when the code cannot be requested', async () => {
    const auth = makeAuth({
      requestCode: vi
        .fn()
        .mockRejectedValue(new ApiError(429, 'RESEND_TOO_EARLY')),
    });
    render(<SignInForm auth={auth} />);
    fireEvent.change(emailInput(), { target: { value: 'a@b.co' } });
    await act(async () => {
      fireEvent.click(button('Send code'));
    });
    expect(notify.error).toHaveBeenCalledWith(
      'Please wait before requesting a new code',
    );
  });

  it('shows the generic text for any other failure', async () => {
    const auth = makeAuth({
      requestCode: vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK_ERROR')),
    });
    render(<SignInForm auth={auth} />);
    fireEvent.change(emailInput(), { target: { value: 'a@b.co' } });
    await act(async () => {
      fireEvent.click(button('Send code'));
    });
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
  });
});

describe('SignInForm: code step', () => {
  it('moves to the code step with the countdowns from the server', async () => {
    const auth = makeAuth();
    await goToCodeStep(auth);
    expect(auth.requestCode).toHaveBeenCalledWith('admin@example.com');
    expect((emailInput() as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Code expires in 10:00')).toBeTruthy();
    expect(button('Resend code in 01:00')).toBeTruthy();
  });

  it('keeps Sign in disabled until there are 6 digits and drops non-digits', async () => {
    await goToCodeStep(makeAuth());
    const signIn = button('Sign in') as HTMLButtonElement;
    expect(signIn.disabled).toBe(true);
    typeCode('12a34');
    expect((codeInput() as HTMLInputElement).value).toBe('1234');
    expect(signIn.disabled).toBe(true);
    typeCode('123456');
    expect(signIn.disabled).toBe(false);
  });

  it('counts down and enables Resend after the server time', async () => {
    await goToCodeStep(makeAuth());
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText('Code expires in 09:30')).toBeTruthy();
    expect(button('Resend code in 00:30')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect((button('Resend code') as HTMLButtonElement).disabled).toBe(false);
  });

  it('locks the field when the code time runs out', async () => {
    await goToCodeStep(makeAuth());
    await act(async () => {
      vi.advanceTimersByTime(600_000);
    });
    expect(
      screen.getByText('The code has expired. Request a new one'),
    ).toBeTruthy();
    expect((codeInput() as HTMLInputElement).disabled).toBe(true);
  });

  it('sends a new code and shows the toast', async () => {
    const auth = makeAuth();
    await goToCodeStep(auth);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await act(async () => {
      fireEvent.click(button('Resend code'));
    });
    expect(auth.requestCode).toHaveBeenCalledTimes(2);
    expect(notify.success).toHaveBeenCalledWith('A new code has been sent');
    expect(button('Resend code in 01:00')).toBeTruthy();
  });

  it('Back returns to the e-mail step', async () => {
    await goToCodeStep(makeAuth());
    typeCode('123');
    fireEvent.click(button('Back'));
    expect((emailInput() as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByLabelText(/^Code/)).toBeNull();
    expect(button('Send code')).toBeTruthy();
  });
});

describe('SignInForm: sign-in errors', () => {
  it('signs in with the e-mail and the code', async () => {
    const auth = makeAuth();
    await goToCodeStep(auth);
    await submitCode('654321');
    expect(auth.signIn).toHaveBeenCalledWith('admin@example.com', '654321');
  });

  it('INVALID_CODE: clears the code and shows the red text', async () => {
    const auth = makeAuth({
      signIn: vi.fn().mockRejectedValue(new ApiError(400, 'INVALID_CODE')),
    });
    await goToCodeStep(auth);
    await submitCode();
    expect(screen.getByText('Invalid or expired code')).toBeTruthy();
    expect((codeInput() as HTMLInputElement).value).toBe('');
    expect((codeInput() as HTMLInputElement).disabled).toBe(false);
  });

  it('CODE_EXPIRED: locks the field with the gray text', async () => {
    const auth = makeAuth({
      signIn: vi.fn().mockRejectedValue(new ApiError(400, 'CODE_EXPIRED')),
    });
    await goToCodeStep(auth);
    await submitCode();
    expect(
      screen.getByText('The code has expired. Request a new one'),
    ).toBeTruthy();
    expect((codeInput() as HTMLInputElement).disabled).toBe(true);
  });

  it('TOO_MANY_ATTEMPTS: locks the field with the gray text', async () => {
    const auth = makeAuth({
      signIn: vi.fn().mockRejectedValue(new ApiError(429, 'TOO_MANY_ATTEMPTS')),
    });
    await goToCodeStep(auth);
    await submitCode();
    expect(screen.getByText('Too many attempts. Try again later')).toBeTruthy();
    expect((codeInput() as HTMLInputElement).disabled).toBe(true);
  });

  it('any other error: generic toast, field stays open', async () => {
    const auth = makeAuth({
      signIn: vi.fn().mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR')),
    });
    await goToCodeStep(auth);
    await submitCode();
    expect(notify.error).toHaveBeenCalledWith(
      'Something went wrong. Try again',
    );
    expect((codeInput() as HTMLInputElement).disabled).toBe(false);
  });
});
