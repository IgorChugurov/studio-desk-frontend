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
    /**
     * Studio API, derived from the platform address so one setting switches
     * both. `http://localhost:3000/api/platform` becomes `…/api/studio`.
     */
    studioApiUrl: studioApiUrl(NEXT_PUBLIC_API_URL),
    /** Page of the studio admin that receives the handoff code. */
    studioAdminUrl: NEXT_PUBLIC_STUDIO_ADMIN_URL,
  };
}

/** The studio API lives next to the platform API, under `/api/studio`. */
export function studioApiUrl(platformApiUrl: string): string {
  const url = platformApiUrl.replace(/\/+$/, '');
  const suffix = '/api/platform';
  if (!url.endsWith(suffix)) {
    throw new Error(
      'NEXT_PUBLIC_API_URL must end with /api/platform so the studio API can be derived',
    );
  }
  const studio = `${url.slice(0, -suffix.length)}/api/studio`;
  // `app.localhost` and `localhost` are different sites. A session cookie set
  // by localhost is not kept for the studio page, so a reload looks signed
  // out. Locally the page calls its own address, and Next forwards it.
  if (
    studio.startsWith('http://localhost') ||
    studio.startsWith('http://127.0.0.1')
  ) {
    return '/api/studio';
  }
  return studio;
}
