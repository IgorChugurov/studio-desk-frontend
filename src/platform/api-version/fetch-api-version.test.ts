import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApiVersion } from './fetch-api-version';

function answerWith(body: unknown, init?: ResponseInit) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init)),
  );
}

describe('fetchApiVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the version the API reports', async () => {
    answerWith({ api: 'platform', version: '0.0.1' });
    await expect(
      fetchApiVersion('http://api.test/api/platform'),
    ).resolves.toEqual({ api: 'platform', version: '0.0.1' });
    expect(fetch).toHaveBeenCalledWith('http://api.test/api/platform/version');
  });

  it('fails when the API answers with an error status', async () => {
    answerWith({ code: 'INTERNAL_ERROR' }, { status: 500 });
    await expect(fetchApiVersion('http://api.test')).rejects.toThrow(
      'The API answered 500',
    );
  });

  it('fails when the answer has an unexpected shape', async () => {
    answerWith({ hello: 'world' });
    await expect(fetchApiVersion('http://api.test')).rejects.toThrow();
  });

  it('fails when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed')));
    await expect(fetchApiVersion('http://api.test')).rejects.toThrow('Failed');
  });
});
