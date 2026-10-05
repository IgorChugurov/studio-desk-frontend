import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_STUDIO_ADMIN_URL: z.url(),
});

/**
 * Settings the browser needs. Each variable is read by its full name,
 * because Next replaces `process.env.NEXT_PUBLIC_*` at build time.
 */
export function loadPublicEnv() {
  const { NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STUDIO_ADMIN_URL } =
    publicEnvSchema.parse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_STUDIO_ADMIN_URL: process.env.NEXT_PUBLIC_STUDIO_ADMIN_URL,
    });
  return {
    apiUrl: NEXT_PUBLIC_API_URL.replace(/\/+$/, ''),
    /** Page of the studio admin that receives the handoff code. */
    studioAdminUrl: NEXT_PUBLIC_STUDIO_ADMIN_URL,
  };
}
