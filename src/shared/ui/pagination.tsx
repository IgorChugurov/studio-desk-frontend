'use client';

import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export const PER_PAGE_OPTIONS = [15, 30, 50, 100] as const;

/**
 * Pagination row of a table (Pagination): rows per page, the shown range,
 * and the previous / next page. Server-side: the page owner loads the data.
 */
export function Pagination({
  currentPage,
  perPage,
  totalItems,
  totalPages,
  disabled = false,
  onPageChange,
  onPerPageChange,
}: {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalItems);
  const text =
    'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeS)] text-[var(--text-gray-secondary)]';

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-[var(--space-600)] gap-y-[var(--space-200)] border-t border-[var(--border-gray-default)] px-[var(--space-400)] py-[var(--space-200)]">
      <span className={text}>
        {currentPage} of {Math.max(totalPages, 1)}
      </span>

      <div className="flex items-center gap-[var(--space-600)]">
        <div className="flex items-center gap-[var(--space-200)]">
          <span className={text}>Rows per page:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="text"
                size="sm"
                disabled={disabled}
                aria-label="Rows per page"
              >
                {perPage}
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="min-w-[96px]"
            >
              {PER_PAGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={() => onPerPageChange(option)}
                >
                  <span className="inline-flex size-4 items-center justify-center">
                    {option === perPage && (
                      <Check aria-hidden className="size-4" />
                    )}
                  </span>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className={text}>
          {from}-{to} of {totalItems}
        </span>

        <div className="flex items-center gap-[var(--space-100)]">
          <Button
            variant="icon-outlined"
            size="sm"
            aria-label="Previous page"
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="icon-outlined"
            size="sm"
            aria-label="Next page"
            disabled={disabled || currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
