import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.Config[]} */
const baseConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Accessibility plugin
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'error',
    },
  },

  // Strict TypeScript & quality rules
  {
    rules: {
      // Forbidden patterns
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['process.env'],
              message:
                'Use config from @hermes/shared-auth, not process.env directly',
            },
          ],
        },
      ],

      // React performance
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-unstable-nested-components': 'error',

      // General quality
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
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

  // Allow dangerouslySetInnerHTML only for the theme flash prevention script
  {
    files: ['**/layout.tsx'],
    rules: {
      'react/no-danger': 'off',
    },
  },
];

export default baseConfig;