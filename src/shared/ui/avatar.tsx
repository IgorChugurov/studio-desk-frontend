import { cn } from '../lib/cn';

/**
 * Round avatar with one letter (Navigation / avatar). Written on kit tokens;
 * the letter is the first character of `name`. `onDark` is for the blue bar.
 */
export function Avatar({
  name,
  onDark = false,
  className,
}: {
  name: string;
  onDark?: boolean;
  className?: string;
}) {
  const letter = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-full)]',
        'font-[family-name:var(--body-font-family)] font-[var(--body-font-weight-strong)]',
        'text-[length:var(--body-sizeM)]',
        onDark
          ? 'border border-[var(--white-with-opacity-400)] bg-[var(--white-with-opacity-200)] text-[var(--text-primary-on-primary)]'
          : 'bg-[var(--background-primary-tertiary)] text-[var(--text-primary-default)]',
        className,
      )}
    >
      {letter}
    </span>
  );
}
