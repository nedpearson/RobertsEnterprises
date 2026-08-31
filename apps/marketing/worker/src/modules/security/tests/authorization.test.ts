import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WorkspaceRole,
  canAccessModule,
  hasPermission,
  normalizeLegacyRole,
  validateScopeAccess,
} from '../../../lib/auth/authorization';

test('canonical RBAC fails closed for unknown roles', () => {
  assert.equal(normalizeLegacyRole('HACKER'), null);
  assert.equal(hasPermission('HACKER', 'appointments.read'), false);
  assert.equal(canAccessModule('HACKER', 'growth.core'), false);
});

test('module permissions resolve through the owning core workspace', () => {
  assert.equal(canAccessModule(WorkspaceRole.OWNER, 'growth.core'), true);
  assert.equal(canAccessModule(WorkspaceRole.STORE_MANAGER, 'growth.seo'), true);
  assert.equal(canAccessModule(WorkspaceRole.BRIDAL_CONSULTANT, 'growth.core'), false);
  assert.equal(canAccessModule(WorkspaceRole.ALTERATIONS_SPECIALIST, 'team.payroll'), false);
  assert.equal(canAccessModule(WorkspaceRole.ALTERATIONS_SPECIALIST, 'alterations.core'), true);
});

test('scope validation rejects target brand when caller has no brand scope', () => {
  assert.equal(validateScopeAccess(
    { organizationId: 'org-a', brandId: '', locationIds: ['loc-a'] },
    { organizationId: 'org-a', brandId: 'brand-a' },
  ), false);
});

test('scope validation requires every requested location to be authorized', () => {
  assert.equal(validateScopeAccess(
    { organizationId: 'org-a', brandId: 'brand-a', locationIds: ['loc-a'] },
    { organizationId: 'org-a', brandId: 'brand-a', locationIds: ['loc-a', 'loc-b'] },
  ), false);
});

test('ALL scope explicitly authorizes all brands and locations inside one organization', () => {
  assert.equal(validateScopeAccess(
    { organizationId: 'org-a', brandId: 'ALL', locationIds: ['ALL'] },
    { organizationId: 'org-a', brandId: 'brand-b', locationIds: ['loc-x', 'loc-y'] },
  ), true);
  assert.equal(validateScopeAccess(
    { organizationId: 'org-a', brandId: 'ALL', locationIds: ['ALL'] },
    { organizationId: 'org-b', brandId: 'brand-b', locationIds: ['loc-x'] },
  ), false);
});
