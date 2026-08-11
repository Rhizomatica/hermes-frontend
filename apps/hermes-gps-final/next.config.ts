import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self' ws://localhost:* http://localhost:*; " +
              "font-src 'self'; " +
              "manifest-src 'self'; " +
              "form-action 'self'; " +
              "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);