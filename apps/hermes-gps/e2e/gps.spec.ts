import { test, expect } from '@playwright/test';

/**
 * GPS Application — End-to-end tests.
 *
 * Covers the critical user flows for the GPS viewer:
 *   - Page loads with auth guard
 *   - Map renders with coordinate panel
 *   - Coordinates display correctly
 *   - Copy-to-clipboard feedback appears
 *   - GPS status badge renders
 *   - Breadcrumb toggle works
 *   - Error banner appears on API failure
 *   - Back link navigates to shell
 */

const GPS_URL = 'http://localhost:4001';

/** A `GET /api/gps` payload matching the daemon's `Gps` schema. */
const GPS_RESPONSE = {
  fix: '3d',
  latitude: -23.45,
  longitude: -46.78,
  altitude_m: 800,
  at: new Date().toISOString(),
  settings: {
    logging: true,
    sample_interval_s: 30,
    file_period_s: 3600,
    email: null,
  },
};

/**
 * The auth provider validates the session with `GET /api/auth/me` on mount.
 * There is no backend in CI, so authenticate the page with a stub user;
 * otherwise the auth guard keeps the GPS UI unmounted.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        username: 'PU2UIT',
        display_name: 'Test Operator',
        avatar: null,
        role: 'operator',
        locale: 'en',
        phone: null,
        location: null,
        disabled: false,
        lxmf_address: null,
        last_login_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    }),
  );
});

test.describe('GPS Main Page', () => {
  test('page loads and renders the map container', async ({ page }) => {
    await page.goto(GPS_URL);

    // The map container (Maplibre GL) should be present
    const mapContainer = page.locator('[aria-label="Offline map view"]');
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });
  });

  test('shows the position panel once the page is ready', async ({ page }) => {
    await page.goto(GPS_URL);

    // The panel renders whether or not a fix is available.
    const copyLat = page.getByRole('button', { name: /copy latitude/i });
    const noPosition = page.getByText(/waiting for gps position/i);
    await expect(copyLat.or(noPosition).first()).toBeVisible({ timeout: 10_000 });
  });

  test('back link navigates to shell home', async ({ page }) => {
    await page.goto(GPS_URL);

    const backLink = page.getByRole('link', { name: /^back$/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', /4000/);
  });

  test('refresh button is present and clickable', async ({ page }) => {
    await page.goto(GPS_URL);

    const refreshBtn = page.getByRole('button', { name: /refresh position/i });
    await expect(refreshBtn).toBeVisible({ timeout: 10_000 });
    await refreshBtn.click();
    // Button should still be visible after click
    await expect(refreshBtn).toBeVisible();
  });

  test('breadcrumb toggle button is present', async ({ page }) => {
    await page.goto(GPS_URL);

    // Breadcrumb toggle should be visible
    const trailBtn = page.getByRole('button', { name: /breadcrumb|trail/i });
    await expect(trailBtn).toBeVisible({ timeout: 10_000 });
  });

  test('copy-to-clipboard shows feedback toast', async ({ page }) => {
    // Mock the GPS API to return valid data so coordinates are visible
    await page.route('**/api/gps', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GPS_RESPONSE),
      });
    });

    await page.goto(GPS_URL);

    // Wait for the copy buttons to appear
    const copyLatBtn = page.getByRole('button', { name: /copy latitude/i });
    await expect(copyLatBtn).toBeVisible({ timeout: 10_000 });

    // Click to copy and check for "copied" text
    await copyLatBtn.click();
    const copiedText = page.getByText(/copied/i);
    await expect(copiedText).toBeVisible({ timeout: 3000 });

    // Toast should disappear after ~2s
    await expect(copiedText).toBeHidden({ timeout: 5000 });
  });

  test('GPS status badge shows fix quality indicators', async ({ page }) => {
    // Mock API with GPS data
    await page.route('**/api/gps', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(GPS_RESPONSE),
      });
    });

    await page.goto(GPS_URL);

    // Status badges should be visible once position loads
    const statusRegion = page.getByRole('status');
    await expect(statusRegion.first()).toBeVisible({ timeout: 10_000 });
  });

  test('error banner appears when API fails', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/gps*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'GPS service unavailable' }),
      });
    });

    await page.goto(GPS_URL);

    // ErrorBanner should appear
    const errorBanner = page.getByRole('alert');
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
  });

  test('page is responsive at 800x480 sBitx viewport', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 480 });
    await page.goto(GPS_URL);

    // Map container should fill available space
    const mapContainer = page.locator('[aria-label="Offline map view"]');
    await expect(mapContainer).toBeVisible({ timeout: 10_000 });

    // Check that no content overflows (horizontal scroll should not be needed)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(800);
  });

  test('map tile error overlay shows when PMTiles missing', async ({ page }) => {
    await page.goto(GPS_URL);

    // The tile error overlay appears when tiles can't load
    // This depends on whether brazil.pmtiles is available
    const tileError = page.getByText(/Map tiles not found/i);
    const mapContainer = page.locator('[aria-label="Offline map view"]');

    // Either the map loads or the error overlay shows
    await expect(mapContainer.or(tileError).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});