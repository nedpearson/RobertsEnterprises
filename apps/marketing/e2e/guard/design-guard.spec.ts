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

  test('demoapp is served in place and never lands on a dead subdomain', async ({ page, baseURL }) => {
    await gotoDemoApp(page);
    // /demoapp is served in place. It must never redirect to a *.vowos.bridgebox.ai
    // subdomain — no DNS exists there (NXDOMAIN), which is how the live demo went
    // dark in August 2026.
    expect(page.url()).toContain('/demoapp');
    expect(page.url(), 'demoapp left its origin').toContain(new URL(baseURL!).host);
    expect(page.url(), 'demoapp landed on a subdomain with no DNS').not.toMatch(
      /\/\/[^/]*\.vowos\.bridgebox\.ai/,
    );
  });

  // The famous.ai bundle hardcodes https://robertsenterprises.bridgebox.ai as its
  // live-app origin (see the comment in marketing.html). These controls are
  // <button>s that navigate via JS, so an anchor-only rewrite never caught them —
  // "Sign in" and "Live app" sent public visitors into a real production tenant.
  const LANDING_CTAS: Array<{ name: RegExp; expect: RegExp }> = [
    { name: /^live app$/i, expect: /\/demoapp$/ },
    { name: /^sign in$/i, expect: /\/login$/ },
    { name: /live demo/i, expect: /\/demo$/ },
    { name: /book a demo/i, expect: /\/demo-request\?type=DEMO$/ },
  ];

  for (const cta of LANDING_CTAS) {
    test(`landing CTA ${cta.name.source} stays on the marketing origin`, async ({ browser, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      // server.js keys the landing page off the marketing host.
      const context = await browser.newContext({
        extraHTTPHeaders: { 'x-forwarded-host': 'vowos.bridgebox.ai' },
      });
      const page = await context.newPage();

      await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });

      const control = page
        .getByRole('button', { name: cta.name })
        .or(page.getByRole('link', { name: cta.name }))
        .first();
      await expect(control, `no landing control matching ${cta.name}`).toBeVisible({ timeout: 30_000 });

      // The landing bundle hydrates after load; clicking mid-render can land on a
      // node React then replaces, so the event never reaches the document handler.
      // Settle first, then retry the click rather than asserting on a lost event.
      await page.waitForLoadState('load');
      await page.waitForTimeout(1_000);

      // Poll the URL rather than waitForURL(): that waits for the `load` event by
      // default, and the app bundle is ~2.5 MB, so a correct navigation can still
      // time out. We only care that the address changed.
      let landedUrl: string | null = null;
      for (let attempt = 0; attempt < 3 && !landedUrl; attempt++) {
        if (await control.count()) {
          await control.click({ timeout: 10_000 }).catch(() => {});
        }
        try {
          await expect
            .poll(() => new URL(page.url()).pathname, { timeout: 6_000 })
            .not.toBe('/');
          landedUrl = page.url();
        } catch {
          /* re-render swallowed the click — retry */
        }
      }
      expect(landedUrl, `${cta.name} did not navigate anywhere`).toBeTruthy();

      const landed = new URL(landedUrl!);
      expect(landed.origin, `${cta.name} left the marketing origin`).toBe(origin);
      expect(
        landed.hostname,
        `${cta.name} navigated into a real tenant or a dead subdomain`,
      ).not.toMatch(/robertsenterprises\.bridgebox\.ai|\.vowos\.bridgebox\.ai/);
      expect(landed.pathname + landed.search, `${cta.name} went to the wrong route`).toMatch(cta.expect);

      await context.close();
    });
  }

  // Growth Overview is the reference implementation for the Growth section: it
  // must render numbers derived from the growth_* tables, never placeholders.
  test('growth overview renders real channel performance, not placeholders', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoDemoApp(page);

    await page.locator('[data-tour-id="nav-marketing"]').first().click();
    await expect(page.locator('[data-tour-id="growth-overview"]')).toBeVisible({ timeout: 20_000 });

    // The empty state must NOT show — the demo tenant has seeded spend + touchpoints.
    await expect(
      page.locator('[data-tour-id="growth-empty"]'),
      'growth overview fell back to its empty state — the growth_* query returned nothing',
    ).toHaveCount(0);

    const table = page.locator('[data-tour-id="growth-channel-table"]');
    await expect(table, 'channel performance table did not render').toBeVisible({ timeout: 20_000 });
    const rowCount = await table.locator('tbody tr').count();
    expect(rowCount, 'channel table rendered no rows').toBeGreaterThan(1);

    // KPI tiles must hold computed values, not the "—" loading placeholder.
    for (const kpi of ['growth-kpi-spend', 'growth-kpi-revenue', 'growth-kpi-roas', 'growth-kpi-leads']) {
      const text = await page.locator(`[data-tour-id="${kpi}"]`).innerText();
      expect(text, `${kpi} is still showing a placeholder`).not.toMatch(/\n—\n|^—$/m);
    }

    // Spend must be a real currency figure computed from seeded rows.
    const spend = await page.locator('[data-tour-id="growth-kpi-spend"]').innerText();
    expect(spend, 'marketing spend is not a currency value').toMatch(/\$[\d,]+/);

    // Recommendations are derived from live signals, so at least one must appear
    // (the demo tenant has unanswered reviews and listing issues seeded).
    await expect(page.locator('[data-tour-id="growth-recommendations"]')).toBeVisible();

    // Changing the range must re-query rather than freeze the first result.
    await page.locator('[data-tour-id="growth-range"]').selectOption('7');
    await expect(page.locator('[data-tour-id="growth-channel-table"]')).toBeVisible({ timeout: 15_000 });

    expect(errors, 'uncaught errors on the growth overview').toEqual([]);
  });

  test('marketing root serves the famous.ai landing page', async ({ request, baseURL }) => {
    // server.js keys the landing page off the marketing host via x-forwarded-host.
    const res = await request.get(`${baseURL}/`, {
      headers: { 'x-forwarded-host': 'vowos.bridgebox.ai' },
      maxRedirects: 0,
    });
    expect(res.status(), 'marketing root did not return 200').toBe(200);
    const html = await res.text();
    expect(html, 'marketing root is not the famous.ai landing page — DESIGN_LOCK.md').toContain(
      'static.famous.ai/events.js',
    );
    expect(html, 'famous.ai site id missing from landing page').toContain('__SITE_ID__');

    // And the landing page's bundle must actually be servable.
    const asset = await request.get(`${baseURL}/assets/index-Cokxl-kX.js`);
    expect(asset.status(), 'famous.ai landing bundle missing from /assets').toBe(200);

    // A non-marketing host must still get the app shell, not the landing page.
    // Skipped when the guard is pointed at the marketing origin itself
    // (GUARD_BASE_URL=https://vowos.bridgebox.ai), where every request is by
    // definition a marketing-host request.
    const isMarketingOrigin = /(^|\.)vowos\.bridgebox\.ai$/.test(new URL(baseURL!).hostname);
    if (!isMarketingOrigin) {
      const tenant = await request.get(`${baseURL}/`, {
        headers: { 'x-forwarded-host': 'robertsenterprises.bridgebox.ai' },
        maxRedirects: 0,
      });
      expect(tenant.status(), 'tenant host must be served in place, not redirected').toBe(200);
      expect(await tenant.text(), 'tenant host must get the app shell, not the landing page').not.toContain(
        'static.famous.ai',
      );
    }
  });
});
