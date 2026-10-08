'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EllipsisVertical, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';
import { Pagination } from '../../shared/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shared/ui/table';
import { notify } from '../../shared/ui/toaster';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { RemoveStaffDialog } from './remove-staff-dialog';
import { formatAdded, staffPageSchema, type StaffMember } from './staff-types';

/** Staff table. The owner is not in the list. */
export function StaffList() {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  useCrumbs([{ label: texts.staff }]);
  const router = useRouter();
  const search = useSearchParams();
  const page = Number(search.get('page') ?? '1') || 1;
  const perPage = Number(search.get('perPage') ?? '15') || 15;
  const [items, setItems] = useState<StaffMember[] | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [pending, setPending] = useState(false);

  function load(nextPage = page, nextPerPage = perPage) {
    void getApi()
      .request<unknown>(`/staff?page=${nextPage}&perPage=${nextPerPage}`)
      .then((body) => {
        const parsed = staffPageSchema.parse(body);
        setItems(parsed.items);
        setTotalItems(parsed.meta.totalItems);
        setTotalPages(parsed.meta.totalPages);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
  }

  useEffect(() => {
    load();
    // Reload when the page address changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  function go(nextPage: number, nextPerPage = perPage) {
    const params = new URLSearchParams();
    if (nextPage !== 1) params.set('page', String(nextPage));
    if (nextPerPage !== 15) params.set('perPage', String(nextPerPage));
    const query = params.toString();
    router.push(query ? `/staff?${query}` : '/staff');
  }

  async function remove() {
    if (!removing) return;
    setPending(true);
    try {
      await getApi().request(`/staff/${removing.id}`, { method: 'DELETE' });
      notify.success(texts.staffRemoved);
      setRemoving(null);
      load();
    } catch {
      notify.error(texts.somethingWentWrong);
    } finally {
      setPending(false);
    }
  }

  const empty = items !== null && items.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
      <div className="flex justify-end">
        <Button asChild variant="cta" size="md">
          <Link href="/staff/new">{texts.addStaff}</Link>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)]">
        {items === null && (
          <div className="flex flex-1 items-center justify-center">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
          </div>
        )}
        {empty && (
          <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
            <p className="text-[var(--text-gray-default)]">{texts.noStaff}</p>
            <Button asChild variant="outlined" size="md">
              <Link href="/staff/new">{texts.addStaff}</Link>
            </Button>
          </div>
        )}
        {items !== null && !empty && (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.emailLabel}</TableHead>
                  <TableHead>{texts.role}</TableHead>
                  <TableHead>{texts.added}</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/staff/${member.id}`)}
                  >
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.role === 'administrator'
                        ? texts.administrator
                        : texts.accountant}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatAdded(member.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex justify-end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="icon"
                              size="md"
                              aria-label={texts.edit}
                            >
                              <EllipsisVertical aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(`/staff/${member.id}`)
                              }
                            >
                              <Pencil aria-hidden className="size-4" />
                              {texts.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setRemoving(member)}
                            >
                              <Trash2 aria-hidden className="size-4" />
                              {texts.remove}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {items !== null && (
          <Pagination
            currentPage={page}
            perPage={perPage}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={(next) => go(next)}
            onPerPageChange={(next) => go(1, next)}
          />
        )}
      </div>
      <RemoveStaffDialog
        email={removing?.email ?? null}
        texts={texts}
        pending={pending}
        onCancel={() => setRemoving(null)}
        onRemove={() => void remove()}
      />
    </div>
  );
}
