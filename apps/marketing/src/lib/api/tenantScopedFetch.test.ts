import { describe, expect, it } from 'vitest';
import { mergeBusinessHeader, shouldAttachBusinessHeader } from './tenantScopedFetch';

const ORIGIN = 'https://vowos.bridgebox.ai';

describe('tenantScopedFetch', () => {
  it('attaches tenant context to same-origin Shopify and Growth APIs', () => {
    expect(shouldAttachBusinessHeader('/api/shopify/connect?shop=idobridalcouture', ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/shopify/setup/status', ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/growth/connections', ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader(`${ORIGIN}/api/growth/sync`, ORIGIN)).toBe(true);
  });

  it('does not attach tenant context to unrelated or lookalike paths', () => {
    expect(shouldAttachBusinessHeader('/api/shopifyish/connect', ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/growth-hack', ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/health', ORIGIN)).toBe(false);
  });

  it('never leaks tenant context to third-party origins', () => {
    expect(
      shouldAttachBusinessHeader(
        'https://idobridalcouture.myshopify.com/admin/oauth/authorize?client_id=abc',
        ORIGIN,
      ),
    ).toBe(false);
    expect(shouldAttachBusinessHeader('https://graph.facebook.com/v23.0/me', ORIGIN)).toBe(false);
  });

  it('merges headers without dropping authorization and adds the active business id', () => {
    const headers = mergeBusinessHeader(
      { Authorization: 'Bearer session-token' },
      { Accept: 'application/json' },
      'business-123',
    );

    expect(headers.get('Authorization')).toBe('Bearer session-token');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Business-Id')).toBe('business-123');
  });

  it('preserves an explicitly supplied business context', () => {
    const headers = mergeBusinessHeader(
      undefined,
      { 'X-Business-Id': 'explicit-business' },
      'active-business',
    );

    expect(headers.get('X-Business-Id')).toBe('explicit-business');
  });
});
