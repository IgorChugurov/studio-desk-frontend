'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Select of the design kit, ported from starter-kit FigmaSelect.
 * A closed field with the current value; the list opens under it.
 */
export function Select({
  id,
  value,
  onValueChange,
  options,
  disabled,
  invalid,
  placeholder,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-invalid={invalid ? true : undefined}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-[var(--radius-200)] border border-solid px-[var(--space-300)]',
          'bg-[var(--background-gray-default)] text-[var(--text-gray-default)]',
          'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)]',
          'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          invalid
            ? 'border-[var(--border-error-default)]'
            : 'border-[var(--border-gray-default)]',
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown
            aria-hidden
            className="size-4 text-[var(--icons-gray-default)]"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)] shadow-[0px_2px_8px_0px_rgba(171,166,194,0.3)]"
        >
          <SelectPrimitive.Viewport className="p-[var(--space-100)]">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-[var(--space-200)] rounded-[var(--radius-100)] px-[var(--space-200)] py-[var(--space-150)] outline-none data-[highlighted]:bg-[var(--background-gray-secondary)]"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check aria-hidden className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
