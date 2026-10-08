import type { NextConfig } from 'next';

function localBackendOrigin(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/platform';
  const origin = configured.replace(/\/api\/platform\/?$/, '');
  if (
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1')
  ) {
    return origin;
  }
  return null;
}

const nextConfig: NextConfig = {
  // Minimal server for the Docker image (see Dockerfile).
  output: 'standalone',
  async rewrites() {
    const origin = localBackendOrigin();
    if (!origin) return [];
    return [
      {
        source: '/api/studio/:path*',
        destination: `${origin}/api/studio/:path*`,
      },
    ];
  },
};

export default nextConfig;
