import { z } from 'zod';

export const codeResponseSchema = z.object({
  codeExpiresIn: z.number(),
  resendAvailableIn: z.number(),
});
export type CodeResponse = z.infer<typeof codeResponseSchema>;

const organizationRefSchema = z.object({ id: z.string(), name: z.string() });

const labelPairSchema = z.object({
  singular: z.string(),
  plural: z.string(),
});

export const organizationConfigSchema = z.object({
  catalogConfig: z.object({
    resourceTypes: z.array(
      z.object({
        id: z.string(),
        sortOrder: z.number(),
        role: z.enum(['place', 'resource', 'offering']),
        labels: z.object({
          en: labelPairSchema,
          sk: labelPairSchema,
          uk: labelPairSchema,
        }),
        geography: z.boolean(),
        duration: z.boolean(),
        showcase: z.boolean(),
        person: z.boolean(),
        skills: z.boolean(),
        required: z.boolean(),
        multiple: z.boolean(),
        conflictMode: z.enum(['strict', 'warning', 'none']),
      }),
    ),
  }),
  scheduleConfig: z.object({
    audienceEnabled: z.boolean(),
    formatEnabled: z.boolean(),
    statuses: z.array(z.string()),
  }),
  billingConfig: z.object({
    settlementMode: z.enum(['subscription', 'direct_check', 'external_order']),
  }),
});
export type OrganizationConfig = z.infer<typeof organizationConfigSchema>;

export const sessionBodySchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number(),
  user: z.object({ email: z.string() }),
  organization: organizationRefSchema,
});
export type SessionBody = z.infer<typeof sessionBodySchema>;

export const signInResponseSchema = z.discriminatedUnion('result', [
  sessionBodySchema.extend({ result: z.literal('signed-in') }),
  z.object({
    result: z.literal('organization-selection'),
    selectionTicket: z.string(),
    selectionTicketExpiresIn: z.number(),
    organizations: z.array(organizationRefSchema),
  }),
]);
export type SignInResponse = z.infer<typeof signInResponseSchema>;

export interface OrganizationRef {
  id: string;
  name: string;
}

export const meSchema = z.object({
  user: z.object({
    email: z.string(),
    interfaceLanguage: z.enum(['en', 'sk', 'uk']).nullable(),
  }),
  organization: organizationRefSchema,
  role: z.string(),
  sections: z.array(z.string()),
  config: organizationConfigSchema,
  impersonated: z.boolean(),
  organizations: z.array(organizationRefSchema),
});
export type Me = z.infer<typeof meSchema>;
