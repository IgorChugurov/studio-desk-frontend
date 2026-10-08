import { z } from 'zod';

export const codeResponseSchema = z.object({
  codeExpiresIn: z.number(),
  resendAvailableIn: z.number(),
});
export type CodeResponse = z.infer<typeof codeResponseSchema>;

const studioRefSchema = z.object({ id: z.string(), name: z.string() });

export const sessionBodySchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number(),
  user: z.object({ email: z.string() }),
  studio: studioRefSchema,
});
export type SessionBody = z.infer<typeof sessionBodySchema>;

export const signInResponseSchema = z.discriminatedUnion('result', [
  sessionBodySchema.extend({ result: z.literal('signed-in') }),
  z.object({
    result: z.literal('studio-selection'),
    selectionTicket: z.string(),
    selectionTicketExpiresIn: z.number(),
    studios: z.array(studioRefSchema),
  }),
]);
export type SignInResponse = z.infer<typeof signInResponseSchema>;

export interface StudioRef {
  id: string;
  name: string;
}

export const meSchema = z.object({
  user: z.object({
    email: z.string(),
    interfaceLanguage: z.enum(['en', 'sk', 'uk']).nullable(),
  }),
  studio: studioRefSchema,
  role: z.string(),
  sections: z.array(z.string()),
  impersonated: z.boolean(),
  studios: z.array(studioRefSchema),
});
export type Me = z.infer<typeof meSchema>;
