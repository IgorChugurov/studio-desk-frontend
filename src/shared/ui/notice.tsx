import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Informational plate inside a card (for example, "Your session has expired.
 * Sign in again"). Not in the kit; written on kit tokens after the sign-in frame.
 */
export function Notice({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-[var(--radius-100)] bg-[var(--background-info-default)] p-[var(--space-300)]',
        'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)]',
        'text-[var(--text-gray-default)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
