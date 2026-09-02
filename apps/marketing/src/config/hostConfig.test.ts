import { describe, expect, it } from 'vitest';
import { canonicalizeBusinessId, isMarketingHost, resolveTenantSlugFromHost } from './hostConfig';

const ROBERTS_BUSINESS_ID = '82a5b426-78a2-47ba-896b-3146b1a99c53';

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

describe('business selection migration', () => {
  it('moves both retired Roberts child-business ids to the consolidated organization', () => {
    expect(canonicalizeBusinessId('65ad28de-3f86-428d-a5b6-9d89af3542fc')).toBe(ROBERTS_BUSINESS_ID);
    expect(canonicalizeBusinessId('81c291ed-e9a0-430c-ab8c-7ed2216a9c62')).toBe(ROBERTS_BUSINESS_ID);
  });

  it('leaves unrelated tenant ids untouched and preserves null', () => {
    expect(canonicalizeBusinessId('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
    expect(canonicalizeBusinessId(null)).toBeNull();
  });
});
