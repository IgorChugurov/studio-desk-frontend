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

function setup(handler: (call: Call) => Response | Promise<Response>) {
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

  it('switches studio and loads the new session', async () => {
    const { api, calls } = setup((call) => {
      if (call.url.endsWith('/auth/refresh')) {
        return json({ statusCode: 401, code: 'UNAUTHORIZED' }, 401);
      }
      if (call.url.endsWith('/me')) return me(['schedule']);
      if (call.url.endsWith('/auth/switch-studio')) {
        return json({
          accessToken: 't3',
          accessTokenExpiresIn: 900,
          user: { email: 'anna@example.com' },
          studio: { id: 's2', name: 'Dance Hall' },
        });
      }
      return json({
        result: 'signed-in',
        accessToken: 't1',
        accessTokenExpiresIn: 900,
        user: { email: 'anna@example.com' },
        studio: { id: 's1', name: 'Yoga Space' },
      });
    });
    await api.initSession();
    await api.auth.signIn('anna@example.com', '123456');
    await api.auth.switchStudio('s2');
    expect(api.session.get().status).toBe('signed-in');
    const switched = calls.find((call) =>
      call.url.endsWith('/auth/switch-studio'),
    );
    expect(switched?.init.credentials).toBe('include');
    const body = switched?.init.body;
    expect(typeof body === 'string' ? JSON.parse(body) : body).toEqual({
      studioId: 's2',
    });
  });

  it('exchanges a handoff code into a session', async () => {
    const { api } = setup((call) => {
      if (call.url.endsWith('/me')) return me(['schedule', 'staff']);
      if (call.url.endsWith('/auth/impersonation/exchange')) {
        return json({
          accessToken: 't4',
          accessTokenExpiresIn: 900,
          user: { email: 'owner@example.com' },
          studio: { id: 's1', name: 'Yoga Space' },
        });
      }
      return json({ statusCode: 401, code: 'UNAUTHORIZED' }, 401);
    });
    await api.auth.exchangeHandoff('k3J');
    expect(api.session.get().status).toBe('signed-in');
  });

  it('rejects an expired handoff code', async () => {
    const { api } = setup(() =>
      json({ statusCode: 400, code: 'INVALID_HANDOFF_CODE' }, 400),
    );
    await expect(api.auth.exchangeHandoff('gone')).rejects.toMatchObject({
      code: 'INVALID_HANDOFF_CODE',
    });
    expect(api.session.get().status).not.toBe('signed-in');
  });

  it('exchanges a handoff code once, and a late refresh does not replace that session', async () => {
    let releaseRefresh: (response: Response) => void = () => undefined;
    const refreshResponse = new Promise<Response>((resolve) => {
      releaseRefresh = resolve;
    });
    let exchanges = 0;
    const { api } = setup((call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResponse;
      if (call.url.endsWith('/auth/impersonation/exchange')) {
        exchanges += 1;
        return json({
          accessToken: 'owner-token',
          accessTokenExpiresIn: 900,
          user: { email: 'owner@example.com' },
          studio: { id: 's1', name: 'Yoga Space' },
        });
      }
      if (call.url.endsWith('/me')) {
        return json({
          user: { email: 'owner@example.com', interfaceLanguage: null },
          studio: { id: 's1', name: 'Yoga Space' },
          role: 'owner',
          sections: ['schedule'],
          impersonated: true,
          studios: [{ id: 's1', name: 'Yoga Space' }],
        });
      }
      return json({ statusCode: 401, code: 'UNAUTHORIZED' }, 401);
    });

    const pendingRefresh = api.initSession();
    await Promise.all([
      api.auth.exchangeHandoff('k3J'),
      api.auth.exchangeHandoff('k3J'),
    ]);
    expect(exchanges).toBe(1);
    releaseRefresh(
      json({
        accessToken: 'old-token',
        accessTokenExpiresIn: 900,
        user: { email: 'staff@example.com' },
        studio: { id: 's9', name: 'Old' },
      }),
    );
    await pendingRefresh;
    expect(api.session.get()).toMatchObject({
      status: 'signed-in',
      email: 'owner@example.com',
      studioId: 's1',
    });
  });
});
