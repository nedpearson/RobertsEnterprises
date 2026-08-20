import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PART G GUARDRAIL.
 *
 * No wildcard DNS exists for *.vowos.bridgebox.ai or *.bridgebox.ai. Any code
 * that builds a URL from a tenant slug produces a hostname that resolves
 * NXDOMAIN, which is how every organization created in the onboarding wizard
 * dead-ended on "This site can't be reached".
 *
 * This test fails if source code interpolates a value into a bridgebox.ai host.
 * If per-tenant subdomains are ever genuinely wanted: create the wildcard DNS,
 * the wildcard TLS certificate and the Railway custom domain FIRST, verify
 * resolution, and only then delete this test.
 */
const SRC = join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'tests', 'demo']);
// Template-literal host construction: `${anything}.bridgebox.ai` / `${x}.${base}`
const SLUG_HOST = /\$\{[^}]+\}\s*\.\s*(?:\$\{[^}]*base[^}]*\}|bridgebox\.ai|vowos\.bridgebox\.ai)/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('Part G — no per-tenant subdomain URLs are emitted', () => {
  it('never builds a hostname from a tenant slug', () => {
    const offenders = walk(SRC)
      .filter((f) => SLUG_HOST.test(readFileSync(f, 'utf-8')))
      .map((f) => f.replace(SRC, 'src'));

    expect(offenders).toEqual([]);
  });

  it('routes tenants to a same-origin path', async () => {
    const { TENANT_WORKSPACE_PATH } = await import('@/config/hostConfig');
    expect(TENANT_WORKSPACE_PATH.startsWith('/')).toBe(true);
    expect(TENANT_WORKSPACE_PATH).not.toContain('.');
    // /app is 302'd to the demo sandbox by server.js — a real tenant must not land there.
    expect(TENANT_WORKSPACE_PATH).not.toBe('/app');
  });
});
