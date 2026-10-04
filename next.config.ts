import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Minimal server for the Docker image (see Dockerfile).
  output: 'standalone',
};

export default nextConfig;
