import next from 'eslint-config-next';

/** @type {import("eslint").Linter.Config[]} */
const baseConfig = [
  ...next,

  // Strict TypeScript & quality rules
  {
    rules: {
      'no-console': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Allow console.error in route handlers (for structured error logging)
  {
    files: ['**/api/**/route.ts'],
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
];

export default baseConfig;