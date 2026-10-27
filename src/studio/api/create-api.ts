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
  type OrganizationRef,
} from './auth-types';
import { languageOf, writeLanguageCookie, type Lang } from '../i18n/language';
import { createSessionStore } from './session-store';

export interface ApiOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
}

const REQUESTED_WITH = { 'X-Requested-With': 'fetch' };

/** `/api/files/{id}` on the API host. Locally that host is this page. */
export function fileAddress(apiUrl: string, filePath: string): string {
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return `${new URL(apiUrl).origin}${filePath}`;
  }
  return filePath;
}

export interface Selection {
  ticket: string;
  organizations: OrganizationRef[];
}

/**
 * The client of the organization API. The access token lives in a variable.
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
      organizationId: me.organization.id,
      organizationName: me.organization.name,
      language,
      sections: me.sections,
      organizations: me.organizations,
      config: me.config,
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

  async function upload<T = unknown>(
    path: string,
    files: File[],
    repeated = false,
  ): Promise<T> {
    const body = new FormData();
    for (const file of files) body.append('files', file);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await send(path, { method: 'POST', headers, body });
    if (response.status === 401 && !repeated) {
      await refresh();
      return upload<T>(path, files, true);
    }
    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as T;
  }

  async function readFile(filePath: string, repeated = false): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await (fetchImpl ?? fetch)(fileAddress(apiUrl, filePath), {
      headers,
    });
    if (response.status === 401 && !repeated) {
      await refresh();
      return readFile(filePath, true);
    }
    if (!response.ok) throw await toApiError(response);
    return response.blob();
  }

  return {
    session: store,
    selection: () => selection,
    request,
    upload,
    readFile,

    initSession(): Promise<void> {
      initializing ??= refresh().catch(() => undefined);
      return initializing;
    },

    auth: {
      requestCode(email: string): Promise<CodeResponse> {
        return authCall('/auth/code', jsonPost({ email }), codeResponseSchema);
      },

      /** `signed-in` opens the organization. `select` opens the organization list. */
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
        selection = {
          ticket: body.selectionTicket,
          organizations: body.organizations,
        };
        store.set({ status: 'signed-out' });
        return 'select';
      },

      async selectOrganization(organizationId: string): Promise<void> {
        const ticket = selection?.ticket;
        if (!ticket) throw new ApiError(400, 'INVALID_SELECTION_TICKET');
        try {
          await startSession(
            await authCall(
              '/auth/select-organization',
              jsonPost({ selectionTicket: ticket, organizationId }),
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

      async switchOrganization(organizationId: string): Promise<void> {
        const response = await send('/auth/switch-organization', {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...REQUESTED_WITH,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ organizationId }),
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
