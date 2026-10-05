import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Table of the design kit (Table / top, Table / line). Ported from
 * starter-kit FigmaTable. The scroll container is the parent: give it a
 * height and `overflow-auto`; the header row sticks to its top.
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full border-separate border-spacing-0', className)}
      {...props}
    />
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 bg-[var(--background-gray-default)]',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      className={cn(
        '[&_tr:last-child_td]:border-b-0',
        '[&_tr:hover]:bg-[var(--background-primary-secondary)]',
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'bg-[var(--background-gray-default)] transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-10 px-[var(--space-400)] py-[var(--space-300)] text-left align-middle whitespace-nowrap',
        'figma-mono-s-medium text-[var(--text-gray-secondary)]',
        'border-b border-[var(--border-gray-default)]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'px-[var(--space-400)] py-[var(--space-300)] align-middle',
        'figma-body-m-regular text-[var(--text-gray-default)]',
        'border-b border-[var(--border-gray-default)]',
        className,
      )}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
