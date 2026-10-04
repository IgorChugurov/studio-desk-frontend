import { NextResponse, type NextRequest } from 'next/server';
import { loadHosts } from './shared/config/hosts';
import { surfaceForHost } from './shared/hosts/surface';

/**
 * Chooses the part of the application by the request host. Only the platform
 * admin is built so far; the studio admin and the public site answer 404.
 * Pages of a surface live under an internal prefix (`/platform`) that is not
 * reachable by its own address.
 */
export function proxy(request: NextRequest) {
  const surface = surfaceForHost(
    request.headers.get('host') ?? '',
    loadHosts(),
  );
  if (surface !== 'platform') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { pathname } = request.nextUrl;
  if (pathname === '/platform' || pathname.startsWith('/platform/')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/platform' : `/platform${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
