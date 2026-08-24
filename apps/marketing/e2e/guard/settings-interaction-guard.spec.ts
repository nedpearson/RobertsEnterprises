import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

const SETTINGS_TABS = [
  'organization',
  'locations',
  'subscriptions',
  'go-live',
  'payments',
  'sales',
  'alterations',
  'commission',
  'booking',
  'scheduling',
  'inventory',
  'purchasing',
  'transfers',
  'communications',
  'automations',
  'notifications',
  'documents',
  'modules',
  'integrations',
  'ai-models',
  'reporting',
  'security',
  'data',
  'audit',
  'system-health',
  'feature-flags',
] as const;

const IGNORED_ERROR_PATTERNS = [
  /net::ERR_/i,
  /Failed to load resource/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /demo\.invalid/i,
  /Download the React DevTools/i,
];

const UNSAFE_BUTTON_TEXT = /delete|deactivate|disconnect|revoke|remove|purge|archive|cancel subscription|manage billing|oauth|connect account|open external|download|export|import|upload|go live|launch now|reset all|factory reset/i;

const isIgnorable = (text: string) => IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text));

function watchForErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    const text = `pageerror: ${error.message}`;
    if (!isIgnorable(text)) errors.push(text);
  });
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const text = `console: ${message.text()}`;
    if (!isIgnorable(text)) errors.push(text);
  });
  return errors;
}

async function gotoSettings(page: Page) {
  await page.goto('/demoapp/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-tour-id="hero-banner"]')).toBeVisible({ timeout: 45_000 });

  const settingsNav = page.locator('[data-tour-id="nav-settings"]').first();
  await expect(settingsNav, 'Settings must be reachable from the main navigation').toBeVisible();
  await settingsNav.click();
  await expect(page.getByTestId('settings-navigation')).toBeVisible({ timeout: 15_000 });
}

async function dismissOpenDialog(page: Page) {
  const dialog = page.getByRole('dialog').last();
  if (!(await dialog.isVisible().catch(() => false))) return;

  for (const label of [/^cancel$/i, /^close$/i, /^done$/i, /^not now$/i, /^discard changes$/i]) {
    const button = dialog.getByRole('button', { name: label }).last();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }

  await page.keyboard.press('Escape');
}

async function selectSettingsTab(page: Page, tab: string) {
  const nav = page.getByTestId(`settings-tab-${tab}`);
  await expect(nav, `settings child ${tab} is not visible to the Owner persona`).toBeVisible();
  await nav.click();

  // The safe-control crawler intentionally edits fields/toggles. Production must
  // protect those changes when navigating away, so exercise the safeguard rather
  // than bypassing or disabling it. Discard only the synthetic e2e changes.
  const unsavedDialog = page.getByRole('dialog').filter({ hasText: /unsaved changes/i }).last();
  if (await unsavedDialog.isVisible().catch(() => false)) {
    const discard = unsavedDialog.getByRole('button', { name: /^discard changes$/i });
    await expect(discard, `[${tab}] unsaved-change safeguard did not expose Discard Changes`).toBeVisible();
    await discard.click();
  }

  await expect(nav).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(new RegExp(`[?&]tab=${tab}(?:&|$)`));
  return nav;
}

async function exerciseSafeButtons(page: Page, tab: string) {
  const panel = page.locator('[data-tour-id="card-settings-active"]');
  const buttons = panel.getByRole('button');
  const count = await buttons.count();
  let clicked = 0;

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;

    const label = ((await button.getAttribute('aria-label')) || (await button.innerText().catch(() => ''))).trim();
    if (UNSAFE_BUTTON_TEXT.test(label)) continue;

    const beforeUrl = page.url();
    await button.click({ timeout: 5_000 }).catch((error) => {
      throw new Error(`[${tab}] button "${label || `#${index}`}" could not be clicked: ${String(error)}`);
    });
    clicked += 1;

    // A settings control must never eject the user to a dead/foreign origin.
    expect(new URL(page.url()).origin, `[${tab}] button "${label}" left the VowOS origin`).toBe(new URL(beforeUrl).origin);
    await dismissOpenDialog(page);
  }

  return clicked;
}

test.describe.serial('settings interaction guard', () => {
  test('every owner-visible settings child renders and is addressable', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoSettings(page);

    const discovered = await page.locator('[data-settings-tab]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-settings-tab')).filter(Boolean),
    );

    expect(discovered.sort()).toEqual([...SETTINGS_TABS].sort());

    for (const tab of SETTINGS_TABS) {
      await selectSettingsTab(page, tab);

      const panel = page.locator('[data-tour-id="card-settings-active"]');
      await expect(panel, `${tab} rendered an empty settings panel`).not.toBeEmpty();
      await expect(panel.locator('h1,h2,h3,input,select,button').first(), `${tab} has no usable content`).toBeVisible();
    }

    expect(errors, `settings child render errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('safe controls across every settings child are physically clickable', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoSettings(page);

    const exercised: Record<string, number> = {};
    for (const tab of SETTINGS_TABS) {
      await selectSettingsTab(page, tab);
      exercised[tab] = await exerciseSafeButtons(page, tab);
    }

    const total = Object.values(exercised).reduce((sum, count) => sum + count, 0);
    expect(total, `No settings controls were exercised: ${JSON.stringify(exercised)}`).toBeGreaterThan(10);
    expect(errors, `settings interaction errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Purchasing Add Designer is an actionable control, not a dead button', async ({ page }) => {
    const errors = watchForErrors(page);
    await gotoSettings(page);
    await selectSettingsTab(page, 'purchasing');

    const addButton = page.getByTestId('add-designer-button');
    // Production requires an organization-bound canonical insert. Demo may show
    // an explicit context message until its in-memory catalog fixture is loaded,
    // but it must never render a dead/anonymous action.
    if (await addButton.isVisible().catch(() => false)) {
      await expect(addButton).toBeEnabled();
      await expect(page.getByTestId('vendor-name-input')).toBeVisible();
      await expect(page.getByTestId('vendor-email-input')).toBeVisible();
    } else {
      await expect(page.getByText(/active organization is required/i)).toBeVisible();
    }

    expect(errors, `Purchasing tab errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
