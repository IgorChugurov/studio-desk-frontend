export interface PresetListParams {
  search: string;
  page: number;
  perPage: number;
}

export const DEFAULT_PRESET_LIST: PresetListParams = {
  search: '',
  page: 1,
  perPage: 15,
};

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export function parsePresetList(query: URLSearchParams): PresetListParams {
  return {
    search: (query.get('search') ?? '').trim(),
    page: positiveInt(query.get('page'), DEFAULT_PRESET_LIST.page),
    perPage: Math.min(
      positiveInt(query.get('perPage'), DEFAULT_PRESET_LIST.perPage),
      100,
    ),
  };
}

export function presetListQuery(params: PresetListParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page !== DEFAULT_PRESET_LIST.page) {
    query.set('page', String(params.page));
  }
  if (params.perPage !== DEFAULT_PRESET_LIST.perPage) {
    query.set('perPage', String(params.perPage));
  }
  return query.toString();
}

export function presetApiQuery(params: PresetListParams): string {
  const query = new URLSearchParams({
    currentPage: String(params.page),
    perPage: String(params.perPage),
    sortBy: 'createdAt',
  });
  if (params.search) query.set('search', params.search);
  return query.toString();
}

export function presetListHref(query: string): string {
  return query ? `/presets?${query}` : '/presets';
}

let lastListQuery = '';

export function rememberPresetList(query: string) {
  lastListQuery = query;
}

export function lastPresetListHref(): string {
  return presetListHref(lastListQuery);
}
