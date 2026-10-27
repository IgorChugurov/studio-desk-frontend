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
import type { OrganizationListItem } from './studio-types';

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

/** Table of the organizations. A click on a row opens the organization. */
export function StudiosTable({
  items,
  onOpen,
  onDeactivate,
  onActivate,
  onLoginAs,
}: {
  items: OrganizationListItem[];
  onOpen: (id: string) => void;
  onDeactivate: (organization: OrganizationListItem) => void;
  onActivate: (organization: OrganizationListItem) => void;
  onLoginAs: (organization: OrganizationListItem) => void;
}) {
  return (
    <Table className="min-w-[1000px]">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Preset</TableHead>
          <TableHead>Subdomain</TableHead>
          <TableHead>Custom domain</TableHead>
          <TableHead>Owner (e-mail)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-14" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((organization) => (
          <TableRow
            key={organization.id}
            className="cursor-pointer"
            onClick={() => onOpen(organization.id)}
          >
            <TableCell className="font-[var(--body-font-weight-strong)]">
              <Link
                href={`/organizations/${organization.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {organization.name}
              </Link>
            </TableCell>
            <TableCell>{organization.preset.name}</TableCell>
            <TableCell>{organization.subdomain}</TableCell>
            <TableCell className="text-[var(--text-gray-secondary)]">
              {organization.customDomain ?? '—'}
            </TableCell>
            <TableCell>{organization.owner.email}</TableCell>
            <TableCell>
              <StatusTag status={organization.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatCreated(organization.createdAt)}
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
                      aria-label={`Actions for ${organization.name}`}
                    >
                      <EllipsisVertical aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpen(organization.id)}>
                      <Pencil aria-hidden className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    {organization.status === 'active' ? (
                      <DropdownMenuItem
                        className="text-[var(--text-error-default)]"
                        onSelect={() => onDeactivate(organization)}
                      >
                        <PowerOff
                          aria-hidden
                          className="size-4 text-[var(--icons-error-default)]"
                        />
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => onActivate(organization)}
                      >
                        <Power aria-hidden className="size-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={() => onLoginAs(organization)}>
                      <LogIn aria-hidden className="size-4" />
                      Log in as organization
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
