'use client';

import { Avatar } from '../../shared/ui/avatar';
import { Breadcrumbs } from '../../shared/ui/breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';
import { useCurrentCrumbs } from './crumbs';

/**
 * The top of every page after sign-in: one blue bar, 44 px high. On the left
 * "Platform Admin" and the breadcrumbs of the current page, on the right the
 * avatar menu. The page content takes the rest of the screen.
 */
export function Navbar({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const crumbs = useCurrentCrumbs();

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-[var(--space-400)] bg-[var(--primary-light-800)] px-4 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Platform Admin', href: '/', hideOnMobile: true },
          ...crumbs,
        ]}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="shrink-0 cursor-pointer rounded-[var(--radius-full)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--white-with-opacity-700)]"
        >
          <Avatar name={email} onDark />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
