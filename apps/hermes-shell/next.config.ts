import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  transpilePackages: [
    '@hermes/api',
    '@hermes/shared-auth',
    '@hermes/ui',
    '@hermes/tailwind-config',
  ],
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.GIT_COMMIT_HASH ?? 'dev',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;