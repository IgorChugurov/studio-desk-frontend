import { cn } from '../../shared/lib/cn';
import type { StudioStatus } from './studio-types';

/** Studio state as a small tag: green "Active", gray "Deactivated". */
export function StatusTag({ status }: { status: StudioStatus }) {
  const active = status === 'active';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-[var(--space-100)] rounded-full border px-[var(--space-200)]',
        'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)]',
        active
          ? 'border-[var(--border-success-default)] text-[var(--text-success-default)]'
          : 'border-[var(--border-gray-default)] text-[var(--text-gray-secondary)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          active
            ? 'bg-[var(--icons-success-default)]'
            : 'bg-[var(--icons-gray-secondary)]',
        )}
      />
      {active ? 'Active' : 'Deactivated'}
    </span>
  );
}
