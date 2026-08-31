import { describe, expect, it } from 'vitest';
import { WorkspaceRole } from '@/lib/auth/authorization';
import { resolveActiveMembership } from '@/lib/auth/membershipResolution';

const row = (businessId: string, role: string, status = 'ACTIVE') => ({
  business_id: businessId,
  role,
  status,
});

describe('resolveActiveMembership', () => {
  it('selects the explicitly preferred active authorized membership', () => {
    const result = resolveActiveMembership(
      [row('org-a', 'OWNER'), row('org-b', 'STORE_MANAGER')],
      'org-b',
    );

    expect(result.reason).toBe('SELECTED_PREFERRED');
    expect(result.membership?.business_id).toBe('org-b');
    expect(result.workspaceRole).toBe(WorkspaceRole.STORE_MANAGER);
  });

  it('does not fall through to another tenant when a persisted selection is stale or unauthorized', () => {
    const result = resolveActiveMembership(
      [row('org-a', 'OWNER')],
      'org-stale',
    );

    expect(result.reason).toBe('PREFERRED_NOT_AUTHORIZED');
    expect(result.membership).toBeNull();
    expect(result.workspaceRole).toBeNull();
  });

  it('selects the only active authorized membership when no preference exists', () => {
    const result = resolveActiveMembership(
      [row('org-a', 'OWNER'), row('org-b', 'STORE_MANAGER', 'SUSPENDED')],
      null,
    );

    expect(result.reason).toBe('SELECTED_ONLY_ACTIVE');
    expect(result.membership?.business_id).toBe('org-a');
    expect(result.workspaceRole).toBe(WorkspaceRole.OWNER);
  });

  it('fails closed when multiple active memberships exist and no tenant was explicitly selected', () => {
    const result = resolveActiveMembership(
      [row('org-a', 'OWNER'), row('org-b', 'STORE_MANAGER')],
      null,
    );

    expect(result.reason).toBe('MULTIPLE_ACTIVE_MEMBERSHIPS');
    expect(result.membership).toBeNull();
    expect(result.workspaceRole).toBeNull();
  });

  it('rejects inactive memberships and unknown roles rather than upgrading them', () => {
    const result = resolveActiveMembership(
      [
        row('org-a', 'HACKER'),
        row('org-b', 'EMPLOYEE', 'PENDING'),
        row('org-c', 'OWNER', 'SUSPENDED'),
      ],
      null,
    );

    expect(result.reason).toBe('NO_ACTIVE_AUTHORIZED_MEMBERSHIP');
    expect(result.membership).toBeNull();
    expect(result.workspaceRole).toBeNull();
  });

  it('preserves the canonical alterations role instead of collapsing it into a consultant', () => {
    const result = resolveActiveMembership(
      [row('org-a', 'SEAMSTRESS')],
      null,
    );

    expect(result.workspaceRole).toBe(WorkspaceRole.ALTERATIONS_SPECIALIST);
  });
});
