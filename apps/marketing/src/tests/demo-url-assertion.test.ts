import { describe, it, expect } from 'vitest';
import { isMarketingHost, resolveTenantSlugFromHost } from '@/config/hostConfig';

describe('Demo URL & Canonical Routing Assertions', () => {
  it('recognizes vowos.bridgebox.ai as the canonical marketing and demo host', () => {
    expect(isMarketingHost('vowos.bridgebox.ai')).toBe(true);
    expect(resolveTenantSlugFromHost('vowos.bridgebox.ai')).toBe(null);
  });

  it('rejects legacy and unauthorized demo subdomains as marketing hosts', () => {
    const legacyHosts = [
      'demo.vowos.bridgebox.ai',
      'robertsenterprises.bridgebox.ai',
      'famous.ai',
      'deploypad.app',
      'railway.app'
    ];

    for (const host of legacyHosts) {
      expect(isMarketingHost(host)).toBe(false);
    }
  });

  it('correctly resolves tenant slugs from non-marketing hosts', () => {
    expect(resolveTenantSlugFromHost('robertsenterprises.bridgebox.ai')).toBe('robertsenterprises');
    expect(resolveTenantSlugFromHost('demo.vowos.bridgebox.ai')).toBe('demo.vowos');
  });
});
