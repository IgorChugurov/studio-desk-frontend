'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { cn } from '../lib/cn';

type ToastVariant = 'success' | 'error';

const AUTO_CLOSE_MS = 5000;

function ToastPlate({
  variant,
  message,
  onClose,
}: {
  variant: ToastVariant;
  message: string;
  onClose: () => void;
}) {
  const isError = variant === 'error';
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn(
        'flex w-[350px] max-w-[calc(100vw-40px)] items-center gap-[var(--space-200)]',
        'rounded-[var(--radius-200)] border px-[var(--space-300)] py-[var(--space-200)]',
        'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)]',
        isError
          ? 'border-[var(--border-error-default)] bg-[var(--background-error-secondary)] text-[var(--text-error-default)]'
          : 'border-[var(--green-200)] bg-[var(--background-success-default)] text-[var(--text-gray-default)]',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'size-4 shrink-0',
          isError
            ? 'text-[var(--icons-error-default)]'
            : 'text-[var(--icons-success-default)]',
        )}
      />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          'shrink-0 cursor-pointer',
          isError
            ? 'text-[var(--icons-error-default)]'
            : 'text-[var(--icons-success-default)]',
        )}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}

function show(variant: ToastVariant, message: string) {
  toast.custom(
    (id) => (
      <ToastPlate
        variant={variant}
        message={message}
        onClose={() => toast.dismiss(id)}
      />
    ),
    { duration: AUTO_CLOSE_MS },
  );
}

/** Pop-up messages at the bottom center of the screen. */
export const notify = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
};

/** Mount once in the root layout. */
export function Toaster() {
  return <SonnerToaster position="bottom-center" />;
}
