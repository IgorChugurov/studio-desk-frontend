import { z } from 'zod';

const apiVersionSchema = z.object({
  api: z.string(),
  version: z.string(),
});

export type ApiVersionInfo = z.infer<typeof apiVersionSchema>;

/** Calls `GET {apiUrl}/version` of the platform API. */
export async function fetchApiVersion(apiUrl: string): Promise<ApiVersionInfo> {
  const response = await fetch(`${apiUrl}/version`);
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return apiVersionSchema.parse(await response.json());
}
