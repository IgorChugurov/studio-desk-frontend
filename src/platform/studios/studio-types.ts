import { z } from 'zod';

/**
 * The OpenAPI document of the platform API does not describe response bodies
 * yet, so the studio answers are checked here by their shape from
 * `api-contract.md`. Replace with generated types when the backend documents
 * its responses.
 */
export const studioStatusSchema = z.enum(['active', 'deactivated']);
export type StudioStatus = z.infer<typeof studioStatusSchema>;

export const studioListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  customDomain: z.string().nullable(),
  owner: z.object({ email: z.string() }),
  status: studioStatusSchema,
  createdAt: z.string(),
});
export type StudioListItem = z.infer<typeof studioListItemSchema>;

export const studiosPageSchema = z.object({
  items: z.array(studioListItemSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type StudiosPage = z.infer<typeof studiosPageSchema>;
