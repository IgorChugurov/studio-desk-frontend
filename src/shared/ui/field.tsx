import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A form field: label (with a star for required fields), the control, and one
 * line under it — an error or a hint. The error makes the field taller, so
 * the next elements move down and nothing overlaps.
 */
export function Field({
  id,
  label,
  required,
  disabled,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  hint?: string | null;
  children: ReactNode;
}) {
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-[var(--space-100)]">
      <label
        htmlFor={id}
        className={cn(
          'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)]',
          disabled
            ? 'text-[var(--text-gray-default-disabled)]'
            : 'text-[var(--text-gray-secondary)]',
        )}
      >
        {label}
        {required && (
          <span
            aria-hidden
            className={cn(
              'ml-[var(--space-050)]',
              disabled
                ? 'text-[var(--text-error-disabled)]'
                : 'text-[var(--text-error-default)]',
            )}
          >
            *
          </span>
        )}
      </label>
      {children}
      {message && (
        <p
          id={`${id}-message`}
          role={error ? 'alert' : undefined}
          className={cn(
            'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)]',
            error
              ? 'text-[var(--text-error-default)]'
              : disabled
                ? 'text-[var(--text-gray-default-disabled)]'
                : 'text-[var(--text-gray-secondary)]',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
