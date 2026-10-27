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
import {
  resourcePageSchema,
  sortedTypes,
  typeLabel,
  typePath,
  type CatalogResource,
} from './resource-types';

const SEARCH_DELAY_MS = 300;

/** Resources of one type: search by name, then the table. */
export function ResourceList({ typeId }: { typeId?: string }) {
  const session = useSession();
  const language = session.status === 'signed-in' ? session.language : 'en';
  const texts = copy(language);
  const types =
    session.status === 'signed-in'
      ? sortedTypes(session.config.catalogConfig.resourceTypes)
      : [];
  const type = types.find((item) => item.id === typeId) ?? types[0];
  const plural = type ? typeLabel(type, language, 'plural') : '';
  const singular = type ? typeLabel(type, language, 'singular') : '';
  const listPath = type ? typePath(type.id) : '/catalogs';
  useCrumbs([
    { label: texts.catalogs, href: '/catalogs' },
    ...(type ? [{ label: plural }] : []),
  ]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const perPage = Number(searchParams.get('perPage') ?? '15') || 15;
  const [searchText, setSearchText] = useState(search);
  const [items, setItems] = useState<CatalogResource[] | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const text = searchText.trim();
    if (text === search) return;
    const timer = setTimeout(() => {
      router.replace(href(listPath, { search: text, perPage }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, search, perPage, router, listPath]);

  useEffect(() => {
    if (!type) return;
    let gone = false;
    const params = new URLSearchParams({
      resourceTypeId: type.id,
      currentPage: String(page),
      perPage: String(perPage),
    });
    if (search) params.set('search', search);
    void getApi()
      .request<unknown>(`/resources?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        const parsed = resourcePageSchema.parse(body);
        setItems(parsed.items);
        setTotalItems(parsed.meta.totalItems);
        setTotalPages(parsed.meta.totalPages);
      })
      .catch(() => notify.error(texts.somethingWentWrong));
    return () => {
      gone = true;
    };
  }, [type, page, perPage, search, texts.somethingWentWrong]);

  if (!type) return null;

  function go(nextPage: number, nextPerPage = perPage) {
    router.push(
      href(listPath, {
        search,
        page: nextPage,
        perPage: nextPerPage,
      }),
    );
  }

  function resetSearch() {
    setSearchText('');
    router.push(href(listPath, { perPage }));
  }

  const empty = items !== null && items.length === 0;
  const emptySearch = empty && search.trim() !== '';
  const addLabel = `Add ${singular}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CatalogTabs current={listPath} />
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
              <p className="text-[var(--text-gray-default)]">No {plural} yet</p>
              <Button asChild variant="outlined" size="md">
                <Link href={`${listPath}/new`}>{addLabel}</Link>
              </Button>
            </div>
          )}
          {emptySearch && (
            <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
              <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
                No {plural} found
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
                    {type.geography && <TableHead>{texts.address}</TableHead>}
                    {type.duration && (
                      <TableHead>{texts.defaultDuration}</TableHead>
                    )}
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
                      {type.geography && <TableCell>{item.address}</TableCell>}
                      {type.duration && (
                        <TableCell>{item.defaultDuration}</TableCell>
                      )}
                      <TableCell>
                        <RowMenu
                          label={texts.edit}
                          onEdit={() => router.push(`${listPath}/${item.id}`)}
                        />
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

function RowMenu({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div
      className="flex justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="icon" size="md" aria-label={label}>
            <EllipsisVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil aria-hidden className="size-4" />
            {label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function href(
  path: string,
  query: { search?: string; page?: number; perPage?: number },
) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.page && query.page !== 1) params.set('page', String(query.page));
  if (query.perPage && query.perPage !== 15)
    params.set('perPage', String(query.perPage));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
