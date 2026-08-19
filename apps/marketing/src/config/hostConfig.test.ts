import { describe, expect, it } from 'vitest';
import { isMarketingHost, resolveTenantSlugFromHost } from './hostConfig';

describe('VowOS host routing', () => {
  it('recognizes the platform/marketing host', () => {
    expect(isMarketingHost('vowos.bridgebox.ai')).toBe(true);
    expect(resolveTenantSlugFromHost('vowos.bridgebox.ai')).toBeNull();
  });

  it('resolves canonical nested tenant domains', () => {
    expect(resolveTenantSlugFromHost('robertsenterprises.vowos.bridgebox.ai')).toBe('robertsenterprises');
    expect(resolveTenantSlugFromHost('magnoliabridal.vowos.bridgebox.ai')).toBe('magnoliabridal');
  });

  it('resolves legacy tenant hosts without treating vowos as part of the slug', () => {
    expect(resolveTenantSlugFromHost('robertsenterprises.vowos.bridgebox.ai')).toBe('robertsenterprises');
  });

  it('reserves public demo namespaces so they can never become production tenant slugs', () => {
    expect(resolveTenantSlugFromHost('demo.vowos.bridgebox.ai')).toBeNull();
    expect(resolveTenantSlugFromHost('demoapp.vowos.bridgebox.ai')).toBeNull();
  });

  it('does not invent a browser tenant slug for arbitrary custom domains', () => {
    expect(resolveTenantSlugFromHost('example.com')).toBeNull();
  });
});
