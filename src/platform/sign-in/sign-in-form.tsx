'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Input } from '../../shared/ui/input';
import { Notice } from '../../shared/ui/notice';
import { notify } from '../../shared/ui/toaster';
import { ApiError } from '../api/api-error';
import type { CodeResponse } from '../api/auth-types';
import { formatClock, TEXTS } from './texts';
import { useCountdown } from './use-countdown';

export interface SignInAuth {
  requestCode(email: string): Promise<CodeResponse>;
  signIn(email: string, code: string): Promise<void>;
}

type Pending = 'send' | 'sign-in' | 'resend' | null;

const emailSchema = z.email();
const CODE_LENGTH = 6;

/**
 * One screen, two states: the e-mail first, then the code from the e-mail.
 * After a correct code the session starts and the page moves on.
 */
export function SignInForm({
  auth,
  sessionExpired = false,
}: {
  auth: SignInAuth;
  /** Show the "Your session has expired" notice (state 1 only). */
  sessionExpired?: boolean;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLock, setCodeLock] = useState<'expired' | 'too-many' | null>(null);
  const [codeIssued, setCodeIssued] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const expiry = useCountdown();
  const resend = useCountdown();
  const codeInput = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const expired =
    codeLock === 'expired' || (codeIssued && expiry.remaining === 0);
  const codeDisabled = expired || codeLock === 'too-many';

  function codeIssuedWith(response: CodeResponse) {
    expiry.start(response.codeExpiresIn);
    resend.start(response.resendAvailableIn);
    setCodeIssued(true);
    setCodeLock(null);
    setCodeError(null);
    setCode('');
  }

  function showGenericError(error: unknown) {
    if (error instanceof ApiError && error.code === 'RESEND_TOO_EARLY') {
      notify.error(TEXTS.resendTooEarly);
    } else {
      notify.error(TEXTS.somethingWentWrong);
    }
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!emailSchema.safeParse(email.trim()).success) {
      setEmailError(TEXTS.invalidEmail);
      return;
    }
    setPending('send');
    try {
      codeIssuedWith(await auth.requestCode(email.trim()));
      setStep('code');
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === 'VALIDATION_ERROR' &&
        error.field === 'email'
      ) {
        setEmailError(TEXTS.invalidEmail);
      } else {
        showGenericError(error);
      }
    } finally {
      setPending(null);
    }
  }

  async function resendCode() {
    if (pending) return;
    setPending('resend');
    try {
      codeIssuedWith(await auth.requestCode(email.trim()));
      notify.success(TEXTS.newCodeSent);
    } catch (error) {
      showGenericError(error);
    } finally {
      setPending(null);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    if (pending || codeDisabled || code.length !== CODE_LENGTH) return;
    setPending('sign-in');
    try {
      await auth.signIn(email.trim(), code);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_CODE') {
        setCode('');
        setCodeError(TEXTS.invalidCode);
        codeInput.current?.focus();
      } else if (error instanceof ApiError && error.code === 'CODE_EXPIRED') {
        setCodeLock('expired');
      } else if (
        error instanceof ApiError &&
        error.code === 'TOO_MANY_ATTEMPTS'
      ) {
        setCodeLock('too-many');
      } else {
        showGenericError(error);
      }
    } finally {
      setPending(null);
    }
  }

  function goBack() {
    setStep('email');
    setCode('');
    setCodeError(null);
    setCodeLock(null);
    setCodeIssued(false);
    expiry.stop();
    resend.stop();
  }

  const codeMessage = codeError
    ? { error: codeError }
    : codeLock === 'too-many'
      ? { hint: TEXTS.tooManyAttempts }
      : expired
        ? { hint: TEXTS.codeExpired }
        : { hint: `Code expires in ${formatClock(expiry.remaining)}` };

  return (
    <form
      noValidate
      onSubmit={step === 'email' ? sendCode : submitCode}
      className="flex w-full max-w-[420px] flex-col gap-[var(--space-400)] rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)] p-[var(--space-600)] shadow-[0px_8px_24px_0px_rgba(25,25,25,0.12)] sm:p-[var(--space-800)]"
    >
      <h1 className="font-[family-name:var(--heading-font-family)] text-[length:var(--body-sizeL)] font-[var(--heading-font-weight)]">
        {TEXTS.title}
      </h1>

      {step === 'email' && sessionExpired && (
        <Notice>{TEXTS.sessionExpired}</Notice>
      )}

      <Field
        id="email"
        label={TEXTS.emailLabel}
        required
        disabled={step === 'code'}
        error={emailError}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          disabled={step === 'code'}
          readOnly={pending === 'send'}
          data-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-message' : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
          }}
        />
      </Field>

      {step === 'email' ? (
        <Button
          type="submit"
          variant="cta"
          size="lg"
          className="w-full"
          loading={pending === 'send'}
        >
          {TEXTS.sendCode}
        </Button>
      ) : (
        <>
          <Button
            type="button"
            variant="text"
            size="md"
            className="w-full"
            onClick={goBack}
          >
            {TEXTS.back}
          </Button>

          <p className="font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-gray-secondary)]">
            {TEXTS.codeGuidance}
          </p>

          <Field
            id="code"
            label={TEXTS.codeLabel}
            required
            disabled={codeDisabled}
            {...codeMessage}
          >
            <Input
              id="code"
              ref={codeInput}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              placeholder="••••••"
              value={code}
              disabled={codeDisabled || pending === 'sign-in'}
              data-invalid={codeError ? true : undefined}
              aria-describedby="code-message"
              className="data-[invalid=true]:text-[var(--text-error-default)]"
              onChange={(event) => {
                setCode(
                  event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
                );
                setCodeError(null);
              }}
            />
          </Field>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            className="w-full"
            disabled={code.length !== CODE_LENGTH || codeDisabled}
            loading={pending === 'sign-in'}
          >
            {TEXTS.signIn}
          </Button>

          <Button
            type="button"
            variant="text"
            size="md"
            className="self-start"
            disabled={resend.remaining > 0}
            loading={pending === 'resend'}
            onClick={() => void resendCode()}
          >
            {resend.remaining > 0
              ? `${TEXTS.resendCode} in ${formatClock(resend.remaining)}`
              : TEXTS.resendCode}
          </Button>
        </>
      )}
    </form>
  );
}
