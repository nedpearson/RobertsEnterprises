import { normalizeLegacyRole, type WorkspaceRole } from './authorization';

export interface MembershipCandidate {
  business_id: string | null;
  role: string | null;
  status: string | null;
}

export type MembershipResolutionReason =
  | 'SELECTED_PREFERRED'
  | 'SELECTED_ONLY_ACTIVE'
  | 'NO_ACTIVE_AUTHORIZED_MEMBERSHIP'
  | 'PREFERRED_NOT_AUTHORIZED'
  | 'MULTIPLE_ACTIVE_MEMBERSHIPS';

export interface ResolvedActiveMembership {
  membership: MembershipCandidate | null;
  workspaceRole: WorkspaceRole | null;
  reason: MembershipResolutionReason;
}

function isActiveAuthorizedMembership(
  row: MembershipCandidate,
): row is MembershipCandidate & { business_id: string; role: string } {
  return (
    typeof row.business_id === 'string' &&
    row.business_id.trim().length > 0 &&
    String(row.status ?? '').trim().toUpperCase() === 'ACTIVE' &&
    normalizeLegacyRole(row.role) !== null
  );
}

/**
 * Resolve one tenant membership without ever using database row order as an
 * authorization decision.
 *
 * Rules:
 * - only ACTIVE memberships with a recognized canonical/legacy role qualify;
 * - an explicit persisted business selection must itself be authorized;
 * - without an explicit selection, exactly one active membership may be chosen;
 * - multiple memberships are ambiguous and therefore fail closed.
 */
export function resolveActiveMembership(
  rows: readonly MembershipCandidate[] | null | undefined,
  preferredBusinessId: string | null | undefined,
): ResolvedActiveMembership {
  const active = (rows ?? []).filter(isActiveAuthorizedMembership);
  const preferred = typeof preferredBusinessId === 'string' && preferredBusinessId.trim()
    ? preferredBusinessId.trim()
    : null;

  if (preferred) {
    const selected = active.find((row) => row.business_id === preferred) ?? null;
    if (!selected) {
      return {
        membership: null,
        workspaceRole: null,
        reason: 'PREFERRED_NOT_AUTHORIZED',
      };
    }

    return {
      membership: selected,
      workspaceRole: normalizeLegacyRole(selected.role),
      reason: 'SELECTED_PREFERRED',
    };
  }

  if (active.length === 1) {
    return {
      membership: active[0],
      workspaceRole: normalizeLegacyRole(active[0].role),
      reason: 'SELECTED_ONLY_ACTIVE',
    };
  }

  if (active.length === 0) {
    return {
      membership: null,
      workspaceRole: null,
      reason: 'NO_ACTIVE_AUTHORIZED_MEMBERSHIP',
    };
  }

  return {
    membership: null,
    workspaceRole: null,
    reason: 'MULTIPLE_ACTIVE_MEMBERSHIPS',
  };
}
