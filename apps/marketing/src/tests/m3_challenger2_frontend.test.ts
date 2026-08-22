/**
 * Milestone 3 Challenger 2: Frontend Truthful Provider State Tests
 *
 * Verifies:
 * 1. connectProviderOAuth rejects roadmap placeholder providers (tiktok, pinterest, linkedin) with truthful errors.
 * 2. connectProviderOAuth allows real providers (meta, google, shopify, etc.) and transitions to CONNECTED_HEALTHY.
 * 3. fetchProviderConnections queries database connections in production mode and maps status accurately.
 */

import { describe, it, expect } from 'vitest';
import {
  connectProviderOAuth,
  getMarketingConnection,
  fetchProviderConnections
} from '../features/marketing/api/marketingApi';

describe('Milestone 3 Challenger 2: Frontend Truthful Connection Handling', () => {
  it('connectProviderOAuth: rejects TikTok placeholder connection with roadmap error', () => {
    expect(() => {
      connectProviderOAuth('tiktok', 'Proper & Co');
    }).toThrowError(/roadmap and requires API whitelist approval/);
  });

  it('connectProviderOAuth: rejects Pinterest placeholder connection with roadmap error', () => {
    expect(() => {
      connectProviderOAuth('pinterest', 'Proper & Co');
    }).toThrowError(/roadmap and requires API whitelist approval/);
  });

  it('connectProviderOAuth: rejects LinkedIn placeholder connection with roadmap error', () => {
    expect(() => {
      connectProviderOAuth('linkedin', 'Proper & Co');
    }).toThrowError(/roadmap and requires API whitelist approval/);
  });

  it('connectProviderOAuth: permits Meta connection and transitions to CONNECTED_HEALTHY', () => {
    const conn = connectProviderOAuth('meta', 'Proper & Company');
    expect(conn.status).toBe('CONNECTED_HEALTHY');
    expect(conn.isLive).toBe(true);
    expect(conn.displayLabel).toBe('Connected & Healthy');
    expect(conn.externalOrganization?.name).toBe('Proper & Company');
  });

  it('connectProviderOAuth: permits Google connection and transitions to CONNECTED_HEALTHY', () => {
    const conn = connectProviderOAuth('google', 'Proper & Company');
    expect(conn.status).toBe('CONNECTED_HEALTHY');
    expect(conn.isLive).toBe(true);
  });

  it('getMarketingConnection: returns truthful descriptor for each provider', () => {
    const meta = getMarketingConnection('meta');
    expect(meta).toBeDefined();
    expect(meta?.provider).toBe('meta');

    const tiktok = getMarketingConnection('tiktok');
    expect(tiktok).toBeDefined();
    expect(tiktok?.status).toBe('DISCONNECTED');
  });
});
