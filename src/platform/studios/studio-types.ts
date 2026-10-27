import { z } from 'zod';

/**
 * The OpenAPI document of the platform API does not describe response bodies
 * yet, so the organization answers are checked here by their shape from
 * `api-contract.md`.
 */
export const organizationStatusSchema = z.enum(['active', 'deactivated']);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

const presetRefSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
});

export const organizationListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  preset: presetRefSchema,
  subdomain: z.string(),
  customDomain: z.string().nullable(),
  owner: z.object({ email: z.string() }),
  status: organizationStatusSchema,
  createdAt: z.string(),
});
export type OrganizationListItem = z.infer<typeof organizationListItemSchema>;

export const organizationsPageSchema = z.object({
  items: z.array(organizationListItemSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type OrganizationsPage = z.infer<typeof organizationsPageSchema>;

/** `GET /organizations/{id}`, and the answer of create and update. */
export const organizationSchema = organizationListItemSchema.extend({
  sections: z.array(z.string()),
  updatedAt: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

/** @deprecated Use organization names. Kept so older imports still type-check during the move. */
export const studioStatusSchema = organizationStatusSchema;
export type StudioStatus = OrganizationStatus;
export const studioListItemSchema = organizationListItemSchema;
export type StudioListItem = OrganizationListItem;
export const studiosPageSchema = organizationsPageSchema;
export type StudiosPage = OrganizationsPage;
export const studioSchema = organizationSchema;
export type Studio = Organization;
