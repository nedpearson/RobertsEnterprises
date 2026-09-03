import { describe, expect, it } from 'vitest';
import { mergeBusinessHeader, shouldAttachBusinessHeader } from './tenantScopedFetch';

const ORIGIN = 'https://robertsenterprises.bridgebox.ai';
const API_ORIGIN = 'https://api.robertsenterprises.bridgebox.ai';

describe('tenantScopedFetch', () => {
  it('attaches tenant context to same-origin tenant APIs', () => {
    expect(shouldAttachBusinessHeader('/api/shopify/connect?shop=idobridalcouture', ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/shopify/setup/status', ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/growth/connections', ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader(`${ORIGIN}/api/growth/sync`, ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/organization/structure', ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader('/api/scheduling/requests?archiveScope=active', ORIGIN, API_ORIGIN)).toBe(true);
  });

  it('attaches tenant context to the exact configured production API origin', () => {
    expect(
      shouldAttachBusinessHeader(
        `${API_ORIGIN}/api/shopify/connect?shop=idobridalcouture.myshopify.com`,
        ORIGIN,
        API_ORIGIN,
      ),
    ).toBe(true);
    expect(shouldAttachBusinessHeader(`${API_ORIGIN}/api/growth/connections`, ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader(`${API_ORIGIN}/api/organization/structure`, ORIGIN, API_ORIGIN)).toBe(true);
    expect(shouldAttachBusinessHeader(`${API_ORIGIN}/api/scheduling/requests-summary`, ORIGIN, API_ORIGIN)).toBe(true);
  });

  it('does not attach tenant context to unrelated or lookalike paths', () => {
    expect(shouldAttachBusinessHeader('/api/shopifyish/connect', ORIGIN, API_ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/growth-hack', ORIGIN, API_ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/organizational-chart', ORIGIN, API_ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/scheduling-report', ORIGIN, API_ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('/api/health', ORIGIN, API_ORIGIN)).toBe(false);
  });

  it('never leaks tenant context to third-party or lookalike origins', () => {
    expect(
      shouldAttachBusinessHeader(
        'https://idobridalcouture.myshopify.com/admin/oauth/authorize?client_id=abc',
        ORIGIN,
        API_ORIGIN,
      ),
    ).toBe(false);
    expect(shouldAttachBusinessHeader('https://graph.facebook.com/v23.0/me', ORIGIN, API_ORIGIN)).toBe(false);
    expect(shouldAttachBusinessHeader('https://api.robertsenterprises.bridgebox.ai.evil.example/api/shopify/connect', ORIGIN, API_ORIGIN)).toBe(false);
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
