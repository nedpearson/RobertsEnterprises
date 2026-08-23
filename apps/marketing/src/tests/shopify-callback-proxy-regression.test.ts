import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.js'), 'utf8');

describe('Shopify callback proxy regression', () => {
  it('does not consume worker redirects server-side', () => {
    expect(serverSource).toContain("redirect: 'manual'");
    expect(serverSource).toContain("req.path === '/shopify/callback'");
  });

  it('bounds worker callback execution and returns failures to integration settings', () => {
    expect(serverSource).toContain('AbortSignal.timeout(30_000)');
    expect(serverSource).toContain('shopify=failed');
    expect(serverSource).toContain('tenantUiHostFromApiHost');
  });
});
