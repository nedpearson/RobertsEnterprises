import { defineConfig, devices } from '@playwright/test';

/**
 * Design-guard config — deliberately separate from playwright.config.ts.
 *
 * playwright.config.ts targets apps/web + apps/api dev servers. This one boots the
 * real Railway runtime (`node start-selector.js` -> worker :8082 + apps/marketing
 * server.js :8080) against the built bundle, and needs no credentials because it
 * drives the /demoapp synthetic-data sandbox.
 *
 * Prereqs when run locally: `npm run build` and `npm run build --workspace worker`.
 */
const PORT = process.env.GUARD_PORT ?? '8080';

export default defineConfig({
  testDir: './apps/marketing/e2e/guard',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 90_000,
  use: {
    baseURL: process.env.GUARD_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    // Escape hatch for runners that already ship a Chromium.
    launchOptions: process.env.GUARD_CHROMIUM_PATH
      ? { executablePath: process.env.GUARD_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.GUARD_BASE_URL
    ? undefined
    : {
        command: 'node start-selector.js',
        url: `http://localhost:${PORT}/api/tenant-config`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          PORT,
          // The guard never touches a real project; tenant-config only needs to be
          // present so the frontend can bootstrap into the demo data plane.
          VITE_SUPABASE_URL: (process.env.VITE_SUPABASE_URL || 'https://demo.invalid'),
          VITE_SUPABASE_ANON_KEY: (process.env.VITE_SUPABASE_ANON_KEY || 'ci-placeholder-anon-key'),
        },
      },
});

