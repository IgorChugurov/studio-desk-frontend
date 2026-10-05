'use client';

import Link from 'next/link';
import { EllipsisVertical, LogIn, Pencil, Power, PowerOff } from 'lucide-react';
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
import { StatusTag } from './status-tag';
import type { StudioListItem } from './studio-types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `30 Sep 2026`, in the time zone of the browser. */
export function formatCreated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Table of the studios. A click on a row opens the studio. */
export function StudiosTable({
  items,
  onOpen,
  onDeactivate,
  onActivate,
  onLoginAs,
}: {
  items: StudioListItem[];
  onOpen: (id: string) => void;
  onDeactivate: (studio: StudioListItem) => void;
  onActivate: (studio: StudioListItem) => void;
  onLoginAs: (studio: StudioListItem) => void;
}) {
  return (
    <Table className="min-w-[1000px]">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Subdomain</TableHead>
          <TableHead>Custom domain</TableHead>
          <TableHead>Owner (e-mail)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-14" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((studio) => (
          <TableRow
            key={studio.id}
            className="cursor-pointer"
            onClick={() => onOpen(studio.id)}
          >
            <TableCell className="font-[var(--body-font-weight-strong)]">
              <Link
                href={`/studios/${studio.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {studio.name}
              </Link>
            </TableCell>
            <TableCell>{studio.subdomain}</TableCell>
            <TableCell className="text-[var(--text-gray-secondary)]">
              {studio.customDomain ?? '—'}
            </TableCell>
            <TableCell>{studio.owner.email}</TableCell>
            <TableCell>
              <StatusTag status={studio.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatCreated(studio.createdAt)}
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
                      aria-label={`Actions for ${studio.name}`}
                    >
                      <EllipsisVertical aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(studio.id)}>
                      <Pencil aria-hidden className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    {studio.status === 'active' ? (
                      <DropdownMenuItem
                        className="text-[var(--text-error-default)]"
                        onSelect={() => onDeactivate(studio)}
                      >
                        <PowerOff
                          aria-hidden
                          className="size-4 text-[var(--icons-error-default)]"
                        />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onSelect={() => onActivate(studio)}>
                        <Power aria-hidden className="size-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onLoginAs(studio)}>
                      <LogIn aria-hidden className="size-4" />
                      Log in as studio
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
