'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';

/** Searchable list of the design kit, ported from starter-kit ui/command. */
const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden text-[var(--text-gray-default)]',
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-[var(--border-gray-default)]">
    <Search
      aria-hidden
      className="ml-[var(--space-200)] mr-[var(--space-200)] size-4 shrink-0 text-[var(--text-gray-secondary)]"
    />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-10 w-full bg-transparent py-[var(--space-200)] pr-[var(--space-200)] text-[length:var(--body-sizeM)] outline-none',
        'font-[family-name:var(--body-font-family)] font-[var(--body-font-weight-regular)]',
        'placeholder:text-[var(--text-gray-secondary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      'flex max-h-[300px] flex-col gap-[var(--space-050)] overflow-x-hidden overflow-y-auto p-[var(--space-100)]',
      className,
    )}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-[var(--space-200)] text-center text-[length:var(--body-sizeS)] text-[var(--text-gray-secondary)]"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn('overflow-hidden text-[var(--text-gray-default)]', className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer items-center gap-[var(--space-200)] rounded-[var(--radius-100)] p-[var(--space-200)] outline-none select-none',
      'font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] font-[var(--body-font-weight-regular)] text-[var(--text-gray-default)]',
      'aria-selected:bg-[var(--background-primary-tertiary)]',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
