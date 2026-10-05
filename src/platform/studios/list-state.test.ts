import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIST_PARAMS,
  apiQuery,
  listHref,
  listQuery,
  parseListParams,
} from './list-state';

const parse = (query: string) => parseListParams(new URLSearchParams(query));

describe('list state', () => {
  it('uses the defaults for an empty address', () => {
    expect(parse('')).toEqual(DEFAULT_LIST_PARAMS);
    expect(DEFAULT_LIST_PARAMS).toMatchObject({
      status: 'active',
      page: 1,
      perPage: 15,
    });
  });

  it('reads search, status, page and perPage', () => {
    expect(
      parse('search=%20yoga%20&status=deactivated&page=3&perPage=30'),
    ).toEqual({ search: 'yoga', status: 'deactivated', page: 3, perPage: 30 });
  });

  it('falls back on wrong values and caps perPage at 100', () => {
    expect(parse('status=other&page=0&perPage=abc')).toEqual(
      DEFAULT_LIST_PARAMS,
    );
    expect(parse('perPage=500').perPage).toBe(100);
  });

  it('writes only what differs from the defaults', () => {
    expect(listQuery(DEFAULT_LIST_PARAMS)).toBe('');
    expect(
      listQuery({ search: 'a b', status: 'deactivated', page: 2, perPage: 50 }),
    ).toBe('search=a+b&status=deactivated&page=2&perPage=50');
    expect(listHref('')).toBe('/');
    expect(listHref('page=2')).toBe('/?page=2');
  });

  it('builds the API query with the filter and the page names of the API', () => {
    expect(apiQuery(DEFAULT_LIST_PARAMS)).toBe(
      'status=active&currentPage=1&perPage=15',
    );
    expect(apiQuery({ ...DEFAULT_LIST_PARAMS, search: 'yoga' })).toContain(
      'search=yoga',
    );
  });
});
