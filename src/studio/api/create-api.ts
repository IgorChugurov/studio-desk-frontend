import type { z } from 'zod';
import { ApiError, NETWORK_ERROR, toApiError } from './api-error';
import {
  codeResponseSchema,
  meSchema,
  sessionBodySchema,
  signInResponseSchema,
  type CodeResponse,
  type Me,
  type SessionBody,
  type StudioRef,
} from './auth-types';
import { languageOf, writeLanguageCookie, type Lang } from '../i18n/language';
import { createSessionStore } from './session-store';

export interface ApiOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
}

const REQUESTED_WITH = { 'X-Requested-With': 'fetch' };

export interface Selection {
  ticket: string;
  studios: StudioRef[];
}

/**
 * The client of the studio API. The access token lives in a variable.
 * One refresh serves every waiting request.
 */
export function createApi({ apiUrl, fetchImpl }: ApiOptions) {
  const store = createSessionStore();
  let accessToken: string | null = null;
  let refreshing: Promise<void> | null = null;
  let initializing: Promise<void> | null = null;
  let selection: Selection | null = null;
  let epoch = 0;
  const handoffs = new Map<string, Promise<void>>();

  async function send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await (fetchImpl ?? fetch)(`${apiUrl}${path}`, init);
    } catch {
      throw new ApiError(0, NETWORK_ERROR);
    }
  }

  async function loadMe(): Promise<Me> {
    const response = await send('/me', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw await toApiError(response);
    return meSchema.parse(await response.json());
  }

  async function startSession(tokens: SessionBody) {
    const mine = ++epoch;
    accessToken = tokens.accessToken;
    selection = null;
    const me = await loadMe();
    if (mine !== epoch) return;
    const language = languageOf(me.user.interfaceLanguage);
    writeLanguageCookie(language);
    store.set({
      status: 'signed-in',
      email: me.user.email,
      studioId: me.studio.id,
      studioName: me.studio.name,
      language,
      sections: me.sections,
      studios: me.studios,
    });
  }

  function endSession(reason?: 'expired') {
    epoch += 1;
    accessToken = null;
    selection = null;
    store.set(
      reason ? { status: 'signed-out', reason } : { status: 'signed-out' },
    );
  }

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

  function refresh(): Promise<void> {
    refreshing ??= (async () => {
      const started = epoch;
      try {
        const tokens = await authCall(
          '/auth/refresh',
          { method: 'POST', headers: REQUESTED_WITH },
          sessionBodySchema,
        );
        if (started !== epoch) return;
        await startSession(tokens);
      } catch (error) {
        if (started !== epoch) return;
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
    selection: () => selection,
    request,

    initSession(): Promise<void> {
      initializing ??= refresh().catch(() => undefined);
      return initializing;
    },

    auth: {
      requestCode(email: string): Promise<CodeResponse> {
        return authCall('/auth/code', jsonPost({ email }), codeResponseSchema);
      },

      /** `signed-in` opens the studio. `select` opens the studio list. */
      async signIn(
        email: string,
        code: string,
      ): Promise<'signed-in' | 'select'> {
        const body = await authCall(
          '/auth/sign-in',
          jsonPost({ email, code }),
          signInResponseSchema,
        );
        if (body.result === 'signed-in') {
          await startSession(body);
          return 'signed-in';
        }
        selection = { ticket: body.selectionTicket, studios: body.studios };
        store.set({ status: 'signed-out' });
        return 'select';
      },

      async selectStudio(studioId: string): Promise<void> {
        const ticket = selection?.ticket;
        if (!ticket) throw new ApiError(400, 'INVALID_SELECTION_TICKET');
        try {
          await startSession(
            await authCall(
              '/auth/select-studio',
              jsonPost({ selectionTicket: ticket, studioId }),
              sessionBodySchema,
            ),
          );
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.code === 'INVALID_SELECTION_TICKET'
          ) {
            selection = null;
          }
          throw error;
        }
      },

      async exchangeHandoff(code: string): Promise<void> {
        const existing = handoffs.get(code);
        if (existing) return existing;
        const job = (async () => {
          const response = await send('/auth/impersonation/exchange', {
            method: 'POST',
            credentials: 'include',
            headers: {
              ...REQUESTED_WITH,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });
          if (!response.ok) throw await toApiError(response);
          await startSession(sessionBodySchema.parse(await response.json()));
        })();
        handoffs.set(code, job);
        return job;
      },

      async switchStudio(studioId: string): Promise<void> {
        const response = await send('/auth/switch-studio', {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...REQUESTED_WITH,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ studioId }),
        });
        if (!response.ok) throw await toApiError(response);
        await startSession(sessionBodySchema.parse(await response.json()));
      },

      async setLanguage(language: Lang): Promise<void> {
        const response = await send('/me/language', {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ language }),
        });
        if (!response.ok) throw await toApiError(response);
        writeLanguageCookie(language);
        const current = store.get();
        if (current.status === 'signed-in') {
          store.set({ ...current, language });
        }
      },

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
