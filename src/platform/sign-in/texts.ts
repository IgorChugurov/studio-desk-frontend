/**
 * Fixed texts of the sign-in screen. The text for an API error is chosen by
 * its `code` (table "error codes and screen texts" of `api-contract.md`).
 */
export const TEXTS = {
  title: 'Sign in',
  emailLabel: 'E-mail',
  codeLabel: 'Code',
  sendCode: 'Send code',
  signIn: 'Sign in',
  back: 'Back',
  resendCode: 'Resend code',
  codeGuidance: "If this e-mail has access, we've sent a code",
  sessionExpired: 'Your session has expired. Sign in again',
  invalidEmail: 'Enter a valid e-mail address',
  invalidCode: 'Invalid or expired code',
  codeExpired: 'The code has expired. Request a new one',
  tooManyAttempts: 'Too many attempts. Try again later',
  resendTooEarly: 'Please wait before requesting a new code',
  newCodeSent: 'A new code has been sent',
  somethingWentWrong: 'Something went wrong. Try again',
} as const;

/** `mm:ss` for the countdowns. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
