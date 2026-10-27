import { z } from 'zod';
import { getApi } from '../api/api';
import { organizationSchema, type Organization } from './studio-types';

const handoffSchema = z.object({ code: z.string(), expiresIn: z.number() });

/** `POST /organizations/{id}/activate` or `/deactivate`. */
export async function setStudioStatus(
  id: string,
  action: 'activate' | 'deactivate',
): Promise<Organization> {
  const body = await getApi().request<unknown>(
    `/organizations/${id}/${action}`,
    { method: 'POST' },
  );
  return organizationSchema.parse(body);
}

/** `POST /organizations/{id}/impersonate`; answers the one-time handoff code. */
export async function requestHandoffCode(id: string): Promise<string> {
  const body = await getApi().request<unknown>(
    `/organizations/${id}/impersonate`,
    { method: 'POST' },
  );
  return handoffSchema.parse(body).code;
}
