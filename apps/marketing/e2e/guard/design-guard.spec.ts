import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * DESIGN GUARD — see DESIGN_LOCK.md at the repo root.
 *
 * Runs against the real Railway runtime: `node start-selector.js` boots the API
 * worker on :8082 and `apps/marketing/server.js` on :8080, exactly as production
 * does. That means this exercises the Express host, the `/api` proxy, the
 * `/api/tenant-config` bootstrap and the built bundle — not just a dev server.
 *
 * Entry point is `/demoapp/`, the anonymous synthetic-data sandbox. No credentials
 * and no live Supabase are required, so this is safe to make blocking on every PR.
 *
 * Complements, does not duplicate, the existing gates:
 *   - certify.yml  -> lint + typecheck + vitest + build   (does the code compile?)
 *   - post-deploy-smoke.yml -> curl route checks AFTER deploy (did it 200?)
 *   - this guard    -> does the dashboard actually still RENDER, pre-merge?
 */

// Must render on the demo dashboard. Keep in sync with DESIGN_LOCK.md.
const DASHBOARD_LANDMARKS = [
  'hero-banner',
  'stat-revenue',
  'stat-outstanding',
  'stat-brides',
  'stat-gowns',
  'chart-revenue',
  'grid-delivery-watch',
  'list-upcoming-appts',
] as const;

// Must render in the app chrome.
const CHROME_LANDMARKS = [
  'header-location-select',
  'header-search-brides',
  'header-notifications',
] as const;

// Minimum sidebar surface. Fewer than this means navigation regressed.
const MIN_NAV_ITEMS = 15;

const IGNORED_ERROR_PATTERNS = [
  /net::ERR_/i,
  /Failed to load resource/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /demo\.invalid/i,
  /Download the React DevTools/i,
];

const isIgnorable = (text: string) => IGNORED_ERROR_PATTERNS.some((re) => re.test(text));

function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    const text = `pageerror: ${err.message}`;
    if (!isIgnorable(text)) errors.push(text);
  });
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = `console: ${msg.text()}`;
    if (!isIgnorable(text)) errors.push(text);
  });
  return errors;
}

async function gotoDemoApp(page: Page) {
  await page.goto('/demoapp/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('[data-tour-id="hero-banner"]'),
    'demo app never reached the dashboard — check /api/tenant-config and the /demoapp route',
  ).toBeVisible({ timeout: 45_000 });
}

test.describe('design guard', () => {
  test('demo dashboard renders every locked landmark', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoDemoApp(page);

    for (const id of [...DASHBOARD_LANDMARKS, ...CHROME_LANDMARKS]) {
      await expect(
        page.locator(`[data-tour-id="${id}"]`).first(),
        `missing landmark data-tour-id="${id}" — see DESIGN_LOCK.md`,
      ).toBeVisible();
    }

    const navCount = await page.locator('[data-tour-id^="nav-"]').count();
    expect(navCount, `sidebar shrank to ${navCount} items (expected >= ${MIN_NAV_ITEMS})`).toBeGreaterThanOrEqual(
      MIN_NAV_ITEMS,
    );

    expect(errors, 'uncaught errors while rendering the demo dashboard').toEqual([]);
  });

  test('all four KPI drilldowns open and close without unmounting the dashboard', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoDemoApp(page);

    for (const kpi of ['stat-revenue', 'stat-outstanding', 'stat-brides', 'stat-gowns']) {
      await page.locator(`[data-tour-id="${kpi}"]`).first().click();

      const closeButton = page.getByRole('button', { name: 'Close' }).first();
      await expect(closeButton, `drilldown modal did not open for ${kpi}`).toBeVisible({ timeout: 10_000 });

      await closeButton.click();
      await expect(
        page.getByRole('button', { name: 'Close' }),
        `drilldown modal did not close for ${kpi}`,
      ).toHaveCount(0);

      // The dashboard tree must survive the modal round-trip.
      await expect(page.locator('[data-tour-id="hero-banner"]')).toBeVisible();
    }

    expect(errors, 'uncaught errors while exercising KPI drilldowns').toEqual([]);
  });

  test('sidebar click-walk does not throw on any reachable view', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoDemoApp(page);

    const navItems = page.locator('[data-tour-id^="nav-"]');
    const ids = (await navItems.evaluateAll((els) => els.map((el) => el.getAttribute('data-tour-id')))).filter(
      (id): id is string => Boolean(id),
    );

    const visited: string[] = [];
    for (const id of ids) {
      const item = page.locator(`[data-tour-id="${id}"]`).first();
      if (!(await item.isVisible().catch(() => false))) continue;
      await item.click();
      // Something must render — an empty <main> means the view blew up silently.
      await expect(page.locator('main, [role="main"]').first(), `${id} rendered an empty main`).not.toBeEmpty();
      visited.push(id);
      await page.waitForTimeout(150);
    }

    expect(visited.length, 'no sidebar items were clickable').toBeGreaterThan(5);
    expect(errors, `uncaught errors while walking sidebar (${visited.join(', ')})`).toEqual([]);
  });

  test('demoapp stays on the local origin and never leaks to a real tenant', async ({ page }) => {
    await gotoDemoApp(page);
    // Guards the server.js local-host exemption: /demoapp must not 301 away in dev/CI,
    // and the demo sandbox must not land on a production tenant host.
    expect(page.url()).toContain('/demoapp');
    expect(page.url()).not.toContain('bridgebox.ai');
  });
});
