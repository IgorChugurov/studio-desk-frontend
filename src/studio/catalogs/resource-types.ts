import { z } from 'zod';
import type { OrganizationConfig } from '../api/auth-types';

export type ResourceTypeConfig =
  OrganizationConfig['catalogConfig']['resourceTypes'][number];

export type InterfaceLanguage = 'en' | 'sk' | 'uk';

export const resourceFileSchema = z.object({
  id: z.string(),
  index: z.number(),
  kind: z.enum(['image', 'video']),
  contentType: z.string(),
  url: z.string(),
});
export type ResourceFile = z.infer<typeof resourceFileSchema>;

export const recordImagesSchema = z.object({
  images: z.array(resourceFileSchema),
});

export const resourceSchema = z.object({
  id: z.string(),
  resourceTypeId: z.string(),
  name: z.string(),
  type: z.enum(['ordinary', 'virtual']).nullable(),
  address: z.string().nullable(),
  timeZone: z.string().nullable(),
  defaultDuration: z.number().nullable(),
  description: z.string().nullable(),
  videoLink: z.string().nullable(),
  instagram: z.string().nullable(),
  tiktok: z.string().nullable(),
  relatedResourceIds: z.array(z.string()),
  images: z.array(resourceFileSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CatalogResource = z.infer<typeof resourceSchema>;

export const resourcePageSchema = z.object({
  items: z.array(resourceSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

export function sortedTypes(types: ResourceTypeConfig[]): ResourceTypeConfig[] {
  return [...types].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function typeLabel(
  type: ResourceTypeConfig,
  language: InterfaceLanguage,
  form: 'singular' | 'plural',
): string {
  return type.labels[language][form];
}

export function typePath(typeId: string): string {
  return `/catalogs/${typeId}`;
}

/** `{Singular} added` — the configured singular with a capital first letter. */
export function recordSentence(singular: string, action: 'added' | 'updated') {
  const label = singular
    ? singular.charAt(0).toUpperCase() + singular.slice(1)
    : singular;
  return `${label} ${action}`;
}
