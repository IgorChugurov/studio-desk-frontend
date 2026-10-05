import { z } from 'zod';
import type { paths } from './schema';

/** Request bodies come from the generated OpenAPI types (`pnpm gen:api`). */
export type RequestCodeBody =
  paths['/api/platform/auth/code']['post']['requestBody']['content']['application/json'];
export type SignInBody =
  paths['/api/platform/auth/sign-in']['post']['requestBody']['content']['application/json'];

/**
 * The OpenAPI document of the platform API does not describe response bodies
 * yet (only a text description), so the auth responses are checked here by
 * their shape from `api-contract.md`. Replace with generated types when the
 * backend documents its responses.
 */
export const codeResponseSchema = z.object({
  codeExpiresIn: z.number(),
  resendAvailableIn: z.number(),
});
export type CodeResponse = z.infer<typeof codeResponseSchema>;

export const tokensResponseSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number(),
  user: z.object({ email: z.string() }),
});
export type TokensResponse = z.infer<typeof tokensResponseSchema>;
