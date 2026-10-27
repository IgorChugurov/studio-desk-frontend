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
import { ApiError } from '../api/api-error';
import { getApi } from '../api/api';
import { useSession } from '../api/session-provider';
import { copy } from '../i18n/language';
import { useCrumbs } from '../shell/crumbs';
import { ScheduleTabs } from './schedule-tabs';
import { texts } from './texts';

const SEARCH_DELAY_MS = 300;

const pageSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string() })),
  meta: z.object({
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

/** Week templates of this organization. */
export function TemplatesList() {
  const session = useSession();
  const language = session.status === 'signed-in' ? session.language : 'en';
  const copyTexts = copy(language);
  useCrumbs([
    { label: copyTexts.schedule, href: '/schedule' },
    { label: texts.templates },
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
  const [forbidden, setForbidden] = useState(false);
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
      router.replace(
        query ? `/schedule/templates?${query}` : '/schedule/templates',
      );
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
      .request<unknown>(`/week-templates?${params.toString()}`)
      .then((body) => {
        if (gone) return;
        const parsed = pageSchema.parse(body);
        setItems(parsed.items);
        setTotalItems(parsed.meta.totalItems);
        setTotalPages(parsed.meta.totalPages);
      })
      .catch((error: unknown) => {
        if (gone) return;
        if (error instanceof ApiError && error.code === 'FORBIDDEN') {
          setForbidden(true);
          setItems([]);
          return;
        }
        notify.error(texts.failed);
      });
    return () => {
      gone = true;
    };
  }, [page, perPage, search]);

  const empty = items !== null && items.length === 0;
  const emptySearch = empty && search.trim() !== '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScheduleTabs current="templates" />
      <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
        {forbidden ? (
          <p>{copyTexts.noAccess}</p>
        ) : (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-200)]">
              <div className="flex min-w-0 flex-1 items-center">
                <SearchInput
                  aria-label="Search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>
              <Button
                asChild
                variant="cta"
                size="md"
                className="w-full sm:w-auto"
              >
                <Link href="/schedule/templates/new">{texts.addTemplate}</Link>
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
                  <p>{texts.noTemplates}</p>
                  <Button asChild variant="outlined" size="md">
                    <Link href="/schedule/templates/new">
                      {texts.addTemplate}
                    </Link>
                  </Button>
                </div>
              )}
              {emptySearch && (
                <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
                  <h2>{texts.noTemplatesFound}</h2>
                  <p>{texts.searchHint}</p>
                  <Button
                    variant="outlined"
                    size="md"
                    onClick={() => {
                      setSearchText('');
                      router.push('/schedule/templates');
                    }}
                  >
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
                          onClick={() =>
                            router.push(`/schedule/templates/${item.id}`)
                          }
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
                                      router.push(
                                        `/schedule/templates/${item.id}`,
                                      )
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
                  onPageChange={(next) =>
                    router.push(listHref(search, next, perPage))
                  }
                  onPerPageChange={(next) =>
                    router.push(listHref(search, 1, next))
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function listHref(search: string, page: number, perPage: number) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page !== 1) params.set('page', String(page));
  if (perPage !== 15) params.set('perPage', String(perPage));
  const query = params.toString();
  return query ? `/schedule/templates?${query}` : '/schedule/templates';
}
