import { describe, expect, it } from 'vitest';
import { isTenantApiHost } from '../../domain-routing.js';

describe('tenant API host routing', () => {
  it('recognizes the Roberts Enterprises production API host', () => {
    expect(isTenantApiHost('api.robertsenterprises.bridgebox.ai')).toBe(true);
  });

  it('supports future tenant API subdomains without treating marketing hosts as APIs', () => {
    expect(isTenantApiHost('api.future-tenant.bridgebox.ai')).toBe(true);
    expect(isTenantApiHost('vowos.bridgebox.ai')).toBe(false);
    expect(isTenantApiHost('api.bridgebox.ai')).toBe(false);
    expect(isTenantApiHost('api.robertsenterprises.vowos.bridgebox.ai')).toBe(false);
  });

  it('normalizes case and rejects unrelated domains', () => {
    expect(isTenantApiHost('API.RobertsEnterprises.Bridgebox.AI')).toBe(true);
    expect(isTenantApiHost('api.robertsenterprises.example.com')).toBe(false);
    expect(isTenantApiHost('')).toBe(false);
  });
});
