import { describe, expect, it } from 'vitest';
import { surfaceForHost } from './surface';

const hosts = {
  admin: 'admin.studio-desk.axondigital.xyz',
  app: 'app.studio-desk.axondigital.xyz',
};

describe('surfaceForHost', () => {
  it('maps the admin host to the platform admin', () => {
    expect(surfaceForHost('admin.studio-desk.axondigital.xyz', hosts)).toBe(
      'platform',
    );
  });

  it('maps the app host to the studio admin', () => {
    expect(surfaceForHost('app.studio-desk.axondigital.xyz', hosts)).toBe(
      'studio',
    );
  });

  it('ignores the case of the host', () => {
    expect(surfaceForHost('ADMIN.Studio-Desk.axondigital.xyz', hosts)).toBe(
      'platform',
    );
  });

  it('treats a studio subdomain and a custom domain as the public site', () => {
    expect(surfaceForHost('yoga.studio-desk.axondigital.xyz', hosts)).toBe(
      'site',
    );
    expect(surfaceForHost('yogaspace.com', hosts)).toBe('site');
  });

  it('compares the port too', () => {
    const local = { admin: 'admin.localhost:3001', app: 'app.localhost:3001' };
    expect(surfaceForHost('admin.localhost:3001', local)).toBe('platform');
    expect(surfaceForHost('admin.localhost:4000', local)).toBe('site');
  });
});
