'use client';

import Link from 'next/link';
import { Copy, EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shared/ui/table';
import { CONFIG_EDITOR_TEXTS } from '../../shared/config-editor/texts';
import { formatCreated } from '../studios/studios-table';
import type { Preset } from './preset-types';

export function resourceTypeNames(preset: Preset): string {
  return preset.catalogConfig.resourceTypes
    .map((type) => type.labels.en.plural)
    .join(', ');
}

export function PresetsTable({
  items,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  items: Preset[];
  onOpen: (id: string) => void;
  onDuplicate: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
}) {
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Resource types</TableHead>
          <TableHead>Settlement mode</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-14" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((preset) => (
          <TableRow
            key={preset.id}
            className="cursor-pointer"
            onClick={() => onOpen(preset.id)}
          >
            <TableCell className="font-[var(--body-font-weight-strong)]">
              <Link
                href={`/presets/${preset.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {preset.name}
              </Link>
            </TableCell>
            <TableCell>{resourceTypeNames(preset)}</TableCell>
            <TableCell>
              {
                CONFIG_EDITOR_TEXTS.settlement[
                  preset.billingConfig.settlementMode
                ]
              }
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatCreated(preset.createdAt)}
            </TableCell>
            <TableCell className="py-[var(--space-200)]">
              <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="icon"
                      size="md"
                      aria-label={`Actions for ${preset.name}`}
                    >
                      <EllipsisVertical aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(preset.id)}>
                      <Pencil aria-hidden className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onDuplicate(preset)}>
                      <Copy aria-hidden className="size-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[var(--text-error-default)]"
                      onSelect={() => onDelete(preset)}
                    >
                      <Trash2
                        aria-hidden
                        className="size-4 text-[var(--icons-error-default)]"
                      />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
