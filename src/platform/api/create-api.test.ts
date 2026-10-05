import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { createApi } from './create-api';

const API = 'http://api.test/api/platform';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tokens(accessToken: string, email = 'admin@example.com') {
  return json({ accessToken, accessTokenExpiresIn: 900, user: { email } });
}

function errorBody(status: number, code: string) {
  return json(
    { statusCode: status, code, message: 'text for developers' },
    status,
  );
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

function header(call: Call, name: string) {
  return (call.init.headers as Record<string, string> | undefined)?.[name];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session start (every page load starts with one refresh)', () => {
  it('signs in from the refresh cookie and sends the browser contract headers', async () => {
    const { api, calls } = setup(() => tokens('t1'));
    await api.initSession();

    expect(api.session.get()).toEqual({
      status: 'signed-in',
      email: 'admin@example.com',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${API}/auth/refresh`);
    expect(calls[0]?.init.credentials).toBe('include');
    expect(header(calls[0]!, 'X-Requested-With')).toBeTruthy();
  });

  it('runs the refresh once even if started twice', async () => {
    const { api, calls } = setup(() => tokens('t1'));
    await Promise.all([api.initSession(), api.initSession()]);
    expect(calls).toHaveLength(1);
  });

  it('UNAUTHORIZED shows the sign-in screen without a message', async () => {
    const { api } = setup(() => errorBody(401, 'UNAUTHORIZED'));
    await api.initSession();
    expect(api.session.get()).toEqual({ status: 'signed-out' });
  });

  it('SESSION_EXPIRED shows the sign-in screen with the expired reason', async () => {
    const { api } = setup(() => errorBody(401, 'SESSION_EXPIRED'));
    await api.initSession();
    expect(api.session.get()).toEqual({
      status: 'signed-out',
      reason: 'expired',
    });
  });
});

describe('401 on a request', () => {
  it('one refresh serves all waiting requests, then they repeat', async () => {
    let refreshCount = 0;
    const { api, calls } = setup(async ({ url, init }) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount += 1;
        await Promise.resolve();
        return tokens('fresh');
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer fresh'
        ? json({ ok: true })
        : errorBody(401, 'UNAUTHORIZED');
    });

    const results = await Promise.all([
      api.request('/studios'),
      api.request('/studios/1'),
      api.request('/studios/2'),
    ]);

    expect(results).toHaveLength(3);
    expect(refreshCount).toBe(1);
    expect(calls.filter((c) => c.url.endsWith('/studios'))).toHaveLength(2);
  });

  it('a failed refresh ends the session and the request fails', async () => {
    const { api } = setup(({ url }) =>
      url.endsWith('/auth/refresh')
        ? errorBody(401, 'SESSION_EXPIRED')
        : errorBody(401, 'UNAUTHORIZED'),
    );

    await expect(api.request('/studios')).rejects.toBeInstanceOf(ApiError);
    expect(api.session.get()).toEqual({
      status: 'signed-out',
      reason: 'expired',
    });
  });

  it('a request is repeated only once', async () => {
    const { api, calls } = setup(({ url }) =>
      url.endsWith('/auth/refresh')
        ? tokens('t2')
        : errorBody(401, 'UNAUTHORIZED'),
    );
    await expect(api.request('/studios')).rejects.toMatchObject({
      status: 401,
    });
    expect(calls.filter((c) => c.url.endsWith('/studios'))).toHaveLength(2);
  });
});

describe('errors', () => {
  it('keeps code and field errors and never the server message', async () => {
    const { api } = setup(() =>
      json(
        {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: [
            {
              code: 'INVALID_FORMAT',
              field: 'email',
              message: 'Invalid email address',
            },
          ],
        },
        400,
      ),
    );

    const error = await api.auth.requestCode('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe('VALIDATION_ERROR');
    expect(apiError.field).toBe('email');
    expect(JSON.stringify(apiError)).not.toContain('Invalid email address');
  });

  it('a lost connection becomes NETWORK_ERROR', async () => {
    const api = createApi({
      apiUrl: API,
      fetchImpl: (() =>
        Promise.reject(new TypeError('failed'))) as typeof fetch,
    });
    await expect(api.auth.requestCode('a@b.co')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});

describe('auth calls', () => {
  it('requestCode returns the server seconds', async () => {
    const { api, calls } = setup(() =>
      json({ codeExpiresIn: 600, resendAvailableIn: 60 }),
    );
    await expect(api.auth.requestCode('admin@example.com')).resolves.toEqual({
      codeExpiresIn: 600,
      resendAvailableIn: 60,
    });
    expect(calls[0]?.init.credentials).toBe('include');
  });

  it('signIn starts the session', async () => {
    const { api, calls } = setup(() => tokens('t1'));
    await api.auth.signIn('admin@example.com', '123456');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
      email: 'admin@example.com',
      code: '123456',
    });
    expect(api.session.get()).toEqual({
      status: 'signed-in',
      email: 'admin@example.com',
    });
  });

  it('signOut sends the contract header and ends the session even if the call fails', async () => {
    const { api, calls } = setup(({ url }) =>
      url.endsWith('/auth/sign-out')
        ? errorBody(500, 'INTERNAL_ERROR')
        : tokens('t1'),
    );
    await api.auth.signIn('admin@example.com', '123456');
    await api.auth.signOut();

    const call = calls.find((c) => c.url.endsWith('/auth/sign-out'));
    expect(call?.init.credentials).toBe('include');
    expect(header(call!, 'X-Requested-With')).toBeTruthy();
    expect(api.session.get()).toEqual({ status: 'signed-out' });
  });

  it('signOut ends the session when the connection is lost', async () => {
    const api = createApi({
      apiUrl: API,
      fetchImpl: (() =>
        Promise.reject(new TypeError('failed'))) as typeof fetch,
    });
    await api.auth.signOut();
    expect(api.session.get()).toEqual({ status: 'signed-out' });
  });
});

describe('token storage', () => {
  it('never touches localStorage, sessionStorage or document.cookie', async () => {
    const forbidden = () => {
      throw new Error('browser storage must not be used');
    };
    const trap = new Proxy({}, { get: forbidden, set: forbidden });
    vi.stubGlobal('localStorage', trap);
    vi.stubGlobal('sessionStorage', trap);
    vi.stubGlobal('document', trap);

    const { api } = setup(() => tokens('secret'));
    await api.auth.signIn('admin@example.com', '123456');
    await api.initSession();
    await api.auth.signOut();
    expect(api.session.get().status).toBe('signed-out');
  });
});
