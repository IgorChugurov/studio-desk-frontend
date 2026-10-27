'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ListFilter, LoaderCircle } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Pagination } from '../../shared/ui/pagination';
import { SearchInput } from '../../shared/ui/search-input';
import { notify } from '../../shared/ui/toaster';
import { useCrumbs } from '../shell/crumbs';
import {
  DEFAULT_PRESET_LIST,
  parsePresetList,
  presetListHref,
  presetListQuery,
  rememberPresetList,
  type PresetListParams,
} from './list-state';
import { PresetsTable } from './presets-table';
import { usePresetActions } from './use-preset-actions';
import { usePresetsList } from './use-presets-list';

const CRUMBS = [{ label: 'Presets' }];
const SEARCH_DELAY_MS = 300;
const FAILED_TEXT = 'Something went wrong. Try again';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[var(--space-300)] p-[var(--space-600)] text-center">
      {children}
    </div>
  );
}

/** Presets in a table with search. The address keeps the search and the page. */
export function PresetsList() {
  useCrumbs(CRUMBS);
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const params = useMemo(
    () => parsePresetList(new URLSearchParams(query)),
    [query],
  );
  const list = usePresetsList(params);
  const actions = usePresetActions(() => list.reload());

  useEffect(() => {
    rememberPresetList(presetListQuery(params));
  }, [params]);

  useEffect(() => {
    if (list.failed) notify.error(FAILED_TEXT);
  }, [list.failed]);

  function go(patch: Partial<PresetListParams>, replace = false) {
    const href = presetListHref(presetListQuery({ ...params, ...patch }));
    if (replace) router.replace(href);
    else router.push(href);
  }

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
    router.push(presetListHref(presetListQuery(DEFAULT_PRESET_LIST)));
  }

  const data = list.data;
  const empty = data !== null && data.items.length === 0;
  const noPresetsYet =
    empty && params.search === '' && data.meta.totalItems === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-300)] p-[var(--space-400)]">
      <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-200)]">
        <div className="min-w-0 flex-1">
          <SearchInput
            aria-label="Search presets"
            placeholder="Search presets"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <Button asChild variant="cta" size="md" className="w-full sm:w-auto">
          <Link href="/presets/new">Create preset</Link>
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
              Loading presets
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
              {noPresetsYet ? 'No presets yet' : 'No presets found'}
            </h2>
            {noPresetsYet ? (
              <Button asChild variant="outlined" size="md">
                <Link href="/presets/new">Create preset</Link>
              </Button>
            ) : (
              <>
                <p className="figma-body-m-regular max-w-xs text-[var(--text-gray-secondary)]">
                  Change the search term to find what you&apos;re looking for.
                </p>
                <Button variant="outlined" size="md" onClick={reset}>
                  Reset search
                </Button>
              </>
            )}
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
            <PresetsTable
              items={data.items}
              onOpen={(id) => router.push(`/presets/${id}`)}
              onDuplicate={(preset) => void actions.duplicate(preset)}
              onDelete={actions.requestDelete}
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
