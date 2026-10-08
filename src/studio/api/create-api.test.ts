import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './create-api';

const API = 'http://api.test/api/studio';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Call = { url: string; init: RequestInit };

function setup(handler: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = {
        url:
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        init: init ?? {},
      };
      calls.push(call);
      return handler(call);
    },
  ) as unknown as typeof fetch;
  return { calls, api: createApi({ apiUrl: API, fetchImpl }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function me(sections = ['schedule', 'staff']) {
  return json({
    user: { email: 'anna@example.com', interfaceLanguage: null },
    studio: { id: 's1', name: 'Yoga Space' },
    role: 'owner',
    sections,
    impersonated: false,
    studios: [
      { id: 's1', name: 'Yoga Space' },
      { id: 's2', name: 'Dance Hall' },
    ],
  });
}

describe('studio sign-in', () => {
  it('signs in at once when the person has one studio', async () => {
    const { api } = setup((call) => {
      if (call.url.endsWith('/auth/refresh')) {
        return json({ statusCode: 401, code: 'UNAUTHORIZED' }, 401);
      }
      if (call.url.endsWith('/me')) return me();
      return json({
        result: 'signed-in',
        accessToken: 't1',
        accessTokenExpiresIn: 900,
        user: { email: 'anna@example.com' },
        studio: { id: 's1', name: 'Yoga Space' },
      });
    });
    await api.initSession();
    const result = await api.auth.signIn('anna@example.com', '123456');
    expect(result).toBe('signed-in');
    expect(api.session.get()).toMatchObject({
      status: 'signed-in',
      studioName: 'Yoga Space',
    });
    expect(api.selection()).toBeNull();
  });

  it('keeps no session when several studios must be chosen', async () => {
    const { api } = setup((call) => {
      if (call.url.endsWith('/auth/refresh')) {
        return json({ statusCode: 401, code: 'UNAUTHORIZED' }, 401);
      }
      if (call.url.endsWith('/me')) return me();
      if (call.url.endsWith('/auth/sign-in')) {
        return json({
          result: 'studio-selection',
          selectionTicket: 'ticket',
          selectionTicketExpiresIn: 300,
          studios: [{ id: 's1', name: 'Yoga Space' }],
        });
      }
      return json({
        accessToken: 't2',
        accessTokenExpiresIn: 900,
        user: { email: 'anna@example.com' },
        studio: { id: 's1', name: 'Yoga Space' },
      });
    });
    await api.initSession();
    expect(await api.auth.signIn('anna@example.com', '123456')).toBe('select');
    expect(api.session.get().status).toBe('signed-out');
    await api.auth.selectStudio('s1');
    expect(api.session.get()).toMatchObject({ status: 'signed-in' });
  });
});
