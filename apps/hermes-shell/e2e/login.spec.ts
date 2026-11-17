import { test, expect } from '@playwright/test';

/**
 * hermes-shell — End-to-end smoke tests for the login page.
 *
 * These run without a backend: the auth probe fails, leaving the shell in the
 * unauthenticated state where the login form is rendered.
 */

test.describe('Login page', () => {
  test('renders the sign-in form with submit disabled', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled();
  });

  test('enables submit once both fields are filled', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username').fill('operator');
    await page.getByLabel('Password').fill('secret');

    await expect(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
  });
});
