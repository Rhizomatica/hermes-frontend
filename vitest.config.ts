import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@hermes/api': resolve(__dirname, 'packages/api/src'),
      '@hermes/shared-auth': resolve(__dirname, 'packages/shared-auth/src'),
      '@hermes/ui': resolve(__dirname, 'packages/ui/src'),
      '@hermes/tailwind-config': resolve(__dirname, 'packages/tailwind-config'),
      '@hermes/utils': resolve(__dirname, 'packages/utils/src'),
    },
  },
});