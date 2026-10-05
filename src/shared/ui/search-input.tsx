import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Input } from './input';

/**
 * Search field of the design kit: the outlined text field, 32 px high, with
 * the search icon on the left. Ported from starter-kit FigmaSearchInput.
 */
export const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>
>(({ className, ...props }, ref) => (
  <div className={cn('relative w-full min-w-0 sm:max-w-[320px]', className)}>
    <Search
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--icons-gray-secondary)]"
    />
    <Input
      ref={ref}
      type="text"
      size="sm"
      variant="outlined"
      className="pl-9"
      {...props}
    />
  </div>
));
SearchInput.displayName = 'SearchInput';
