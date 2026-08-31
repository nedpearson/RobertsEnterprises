import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  FailureCategory,
  ClassifiedFailure,
  CircuitState,
  CircuitScope,
  CircuitStatus,
  IntegrationHealthStatus,
  AuthState,
  RepairResult,
  ReconciliationReport,
  RecoveryActionType,
  RecoveryTrigger,
  DLQEventStatus,
  GoogleDriveWatchStatus,
  SyncCursorStatus,
  ProviderConnectionRow,
  CircuitBreakerRow,
  SyncCursorRow,
  RecoveryTimelineRow,
  DLQEventRow,
  GoogleDriveWatchRow,
} from '../types';

test('FailureCategory covers all canonical error classes', () => {
  const categories: FailureCategory[] = [
    'AUTH_REVOKED',
    'AUTH_EXPIRED',
    'RATE_LIMITED',
    'WEBHOOK_MISSING',
    'WEBHOOK_MISCONFIGURED',
    'SCHEMA_DRIFT',
    'PROVIDER_OUTAGE',
    'RESOURCE_NOT_FOUND',
    'TRANSIENT_5XX',
    'NETWORK_ERROR',
    'UNKNOWN',
  ];
  assert.equal(categories.length, 11);
});

test('CircuitState covers CLOSED, OPEN, and HALF_OPEN', () => {
  const states: CircuitState[] = ['CLOSED', 'OPEN', 'HALF_OPEN'];
  assert.equal(states.length, 3);
});

test('CircuitScope covers GLOBAL, ACCOUNT, and TENANT', () => {
  const scopes: CircuitScope[] = ['GLOBAL', 'ACCOUNT', 'TENANT'];
  assert.equal(scopes.length, 3);
});

test('IntegrationHealthStatus covers all 4 standard states', () => {
  const healthStatuses: IntegrationHealthStatus[] = [
    'HEALTHY',
    'RECOVERING',
    'ACTION_REQUIRED',
    'DEGRADED',
  ];
  assert.equal(healthStatuses.length, 4);
});

test('ClassifiedFailure contract validates correctly', () => {
  const failure: ClassifiedFailure = {
    category: 'AUTH_REVOKED',
    provider: 'shopify',
    businessId: 'biz-123',
    statusCode: 401,
    retryAfterSeconds: 0,
    isAutoRepairable: false,
    rootCause: 'OAuth access token revoked by user in Shopify admin',
    suggestedAction: 'Request customer reauthorization via OAuth connect flow',
  };

  assert.equal(failure.category, 'AUTH_REVOKED');
  assert.equal(failure.provider, 'shopify');
  assert.equal(failure.isAutoRepairable, false);
});

test('CircuitStatus contract validates correctly', () => {
  const status: CircuitStatus = {
    state: 'OPEN',
    consecutiveFailures: 5,
    isProviderOutage: true,
    cooldownExpiresAt: new Date(Date.now() + 60000).toISOString(),
    allowExecution: false,
  };

  assert.equal(status.state, 'OPEN');
  assert.equal(status.isProviderOutage, true);
  assert.equal(status.allowExecution, false);
});

test('RepairResult contract validates correctly', () => {
  const result: RepairResult = {
    success: true,
    actionTaken: 'WEBHOOK_RECREATED',
    reconciledCount: 14,
    status: 'HEALTHY',
  };

  assert.equal(result.success, true);
  assert.equal(result.status, 'HEALTHY');
  assert.equal(result.reconciledCount, 14);
});

test('ReconciliationReport contract validates correctly', () => {
  const report: ReconciliationReport = {
    connectionId: 'conn-abc',
    provider: 'shopify',
    resourceType: 'orders',
    startCursor: '2026-08-20T00:00:00Z',
    newCursor: '2026-08-21T00:00:00Z',
    recordsIngested: 42,
    recordsSkippedDuplicates: 5,
    durationMs: 340,
    success: true,
  };

  assert.equal(report.recordsIngested, 42);
  assert.equal(report.recordsSkippedDuplicates, 5);
  assert.equal(report.success, true);
});
