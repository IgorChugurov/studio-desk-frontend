import type { Hosts } from '../config/hosts';

export type Surface = 'platform' | 'studio' | 'site';

/**
 * Which part of the application a request host belongs to. The admin hosts
 * are named in the settings; any other host is a studio's public site.
 */
export function surfaceForHost(host: string, hosts: Hosts): Surface {
  const normalized = host.trim().toLowerCase();
  if (normalized === hosts.admin) return 'platform';
  if (normalized === hosts.app) return 'studio';
  return 'site';
}
