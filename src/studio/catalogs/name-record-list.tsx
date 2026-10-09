'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EllipsisVertical, LoaderCircle, Pencil } from 'lucide-react';
import { z } from 'zod';
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

const SEARCH_DELAY_MS = 300;

const pageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

/** A name-only catalog list. Halls keep their own list because they also show address. */
export function NameRecordList({
  listPath,
  apiPath,
  tab,
  sectionLabel,
  addLabel,
  emptyLabel,
  emptySearchLabel,
}: {
  listPath: string;
  apiPath: string;
  tab: string;
  sectionLabel: string;
  addLabel: string;
  emptyLabel: string;
  emptySearchLabel: string;
}) {
  const session = useSession();
  const texts = copy(session.status === 'signed-in' ? session.language : 'en');
  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    { label: sectionLabel },
  ]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const perPage = Number(searchParams.get('perPage') ?? '15') || 15;
  const [searchText, setSearchText] = useState(search);
  const [items, setItems] = useState<{ id: string; name: string }[] | null>(
    null,
  );
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
      router.replace(query ? `${listPath}?${query}` : listPath);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, search, perPage, router, listPath]);

  useEffect(() => {
    let gone = false;
    const params = new URLSearchParams({
      currentPage: String(page),
      perPage: String(perPage),
    });
    if (search) params.set('search', search);
    void getApi()
      .request<unknown>(`${apiPath}?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        const parsed = pageSchema.parse(body);
        setItems(parsed.items);
        setTotalItems(parsed.meta.totalItems);
        setTotalPages(parsed.meta.totalPages);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [apiPath, page, perPage, search, texts.somethingWentWrong]);

  function href(nextPage: number, nextPerPage = perPage) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (nextPage !== 1) params.set('page', String(nextPage));
    if (nextPerPage !== 15) params.set('perPage', String(nextPerPage));
    const query = params.toString();
    return query ? `${listPath}?${query}` : listPath;
  }

  function resetSearch() {
    setSearchText('');
    const params = new URLSearchParams();
    if (perPage !== 15) params.set('perPage', String(perPage));
    const query = params.toString();
    router.push(query ? `${listPath}?${query}` : listPath);
  }

  const empty = items !== null && items.length === 0;
  const emptySearch = empty && search.trim() !== '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current={tab} />
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
            <Link href={`${listPath}/new`}>{addLabel}</Link>
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
              <p className="text-[var(--text-gray-default)]">{emptyLabel}</p>
              <Button asChild variant="outlined" size="md">
                <Link href={`${listPath}/new`}>{addLabel}</Link>
              </Button>
            </div>
          )}
          {emptySearch && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
              <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
                {emptySearchLabel}
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
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`${listPath}/${item.id}`)}
                    >
                      <TableCell>{item.name}</TableCell>
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
                                  router.push(`${listPath}/${item.id}`)
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
              onPageChange={(next) => router.push(href(next))}
              onPerPageChange={(next) => router.push(href(1, next))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
