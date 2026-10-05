import { z } from 'zod';
import { getApi } from '../api/api';
import { studioSchema, type Studio } from './studio-types';

const handoffSchema = z.object({ code: z.string(), expiresIn: z.number() });

/** `POST /studios/{id}/activate` or `/deactivate`; answers the studio. */
export async function setStudioStatus(
  id: string,
  action: 'activate' | 'deactivate',
): Promise<Studio> {
  const body = await getApi().request<unknown>(`/studios/${id}/${action}`, {
    method: 'POST',
  });
  return studioSchema.parse(body);
}

/** `POST /studios/{id}/impersonate`; answers the one-time handoff code. */
export async function requestHandoffCode(id: string): Promise<string> {
  const body = await getApi().request<unknown>(`/studios/${id}/impersonate`, {
    method: 'POST',
  });
  return handoffSchema.parse(body).code;
}
