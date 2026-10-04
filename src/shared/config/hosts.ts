import { z } from 'zod';

const hostsSchema = z.object({
  ADMIN_HOST: z.string().trim().min(1),
  APP_HOST: z.string().trim().min(1),
});

export type Hosts = { admin: string; app: string };

/**
 * Hosts of the admin surfaces, from the server environment. Stops with the
 * name of the failing setting if one is missing.
 */
export function loadHosts(env: NodeJS.ProcessEnv = process.env): Hosts {
  const result = hostsSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return {
    admin: result.data.ADMIN_HOST.toLowerCase(),
    app: result.data.APP_HOST.toLowerCase(),
  };
}
