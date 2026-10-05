'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ListFilter, LoaderCircle } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { FilterMenu } from '../../shared/ui/filter-menu';
import { Pagination } from '../../shared/ui/pagination';
import { SearchInput } from '../../shared/ui/search-input';
import { notify } from '../../shared/ui/toaster';
import { useCrumbs } from '../shell/crumbs';
import {
  DEFAULT_LIST_PARAMS,
  listHref,
  listQuery,
  parseListParams,
  rememberListQuery,
  type ListParams,
} from './list-state';
import { StudiosTable } from './studios-table';
import { useStudioActions } from './use-studio-actions';
import { useStudiosList } from './use-studios-list';

const CRUMBS = [{ label: 'Studios' }];
const SEARCH_DELAY_MS = 300;
const FAILED_TEXT = 'Something went wrong. Try again';
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
] as const;

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
      {children}
    </div>
  );
}

/**
 * The home page: studios in a table with search, a status filter, and
 * server-side pagination. What the list shows lives in the address, so the
 * page can be reloaded or shared. The table scrolls inside its own frame.
 */
export function StudiosList() {
  useCrumbs(CRUMBS);
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const params = useMemo(
    () => parseListParams(new URLSearchParams(query)),
    [query],
  );
  const list = useStudiosList(params);
  const actions = useStudioActions(() => list.reload());

  useEffect(() => {
    rememberListQuery(listQuery(params));
  }, [params]);

  useEffect(() => {
    if (list.failed) notify.error(FAILED_TEXT);
  }, [list.failed]);

  function go(patch: Partial<ListParams>, replace = false) {
    const href = listHref(listQuery({ ...params, ...patch }));
    if (replace) router.replace(href);
    else router.push(href);
  }

  // Search: the field answers at once, the list follows after a short pause.
  const [searchText, setSearchText] = useState(params.search);
  const sentSearch = useRef(params.search);

  useEffect(() => {
    if (params.search !== sentSearch.current) {
      sentSearch.current = params.search;
      setSearchText(params.search);
    }
  }, [params.search]);

  useEffect(() => {
    const text = searchText.trim();
    if (text === sentSearch.current) return;
    const timer = setTimeout(() => {
      sentSearch.current = text;
      go({ search: text, page: 1 }, true);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function reset() {
    sentSearch.current = '';
    setSearchText('');
    router.push(listHref(listQuery(DEFAULT_LIST_PARAMS)));
  }

  const data = list.data;
  const empty = data !== null && data.items.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
      <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-200)]">
        <div className="flex min-w-0 flex-1 items-center gap-[var(--space-200)]">
          <SearchInput
            aria-label="Search studios"
            placeholder="Search studios"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <FilterMenu
            label="Status"
            options={[...STATUS_OPTIONS]}
            value={params.status}
            onChange={(status) => go({ status, page: 1 })}
          />
        </div>
        <Button asChild variant="cta" size="md" className="w-full sm:w-auto">
          <Link href="/studios/new">Create studio</Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-default)]">
        {data === null && list.loading && (
          <Centered>
            <LoaderCircle
              aria-hidden
              className="size-5 animate-spin text-[var(--icons-primary-default)]"
            />
            <span className="figma-body-s-medium text-[var(--text-gray-secondary)]">
              Loading studios
            </span>
          </Centered>
        )}

        {data === null && !list.loading && list.failed && (
          <Centered>
            <p className="figma-body-m-regular text-[var(--text-gray-default)]">
              {FAILED_TEXT}
            </p>
          </Centered>
        )}

        {data !== null && empty && (
          <Centered>
            <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-200)] border border-[var(--border-gray-default)] bg-[var(--background-gray-secondary)]">
              <ListFilter
                aria-hidden
                className="size-5 text-[var(--icons-gray-default)]"
              />
            </span>
            <h2 className="figma-body-m-medium text-[var(--text-gray-default)]">
              No studios found
            </h2>
            <p className="figma-body-m-regular max-w-xs text-[var(--text-gray-secondary)]">
              Change the search term or status filter to find what you&apos;re
              looking for.
            </p>
            <Button variant="outlined" size="md" onClick={reset}>
              Reset search and filters
            </Button>
          </Centered>
        )}

        {data !== null && !empty && (
          <div
            aria-busy={list.loading || undefined}
            className={
              list.loading
                ? 'min-h-0 flex-1 overflow-auto opacity-60 transition-opacity'
                : 'min-h-0 flex-1 overflow-auto transition-opacity'
            }
          >
            <StudiosTable
              items={data.items}
              onOpen={(id) => router.push(`/studios/${id}`)}
              onDeactivate={actions.requestDeactivate}
              onActivate={(studio) => void actions.activate(studio.id)}
              onLoginAs={(studio) => void actions.loginAs(studio.id)}
            />
          </div>
        )}

        {data !== null && (
          <Pagination
            currentPage={data.meta.currentPage}
            perPage={data.meta.perPage}
            totalItems={data.meta.totalItems}
            totalPages={data.meta.totalPages}
            disabled={list.loading}
            onPageChange={(page) => go({ page })}
            onPerPageChange={(perPage) => go({ perPage, page: 1 })}
          />
        )}
      </div>
      {actions.dialog}
    </div>
  );
}
