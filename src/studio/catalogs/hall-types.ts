import { z } from 'zod';

export const hallFileSchema = z.object({
  id: z.string(),
  index: z.number(),
  kind: z.enum(['image', 'video']),
  contentType: z.string(),
  url: z.string(),
});

export const hallSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  description: z.string().nullable().nullish(),
  videoLink: z.string().nullable(),
  images: z.array(hallFileSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Hall = z.infer<typeof hallSchema>;
export type HallFile = Hall['images'][number];
export const recordImagesSchema = z.object({
  images: z.array(hallFileSchema),
});

export const hallPageSchema = z.object({
  items: z.array(hallSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
