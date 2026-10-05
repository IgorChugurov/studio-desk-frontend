import type { StudioStatus } from './studio-types';

/** What the list shows: it lives in the address of the page. */
export interface ListParams {
  search: string;
  status: StudioStatus;
  page: number;
  perPage: number;
}

export const DEFAULT_LIST_PARAMS: ListParams = {
  search: '',
  status: 'active',
  page: 1,
  perPage: 15,
};

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export function parseListParams(query: URLSearchParams): ListParams {
  return {
    search: (query.get('search') ?? '').trim(),
    status: query.get('status') === 'deactivated' ? 'deactivated' : 'active',
    page: positiveInt(query.get('page'), DEFAULT_LIST_PARAMS.page),
    perPage: Math.min(
      positiveInt(query.get('perPage'), DEFAULT_LIST_PARAMS.perPage),
      100,
    ),
  };
}

/** Address query of the page: only what differs from the defaults. */
export function listQuery(params: ListParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status !== DEFAULT_LIST_PARAMS.status) {
    query.set('status', params.status);
  }
  if (params.page !== DEFAULT_LIST_PARAMS.page) {
    query.set('page', String(params.page));
  }
  if (params.perPage !== DEFAULT_LIST_PARAMS.perPage) {
    query.set('perPage', String(params.perPage));
  }
  return query.toString();
}

/** Query of `GET /studios`. */
export function apiQuery(params: ListParams): string {
  const query = new URLSearchParams({
    status: params.status,
    currentPage: String(params.page),
    perPage: String(params.perPage),
  });
  if (params.search) query.set('search', params.search);
  return query.toString();
}

export function listHref(query: string): string {
  return query ? `/?${query}` : '/';
}

/**
 * The list the administrator came from, kept in memory of the page only, so
 * that "Back" and a saved form return to the same search, filter and page.
 */
let lastListQuery = '';

export function rememberListQuery(query: string) {
  lastListQuery = query;
}

export function lastListHref(): string {
  return listHref(lastListQuery);
}
