'use client';

import { Check, SlidersHorizontal } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Filter button of the design kit (Filter button) with the list of values in
 * a menu. One value is chosen at a time. On a narrow screen only the icon
 * stays visible.
 */
export function FilterMenu<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outlined" size="md" aria-label={label}>
          <SlidersHorizontal aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
          >
            <span className="inline-flex size-4 items-center justify-center">
              {option.value === value && (
                <Check aria-hidden className="size-4" />
              )}
            </span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
