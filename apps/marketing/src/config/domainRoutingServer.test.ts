import { describe, expect, it } from 'vitest';
import { isTenantApiHost, tenantUiHostFromApiHost } from '../../domain-routing.js';

describe('tenant API domain routing', () => {
  it('keeps the Roberts API hostname on the API service and derives the tenant UI host', () => {
    expect(isTenantApiHost('api.robertsenterprises.bridgebox.ai')).toBe(true);
    expect(tenantUiHostFromApiHost('api.robertsenterprises.bridgebox.ai')).toBe('robertsenterprises.bridgebox.ai');
  });

  it('does not derive redirect destinations from unrelated or malformed hosts', () => {
    expect(tenantUiHostFromApiHost('vowos.bridgebox.ai')).toBeNull();
    expect(tenantUiHostFromApiHost('api.bridgebox.ai')).toBeNull();
    expect(tenantUiHostFromApiHost('api.bad.example.com')).toBeNull();
    expect(tenantUiHostFromApiHost('api.evil.bridgebox.ai.attacker.test')).toBeNull();
  });
});
