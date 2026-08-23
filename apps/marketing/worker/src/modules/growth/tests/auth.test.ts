import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request } from 'express';
import { hasGrowthAccessRole, requestedBusinessId } from '../auth';

function request(parts: {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
} = {}): Request {
  return {
    headers: parts.headers ?? {},
    body: parts.body ?? {},
    query: parts.query ?? {},
  } as unknown as Request;
}

test('requestedBusinessId prioritizes the explicit tenant header for OAuth GET requests', () => {
  assert.equal(
    requestedBusinessId(request({
      headers: { 'x-business-id': 'business-header' },
      body: { businessId: 'business-body' },
      query: { businessId: 'business-query' },
    })),
    'business-header',
  );
});

test('requestedBusinessId preserves backward-compatible body and query context', () => {
  assert.equal(requestedBusinessId(request({ body: { businessId: 'business-body' } })), 'business-body');
  assert.equal(requestedBusinessId(request({ query: { businessId: 'business-query' } })), 'business-query');
  assert.equal(requestedBusinessId(request()), null);
});

test('requestedBusinessId trims tenant identifiers and ignores empty values', () => {
  assert.equal(
    requestedBusinessId(request({
      headers: { 'x-business-id': '   ' },
      query: { businessId: '  business-query  ' },
    })),
    'business-query',
  );
});

test('growth access roles remain case-insensitive and deny non-management roles', () => {
  assert.equal(hasGrowthAccessRole('Owner'), true);
  assert.equal(hasGrowthAccessRole(' manager '), true);
  assert.equal(hasGrowthAccessRole('ADMIN'), true);
  assert.equal(hasGrowthAccessRole('Stylist'), false);
});
