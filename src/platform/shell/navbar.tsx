'use client';

import Link from 'next/link';
import { Avatar } from '../../shared/ui/avatar';
import { Breadcrumbs, type BreadcrumbItem } from '../../shared/ui/breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';

/**
 * The top of every page after sign-in: a bar with the name and the avatar menu,
 * and under it the breadcrumbs. Its height is fixed; the page content takes
 * the rest of the screen.
 */
export function Navbar({
  email,
  crumbs,
  onSignOut,
}: {
  email: string;
  crumbs: BreadcrumbItem[];
  onSignOut: () => void;
}) {
  return (
    <header className="shrink-0">
      <div className="flex h-11 items-center justify-between bg-[var(--primary-light-800)] px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex h-6 items-center rounded-[var(--radius-100)] border border-[var(--white-with-opacity-400)] px-[var(--space-200)] font-[family-name:var(--body-font-family)] text-[length:var(--body-sizeM)] text-[var(--text-primary-on-primary)]"
        >
          Platform Admin
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="cursor-pointer rounded-[var(--radius-full)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--white-with-opacity-700)]"
          >
            <Avatar name={email} onDark />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex h-10 items-center border-b border-[var(--border-gray-default)] bg-[var(--background-gray-default)] px-4 sm:px-6">
        <Breadcrumbs items={crumbs} />
      </div>
    </header>
  );
}
