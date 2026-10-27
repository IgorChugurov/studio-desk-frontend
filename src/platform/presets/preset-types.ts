import { z } from 'zod';
import {
  CONFLICT_MODES,
  RESOURCE_ROLES,
  SETTLEMENT_MODES,
} from '../../shared/organization-config';

const labelPair = z.object({ singular: z.string(), plural: z.string() });

export const presetResourceTypeSchema = z.object({
  key: z.string(),
  role: z.enum(RESOURCE_ROLES),
  labels: z.object({ en: labelPair, sk: labelPair, uk: labelPair }),
  geography: z.boolean(),
  duration: z.boolean(),
  showcase: z.boolean(),
  person: z.boolean(),
  skills: z.boolean(),
  required: z.boolean(),
  multiple: z.boolean(),
  conflictMode: z.enum(CONFLICT_MODES),
});

export const presetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sections: z.array(z.string()),
  catalogConfig: z.object({
    resourceTypes: z.array(presetResourceTypeSchema),
  }),
  scheduleConfig: z.object({
    audienceEnabled: z.boolean(),
    formatEnabled: z.boolean(),
    statuses: z.array(z.string()),
  }),
  billingConfig: z.object({
    settlementMode: z.enum(SETTLEMENT_MODES),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Preset = z.infer<typeof presetSchema>;

export const presetsPageSchema = z.object({
  items: z.array(presetSchema),
  meta: z.object({
    currentPage: z.number(),
    perPage: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type PresetsPage = z.infer<typeof presetsPageSchema>;
