import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';

export interface BreadcrumbItem {
  label: string;
  /** Address of a level above the current page. */
  href?: string;
}

/**
 * Breadcrumbs as pills (Breadcrumbs line): the current page is the last item
 * and is a filled pill, the levels above it are outlined links.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const pill = cn(
    'inline-flex h-6 items-center rounded-[var(--radius-100)] px-[var(--space-300)]',
    'font-[family-name:var(--body-font-family)] font-[var(--body-font-weight-strong)]',
    'text-[length:var(--body-sizeM)] whitespace-nowrap',
  );

  return (
    <nav aria-label="Breadcrumbs" className={className}>
      <ol className="flex items-center gap-[var(--space-100)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li
              key={index}
              className="flex items-center gap-[var(--space-100)]"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  className="size-4 text-[var(--icons-gray-secondary)]"
                />
              )}
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    pill,
                    isCurrent
                      ? 'bg-[var(--background-primary-default)] text-[var(--text-primary-on-primary)]'
                      : 'border border-[var(--border-gray-default)] text-[var(--text-gray-default)]',
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    pill,
                    'border border-[var(--border-gray-default)] text-[var(--text-gray-default)] transition-colors hover:border-[var(--border-gray-secondary)]',
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
