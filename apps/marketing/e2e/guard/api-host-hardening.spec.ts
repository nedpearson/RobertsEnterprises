import { test, expect } from '@playwright/test';

const API_HOST = 'api.robertsenterprises.bridgebox.ai';

/**
 * The production API hostname must behave like an API origin, never like the
 * Vite SPA. Security scanners routinely probe dotfiles and framework debug
 * paths; those requests must fail closed instead of receiving index.html with
 * HTTP 200.
 */
test.describe('tenant API host hardening', () => {
  test('rejects non-API and sensitive-looking paths instead of serving the SPA', async ({ request, baseURL }) => {
    for (const path of ['/.env', '/.env.local', '/.git/config', '/server-status', '/actuator/env', '/settings']) {
      const response = await request.get(`${baseURL}${path}`, {
        headers: { 'x-forwarded-host': API_HOST },
        maxRedirects: 0,
      });

      expect(response.status(), `${path} must fail closed on the tenant API host`).toBe(404);
      expect(response.headers()['content-type'] ?? '', `${path} must return JSON, not the SPA`).toContain('application/json');
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
      expect(await response.json()).toEqual({ error: 'Not found.' });
    }
  });

  test('keeps legitimate API and health routes reachable on the tenant API host', async ({ request, baseURL }) => {
    const health = await request.get(`${baseURL}/api/health`, {
      headers: { 'x-forwarded-host': API_HOST },
      maxRedirects: 0,
    });
    expect(health.status(), '/api/health must remain reachable').toBe(200);

    const unified = await request.get(`${baseURL}/healthz`, {
      headers: { 'x-forwarded-host': API_HOST },
      maxRedirects: 0,
    });
    expect(unified.status(), '/healthz must remain reachable').toBe(200);
  });
});
