import Link from 'next/link';
import { cn } from '../lib/cn';

export interface BreadcrumbItem {
  label: string;
  /** Address of a level above the current page. */
  href?: string;
  /** Hide this level on a narrow screen (when the line does not fit). */
  hideOnMobile?: boolean;
}

/**
 * Breadcrumbs line for the blue bar: levels above the current page are
 * outlined pills, the last item is the current page and is a filled pill.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const pill = cn(
    'inline-flex h-6 min-w-0 items-center rounded-[var(--radius-100)] px-[var(--space-200)]',
    'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)]',
  );

  return (
    <nav aria-label="Breadcrumbs" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-[var(--space-200)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li
              key={index}
              className={cn(
                'items-center gap-[var(--space-200)]',
                isCurrent ? 'flex min-w-0' : 'flex shrink-0',
                item.hideOnMobile && 'hidden sm:flex',
              )}
            >
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'text-[var(--white-with-opacity-700)]',
                    items[index - 1]?.hideOnMobile && 'hidden sm:inline',
                  )}
                >
                  /
                </span>
              )}
              {isCurrent ? (
                <span
                  aria-current="page"
                  className={cn(
                    pill,
                    'bg-[var(--background-primary-tertiary)] text-[var(--text-primary-default)]',
                  )}
                >
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                <Link
                  href={item.href ?? '/'}
                  className={cn(
                    pill,
                    'border border-[var(--white-with-opacity-400)] text-[var(--text-primary-on-primary)] transition-colors hover:bg-[var(--white-with-opacity-200)]',
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
