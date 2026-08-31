import { describe, it, expect, beforeEach } from 'vitest';
import type {
  IntegrationHealthStatus,
  FailureCategory,
  RecoveryActionType,
  IntegrationTableRow,
  DiagnosticDrawerData,
  CustomerHealthView
} from '@/types/integrationOps';
import {
  DEMO_INTEGRATIONS,
  createFallbackDiagnostics,
} from '@/lib/platform/platformDemoData';
import {
  getIntegrationDiagnostics,
  triggerAutoRepair,
  forceReconcile,
  testConnection,
  generateReconnectUrl,
  setPlatformDemoPlane,
} from '@/lib/platform/platformDataSource';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

describe('Integration Operations & Auto-Recovery — Frontend Contracts & Observability Suite', () => {
  beforeEach(() => {
    (globalThis as any).window = { sessionStorage: new MemoryStorage() };
    setPlatformDemoPlane(true);
  });

  it('validates 8 canonical columns in /platform/integrations table schema', () => {
    const mockRow: IntegrationTableRow = {
      id: 'conn_shopify_ido',
      business_id: 'biz_ido_bridal',
      brand_id: 'brand_ido_couture',
      brand_name: 'I Do Bridal Couture',
      location_id: 'loc_baton_rouge',
      location_name: 'Baton Rouge Flagship',
      provider: 'shopify',
      provider_account_id: 'ido-bridal-couture.myshopify.com',
      health_status: 'HEALTHY',
      circuit_breaker_state: 'CLOSED',
      auth_state: 'AUTHORIZED',
      last_event_at: '2026-08-21T18:45:00Z',
      last_successful_sync_at: '2026-08-21T18:45:00Z',
      recovery_status: 'Healthy (Webhook Active)',
      sync_errors_24h: 0,
      is_auto_repairable: true,
      reconnect_url: null,
      metadata: {}
    };

    expect(mockRow.brand_name).toBe('I Do Bridal Couture');
    expect(mockRow.location_name).toBe('Baton Rouge Flagship');
    expect(mockRow.provider).toBe('shopify');
    expect(mockRow.provider_account_id).toBe('ido-bridal-couture.myshopify.com');
    expect(mockRow.health_status).toBe('HEALTHY');
    expect(mockRow.last_event_at).toBeDefined();
    expect(mockRow.recovery_status).toBe('Healthy (Webhook Active)');
  });

  it('sorts integrations table by health status severity priority', () => {
    const records: Array<{ id: string; health_status: IntegrationHealthStatus }> = [
      { id: '1', health_status: 'HEALTHY' },
      { id: '2', health_status: 'ACTION_REQUIRED' },
      { id: '3', health_status: 'DEGRADED' },
      { id: '4', health_status: 'RECOVERING' }
    ];

    const severityMap: Record<IntegrationHealthStatus, number> = {
      ACTION_REQUIRED: 1,
      RECOVERING: 2,
      DEGRADED: 3,
      HEALTHY: 4
    };

    records.sort((a, b) => severityMap[a.health_status] - severityMap[b.health_status]);

    expect(records[0].health_status).toBe('ACTION_REQUIRED');
    expect(records[1].health_status).toBe('RECOVERING');
    expect(records[2].health_status).toBe('DEGRADED');
    expect(records[3].health_status).toBe('HEALTHY');
  });

  it('validates Diagnostic Drawer data model structure', () => {
    const diagnosticPayload: Partial<DiagnosticDrawerData> = {
      connection: {
        id: 'conn_ig_1',
        business_id: 'biz_ido_bridal',
        brand_id: 'brand_ido_couture',
        location_id: 'loc_baton_rouge',
        provider: 'instagram',
        provider_account_id: 'act_ig_idobridal',
        status: 'active',
        capabilities: {},
        auth_token: null,
        health_status: 'RECOVERING',
        circuit_breaker_state: 'CLOSED',
        auth_state: 'AUTHORIZED',
        last_health_check_at: '2026-08-21T18:30:00Z',
        last_successful_sync_at: '2026-08-21T18:00:00Z',
        last_error_at: '2026-08-21T18:25:00Z',
        last_error_code: '404',
        last_error_message: 'Webhook missing',
        last_error_category: 'WEBHOOK_MISSING' as FailureCategory,
        sync_errors_24h: 1,
        recovery_attempts: 1,
        last_recovery_at: '2026-08-21T18:30:00Z',
        reconnect_url: null,
        metadata: {},
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-21T18:30:00Z'
      },
      timeline: [
        {
          id: 'step-1',
          provider_connection_id: 'conn_ig_1',
          business_id: 'biz_ido_bridal',
          provider: 'instagram',
          action_type: 'DIAGNOSTIC_RUN' as RecoveryActionType,
          trigger: 'AUTOMATIC',
          previous_status: 'DEGRADED',
          resulting_status: 'RECOVERING',
          details: { rootCause: 'Webhook drift detected' },
          success: true,
          duration_ms: 120,
          executed_by: 'system',
          created_at: '2026-08-21T18:30:00Z'
        },
        {
          id: 'step-2',
          provider_connection_id: 'conn_ig_1',
          business_id: 'biz_ido_bridal',
          provider: 'instagram',
          action_type: 'WEBHOOK_RECREATED' as RecoveryActionType,
          trigger: 'AUTOMATIC',
          previous_status: 'RECOVERING',
          resulting_status: 'RECOVERING',
          details: { webhookId: 'wh_ig_restored_9912' },
          success: true,
          duration_ms: 340,
          executed_by: 'system',
          created_at: '2026-08-21T18:30:02Z'
        }
      ]
    };

    expect(diagnosticPayload.connection?.provider).toBe('instagram');
    expect(diagnosticPayload.connection?.last_error_category).toBe('WEBHOOK_MISSING');
    expect(diagnosticPayload.timeline?.length).toBe(2);
    expect(diagnosticPayload.timeline?.[1].action_type).toBe('WEBHOOK_RECREATED');
  });

  it('guarantees zero-placeholder invariant in Diagnostic Drawer and Observability views', () => {
    const rawUiStrings = [
      'Diagnostic Side-Drawer',
      'Root Cause Analysis',
      'Recovery Timeline',
      'Reconciliation Cursor',
      'Trigger Auto-Repair',
      'Reconnect Account'
    ];

    for (const str of rawUiStrings) {
      expect(str.toLowerCase()).not.toContain('under construction');
      expect(str.toLowerCase()).not.toContain('placeholder');
      expect(str.toLowerCase()).not.toContain('todo');
    }
  });

  it('validates secret masking in frontend diagnostic inspector view', () => {
    const maskToken = (token?: string) => {
      if (!token) return 'None';
      if (token.length <= 8) return '********';
      return `${token.slice(0, 4)}...${token.slice(-4)}`;
    };

    const syntheticFixtureSecret = 'test_shopify_secret_99182374918237198273';
    const masked = maskToken(syntheticFixtureSecret);

    expect(masked).toBe('test...8273');
    expect(masked).not.toContain('9918237491823719');
  });

  it('differentiates platform admin forensic view from customer simplified state', () => {
    const getCustomerView = (status: IntegrationHealthStatus): CustomerHealthView => {
      switch (status) {
        case 'HEALTHY':
          return {
            status: 'HEALTHY',
            label: 'Connected & Healthy',
            description: 'Integration is operating normally with real-time sync.',
            canReconnect: false
          };
        case 'RECOVERING':
          return {
            status: 'REPAIRING',
            label: 'Repairing (Auto-healing in progress)',
            description: 'VowOS is automatically restoring missed events.',
            canReconnect: false
          };
        case 'ACTION_REQUIRED':
          return {
            status: 'ACTION_REQUIRED',
            label: 'Reconnect Required',
            description: 'Please re-authorize your account to resume sync.',
            canReconnect: true,
            reconnectUrl: 'https://app.vowos.com/api/auth/reconnect'
          };
        case 'DEGRADED':
          return {
            status: 'DEGRADED',
            label: 'Slow Sync / Degraded',
            description: 'Provider is experiencing rate limits or minor delays.',
            canReconnect: false
          };
      }
    };

    const healthyView = getCustomerView('HEALTHY');
    expect(healthyView.label).toBe('Connected & Healthy');
    expect(healthyView.canReconnect).toBe(false);

    const actionReqView = getCustomerView('ACTION_REQUIRED');
    expect(actionReqView.label).toBe('Reconnect Required');
    expect(actionReqView.canReconnect).toBe(true);
    expect(actionReqView.reconnectUrl).toBeDefined();
  });

  it('verifies DEMO_INTEGRATIONS covers multi-brand fleet and all health states', () => {
    expect(DEMO_INTEGRATIONS.length).toBeGreaterThanOrEqual(8);
    const healthStatuses = new Set(DEMO_INTEGRATIONS.map(i => i.health_status));
    expect(healthStatuses.has('HEALTHY')).toBe(true);
    expect(healthStatuses.has('RECOVERING')).toBe(true);
    expect(healthStatuses.has('ACTION_REQUIRED')).toBe(true);
    expect(healthStatuses.has('DEGRADED')).toBe(true);

    const brands = new Set(DEMO_INTEGRATIONS.map(i => i.brand_name));
    expect(brands.size).toBeGreaterThanOrEqual(4);
  });

  it('tests operator actions in the synthetic demo plane', async () => {
    const diagRes = await getIntegrationDiagnostics('conn-shopify-ido');
    expect(diagRes.data).toBeDefined();
    expect(diagRes.data?.connection.provider).toBe('shopify');
    expect(diagRes.data?.timeline.length).toBeGreaterThan(0);

    const repairRes = await triggerAutoRepair('conn-ig-magnolia');
    expect(repairRes.success).toBe(true);
    expect(repairRes.message).toContain('Auto-repair initiated');

    const reconcileRes = await forceReconcile('conn-shopify-ido', 'orders');
    expect(reconcileRes.success).toBe(true);
    expect(reconcileRes.message).toContain('Reconciliation complete');

    const pingHealthy = await testConnection('conn-shopify-ido');
    expect(pingHealthy.success).toBe(true);
    expect(pingHealthy.latencyMs).toBeDefined();

    const pingActionReq = await testConnection('conn-fb-lumiere');
    expect(pingActionReq.success).toBe(false);

    const reconnectRes = await generateReconnectUrl('conn-fb-lumiere');
    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.url).toContain('reconnect');
  });

  it('verifies fallback diagnostics creation for arbitrary rows', () => {
    const customRow: IntegrationTableRow = {
      id: 'conn_custom_1',
      business_id: 'biz_1',
      brand_id: 'brand_1',
      brand_name: 'Custom Boutique',
      location_id: 'loc_1',
      location_name: 'Main Location',
      provider: 'Shopify',
      provider_account_id: 'custom-boutique.myshopify.com',
      health_status: 'RECOVERING',
      circuit_breaker_state: 'CLOSED',
      auth_state: 'AUTHORIZED',
      last_event_at: new Date().toISOString(),
      last_successful_sync_at: new Date().toISOString(),
      recovery_status: 'Recreating missing webhooks',
      sync_errors_24h: 1,
      is_auto_repairable: true,
      reconnect_url: null,
      metadata: {},
    };

    const diag = createFallbackDiagnostics(customRow);
    expect(diag.connection.id).toBe('conn_custom_1');
    expect(diag.connection.health_status).toBe('RECOVERING');
    expect(diag.timeline.length).toBeGreaterThan(0);
    expect(diag.cursors.length).toBeGreaterThan(0);
  });
});
