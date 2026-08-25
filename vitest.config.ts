import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    // Match Next.js' automatic JSX runtime so `'use client'` components and
    // test files can use JSX without importing React.
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    // Playwright E2E specs live under each app's e2e/ directory and are run by
    // Playwright's own runner, so exclude them from Vitest's test discovery.
    exclude: [...configDefaults.exclude, '**/e2e/**'],
  },
  resolve: {
    alias: {
      // `@/*` is app-specific: each app's tsconfig maps it to its own `src/`,
      // so a single global `@/` alias cannot point at more than one app. Map the
      // specific `@/*` imports exercised by unit tests to their real locations.
      '@/lib/gpsCache': resolve(__dirname, 'apps/hermes-gps-final/src/lib/gpsCache'),
      '@/components/InfoList': resolve(__dirname, 'apps/hermes-shell/src/components/InfoList'),
      // Shared workspace-package aliases.
      '@hermes/api': resolve(__dirname, 'packages/api/src'),
      '@hermes/shared-auth': resolve(__dirname, 'packages/shared-auth/src'),
      '@hermes/ui': resolve(__dirname, 'packages/ui/src'),
      '@hermes/tailwind-config': resolve(__dirname, 'packages/tailwind-config'),
      '@hermes/utils': resolve(__dirname, 'packages/utils/src'),
    },
  },
});