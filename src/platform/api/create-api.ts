import type { z } from 'zod';
import { ApiError, NETWORK_ERROR, toApiError } from './api-error';
import {
  codeResponseSchema,
  tokensResponseSchema,
  type CodeResponse,
  type RequestCodeBody,
  type SignInBody,
  type TokensResponse,
} from './auth-types';
import { createSessionStore } from './session-store';

export interface ApiOptions {
  apiUrl: string;
  /** Replaces `fetch` in tests. */
  fetchImpl?: typeof fetch;
}

/** The server only checks that the header is present (CSRF protection). */
const REQUESTED_WITH = { 'X-Requested-With': 'fetch' };

/**
 * The client of the platform API. It keeps the access token in a variable
 * (never in a browser storage), refreshes it once for all waiting requests,
 * and turns error answers into `ApiError`.
 */
export function createApi({ apiUrl, fetchImpl }: ApiOptions) {
  const store = createSessionStore();
  let accessToken: string | null = null;
  let refreshing: Promise<void> | null = null;
  let initializing: Promise<void> | null = null;

  async function send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await (fetchImpl ?? fetch)(`${apiUrl}${path}`, init);
    } catch {
      throw new ApiError(0, NETWORK_ERROR);
    }
  }

  function startSession(tokens: TokensResponse) {
    accessToken = tokens.accessToken;
    store.set({ status: 'signed-in', email: tokens.user.email });
  }

  function endSession(reason?: 'expired') {
    accessToken = null;
    store.set(
      reason ? { status: 'signed-out', reason } : { status: 'signed-out' },
    );
  }

  /** A call to `/auth/*`: the refresh cookie travels with it. */
  async function authCall<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const response = await send(path, { ...init, credentials: 'include' });
    if (!response.ok) throw await toApiError(response);
    return schema.parse(await response.json());
  }

  function jsonPost(body: unknown): RequestInit {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  /** One refresh serves everyone who waits for it. */
  function refresh(): Promise<void> {
    refreshing ??= (async () => {
      try {
        const tokens = await authCall(
          '/auth/refresh',
          { method: 'POST', headers: REQUESTED_WITH },
          tokensResponseSchema,
        );
        startSession(tokens);
      } catch (error) {
        endSession(
          error instanceof ApiError && error.code === 'SESSION_EXPIRED'
            ? 'expired'
            : undefined,
        );
        throw error;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  /**
   * A request with the access token. On `401` it refreshes the token once
   * (shared with other waiting requests) and repeats the request once.
   */
  async function request<T = void>(
    path: string,
    init: { method?: string; body?: unknown } = {},
    repeated = false,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await send(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (response.status === 401 && !repeated) {
      await refresh();
      return request<T>(path, init, true);
    }
    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    session: store,
    request,

    /** Every page load starts with one refresh (runs once). */
    initSession(): Promise<void> {
      initializing ??= refresh().catch(() => undefined);
      return initializing;
    },

    auth: {
      requestCode(email: string): Promise<CodeResponse> {
        const body: RequestCodeBody = { email };
        return authCall('/auth/code', jsonPost(body), codeResponseSchema);
      },

      async signIn(email: string, code: string): Promise<void> {
        const body: SignInBody = { email, code };
        startSession(
          await authCall('/auth/sign-in', jsonPost(body), tokensResponseSchema),
        );
      },

      /** Always ends the session, also when the call fails. */
      async signOut(): Promise<void> {
        try {
          await send('/auth/sign-out', {
            method: 'POST',
            headers: REQUESTED_WITH,
            credentials: 'include',
          });
        } catch {
          // The session ends anyway.
        } finally {
          endSession();
        }
      },
    },
  };
}

export type Api = ReturnType<typeof createApi>;
