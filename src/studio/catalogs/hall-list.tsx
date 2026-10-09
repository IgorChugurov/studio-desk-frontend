'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EllipsisVertical, LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shared/ui/dropdown-menu';
import { Pagination } from '../../shared/ui/pagination';
import { SearchInput } from '../../shared/ui/search-input';
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
import { CatalogTabs } from './catalog-tabs';
import { hallPageSchema, type Hall } from './hall-types';

const SEARCH_DELAY_MS = 300;

/** Halls of this studio: search by name, then the table. */
export function HallList() {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: texts.halls },
  ]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const perPage = Number(searchParams.get('perPage') ?? '15') || 15;
  const [searchText, setSearchText] = useState(search);
  const [items, setItems] = useState<Hall[] | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const text = searchText.trim();
    if (text === search) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (text) params.set('search', text);
      if (perPage !== 15) params.set('perPage', String(perPage));
      const query = params.toString();
      router.replace(query ? `/catalogs?${query}` : '/catalogs');
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, search, perPage, router]);

  useEffect(() => {
    let gone = false;
    const params = new URLSearchParams({
      currentPage: String(page),
      perPage: String(perPage),
    });
    if (search) params.set('search', search);
    void getApi()
      .request<unknown>(`/halls?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        const parsed = hallPageSchema.parse(body);
        setItems(parsed.items);
        setTotalItems(parsed.meta.totalItems);
        setTotalPages(parsed.meta.totalPages);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [page, perPage, search, texts.somethingWentWrong]);

  function go(nextPage: number, nextPerPage = perPage) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (nextPage !== 1) params.set('page', String(nextPage));
    if (nextPerPage !== 15) params.set('perPage', String(nextPerPage));
    const query = params.toString();
    router.push(query ? `/catalogs?${query}` : '/catalogs');
  }

  function resetSearch() {
    setSearchText('');
    const params = new URLSearchParams();
    if (perPage !== 15) params.set('perPage', String(perPage));
    const query = params.toString();
    router.push(query ? `/catalogs?${query}` : '/catalogs');
  }

  const empty = items !== null && items.length === 0;
  const emptySearch = empty && search.trim() !== '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current="/catalogs" />
      <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
        <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-200)]">
          <div className="flex min-w-0 flex-1 items-center">
            <SearchInput
              aria-label="Search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <Button asChild variant="cta" size="md" className="w-full sm:w-auto">
            <Link href="/catalogs/new">{texts.addHall}</Link>
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)]">
          {items === null && (
            <div className="flex flex-1 items-center justify-center">
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            </div>
          )}
          {empty && !emptySearch && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
              <p className="text-[var(--text-gray-default)]">{texts.noHalls}</p>
              <Button asChild variant="outlined" size="md">
                <Link href="/catalogs/new">{texts.addHall}</Link>
              </Button>
            </div>
          )}
          {emptySearch && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
              <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
                {texts.noHallsFound}
              </h2>
              <p className="figma-body-m-regular max-w-xs text-[var(--text-gray-secondary)]">
                {texts.hallsSearchHint}
              </p>
              <Button variant="outlined" size="md" onClick={resetSearch}>
                {texts.resetSearch}
              </Button>
            </div>
          )}
          {items !== null && !empty && (
            <div className="min-h-0 flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{texts.name}</TableHead>
                    <TableHead>{texts.address}</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((hall) => (
                    <TableRow
                      key={hall.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/catalogs/${hall.id}`)}
                    >
                      <TableCell>{hall.name}</TableCell>
                      <TableCell>{hall.address}</TableCell>
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
                                  router.push(`/catalogs/${hall.id}`)
                                }
                              >
                                <Pencil aria-hidden className="size-4" />
                                {texts.edit}
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
      </div>
    </div>
  );
}
