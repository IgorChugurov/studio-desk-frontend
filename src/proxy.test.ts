import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { proxy } from './proxy';

function requestTo(host: string, path: string) {
  return new NextRequest(`http://${host}${path}`, { headers: { host } });
}

describe('proxy', () => {
  beforeEach(() => {
    process.env.ADMIN_HOST = 'admin.localhost:3001';
    process.env.APP_HOST = 'app.localhost:3001';
  });

  it('shows the platform admin on its host', () => {
    const response = proxy(requestTo('admin.localhost:3001', '/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://admin.localhost:3001/platform',
    );
  });

  it('keeps the rest of the path under the internal prefix', () => {
    const response = proxy(requestTo('admin.localhost:3001', '/studios/new'));
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://admin.localhost:3001/platform/studios/new',
    );
  });

  it('does not open the internal prefix by its own address', () => {
    expect(proxy(requestTo('admin.localhost:3001', '/platform')).status).toBe(
      404,
    );
    expect(
      proxy(requestTo('admin.localhost:3001', '/platform/studios')).status,
    ).toBe(404);
  });

  it('shows the studio admin on its host', () => {
    const response = proxy(requestTo('app.localhost:3001', '/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://app.localhost:3001/studio',
    );
  });

  it('keeps a studio path under the studio prefix', () => {
    const response = proxy(requestTo('app.localhost:3001', '/sign-in'));
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://app.localhost:3001/studio/sign-in',
    );
  });

  it('does not open either internal prefix by its own address', () => {
    expect(proxy(requestTo('app.localhost:3001', '/studio')).status).toBe(404);
    expect(proxy(requestTo('app.localhost:3001', '/platform')).status).toBe(
      404,
    );
    expect(proxy(requestTo('admin.localhost:3001', '/studio')).status).toBe(
      404,
    );
  });

  it('leaves the local studio API path for the server to forward', () => {
    const response = proxy(
      requestTo('app.localhost:3001', '/api/studio/auth/refresh'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('answers 404 on any other host', () => {
    expect(proxy(requestTo('localhost:3001', '/')).status).toBe(404);
    expect(proxy(requestTo('yoga.example.com', '/platform')).status).toBe(404);
  });
});
