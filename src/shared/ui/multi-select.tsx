'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '../lib/cn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * Several values in one field. Ported from starter-kit
 * RelationSelectCombobox: chosen values are tags, the list opens with search.
 * Options are passed in; the form engine is not used.
 */
export function MultiSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  invalid,
  placeholder,
  searchPlaceholder,
  emptyText,
  allSelectedText,
  inline = false,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  allSelectedText: string;
  /** Draw the list in the page, so a click reaches it inside a modal. */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value.flatMap((id) => {
    const option = options.find((item) => item.value === id);
    return option ? [option] : [{ value: id, label: id }];
  });
  const available = options.filter((option) => !value.includes(option.value));
  const nothingLeft = options.length > 0 && available.length === 0;

  function add(id: string) {
    const next = [...value, id];
    onChange(next);
    if (available.length === 1) setOpen(false);
  }

  return (
    <div className="flex flex-col gap-[var(--space-200)]">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-200)]">
          {selected.map((option) => (
            <span
              key={option.value}
              className="inline-flex h-8 max-w-[150px] items-center gap-[var(--space-100)] overflow-hidden rounded-[var(--radius-100)] border border-solid border-[var(--border-gray-default)] bg-[var(--background-gray-tertiary)] px-[var(--space-200)]"
            >
              <span className="overflow-hidden font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] font-[var(--body-font-weight-strong)] text-ellipsis whitespace-nowrap text-[var(--text-gray-default)]">
                {option.label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-100)] text-[var(--text-gray-secondary)] hover:bg-[var(--background-gray-secondary)]"
                  onClick={() =>
                    onChange(value.filter((item) => item !== option.value))
                  }
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {inline && (
        <>
          <FieldButton
            id={id}
            disabled={disabled || nothingLeft}
            invalid={invalid}
            open={open}
            label={nothingLeft ? allSelectedText : placeholder}
            onClick={() => setOpen((current) => !current)}
          />
          {open && (
            <OptionList
              available={available}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              onAdd={add}
            />
          )}
        </>
      )}
      {!inline && (
        <Popover modal open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <FieldButton
              id={id}
              disabled={disabled || nothingLeft}
              invalid={invalid}
              open={open}
              label={nothingLeft ? allSelectedText : placeholder}
            />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="pointer-events-auto z-[80] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-[var(--radius-200)] border border-solid border-[var(--border-gray-default)] bg-[var(--background-gray-default)] shadow-[0px_2px_8px_0px_rgba(171,166,194,0.3)]"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <OptionList
              available={available}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              onAdd={add}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function FieldButton({
  id,
  disabled,
  invalid,
  open,
  label,
  onClick,
}: {
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  open: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      data-invalid={invalid ? true : undefined}
      data-state={open ? 'open' : 'closed'}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-[var(--radius-200)] border border-solid bg-[var(--background-gray-secondary)] px-[var(--space-300)]',
        'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-gray-secondary)]',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        invalid
          ? 'border-[var(--border-error-default)]'
          : 'border-[var(--border-gray-default)]',
      )}
      onClick={onClick}
    >
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </span>
      <ChevronDown
        aria-hidden
        className="size-4 shrink-0 text-[var(--icons-gray-default)]"
      />
    </button>
  );
}

function OptionList({
  available,
  searchPlaceholder,
  emptyText,
  onAdd,
}: {
  available: MultiSelectOption[];
  searchPlaceholder: string;
  emptyText: string;
  onAdd: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-200)] border border-solid border-[var(--border-gray-default)] bg-[var(--background-gray-default)]">
      <Command>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            {available.map((option) => (
              <CommandItem
                key={option.value}
                value={`${option.label} ${option.value}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onAdd(option.value);
                }}
                onSelect={() => onAdd(option.value)}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
