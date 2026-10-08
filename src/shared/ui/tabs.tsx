import Link from 'next/link';
import { cn } from '../lib/cn';

/**
 * Section tab row, styled from starter-kit FigmaTab (underline, active border).
 * The row scrolls sideways when the tabs do not fit. Each tab is a link,
 * because a section is its own page.
 */
export function Tabs({
  items,
  current,
}: {
  items: { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav aria-label="Sections" className="overflow-x-auto">
      <div
        className={cn(
          'flex w-max min-w-full items-start justify-start gap-[var(--space-400)]',
          'border-b-2 border-solid border-[var(--border-gray-default)]',
          'px-[var(--space-100)]',
        )}
      >
        {items.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center px-[var(--space-200)] pb-[var(--space-200)] whitespace-nowrap',
                'font-[family-name:var(--body-font-family)] font-[var(--body-font-weight-strong)]',
                'text-[length:var(--body-sizeM)] leading-[1.15] text-[var(--text-gray-default)]',
                'hover:text-[var(--text-primary-default)]',
                active &&
                  '-mb-[2px] border-b-[length:var(--stroke-border-for-standard-text-field)] border-solid border-[var(--border-primary-default)]',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
