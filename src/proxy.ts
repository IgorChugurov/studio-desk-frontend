import { NextResponse, type NextRequest } from 'next/server';
import { loadHosts } from './shared/config/hosts';
import { surfaceForHost } from './shared/hosts/surface';

/**
 * Chooses the part of the application by the request host. The public site
 * answers 404. Pages of a surface live under an internal prefix (`/platform`
 * or `/studio`) that is not reachable by its own address.
 */
export function proxy(request: NextRequest) {
  const surface = surfaceForHost(
    request.headers.get('host') ?? '',
    loadHosts(),
  );
  if (surface === 'site') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { pathname } = request.nextUrl;
  // Local studio calls and public files go through this app so the browser
  // stays on the page's address. The server forwards them to the API.
  // Do not treat them as pages.
  if (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/files' ||
    pathname.startsWith('/files/')
  ) {
    return NextResponse.next();
  }

  const prefix = surface === 'platform' ? '/platform' : '/studio';
  if (
    pathname === '/platform' ||
    pathname.startsWith('/platform/') ||
    pathname === '/studio' ||
    pathname.startsWith('/studio/')
  ) {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? prefix : `${prefix}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
