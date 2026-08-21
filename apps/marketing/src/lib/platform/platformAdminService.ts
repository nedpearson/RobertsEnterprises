/**
 * Platform admin mutations — the write side of the control plane.
 *
 * Rule this module enforces: a success toast may exist ONLY downstream of an
 * authoritative mutation. Callers get the persisted row (or a thrown error) and
 * decide what to show; nothing here "succeeds" in the UI only.
 *
 * NOTE (§25 of the control-plane spec): these calls still run in the browser
 * under the caller's RLS-scoped session. That is acceptable for overrides and
 * audit inserts because RLS gates them; suspension / billing / session-revoke
 * class mutations must NOT be added here — they belong on server control-plane
 * endpoints once those are deployed.
 */
import { supabase } from '@/lib/supabase';

export type OverrideState = 'FORCED_ON' | 'FORCED_OFF' | 'NO_OVERRIDE';

export interface FeatureOverrideRow {
  id: string;
  business_id: string;
  feature_key: string;
  state: 'FORCED_ON' | 'FORCED_OFF';
  reason: string | null;
  changed_by: string | null;
  created_at: string;
}

async function writeAudit(entry: {
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string;
  userId: string | null;
}): Promise<void> {
  // Live audit_logs shape is the 20260727 one (entity_type/entity_id/action/
  // user_id/before_value/after_value/reason) — the 20260816 CREATE TABLE IF NOT
  // EXISTS was a no-op against it. An audit failure must not un-do the mutation,
  // but it must also not pass silently: surface it to the caller's catch.
  const { error } = await supabase.from('audit_logs').insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    user_id: entry.userId,
    before_value: entry.before ?? null,
    after_value: entry.after ?? null,
    reason: entry.reason,
  });
  if (error) throw new Error(`Change saved, but the audit entry failed: ${error.message}`);
}

/**
 * Persist a feature override for an organization, with a mandatory reason and
 * an audit entry. `NO_OVERRIDE` removes the row so plan entitlement resolution
 * takes back over. Returns the state now actually stored.
 *
 * The tenant runtime picks this up on its next entitlement load: AuthContext
 * selects organization_feature_overrides into subscription.overrides, which
 * EntitlementService.resolveEntitlement honours at highest priority.
 */
export async function setFeatureOverride(args: {
  businessId: string;
  featureKey: string;
  state: OverrideState;
  reason: string;
}): Promise<{ state: OverrideState; row: FeatureOverrideRow | null }> {
  const reason = args.reason.trim();
  if (!reason) throw new Error('A reason is required for every feature override.');

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;

  const { data: beforeRow } = await supabase
    .from('organization_feature_overrides')
    .select('*')
    .eq('business_id', args.businessId)
    .eq('feature_key', args.featureKey)
    .maybeSingle();

  if (args.state === 'NO_OVERRIDE') {
    const { error } = await supabase
      .from('organization_feature_overrides')
      .delete()
      .eq('business_id', args.businessId)
      .eq('feature_key', args.featureKey);
    if (error) throw new Error(`Failed to clear override: ${error.message}`);

    await writeAudit({
      action: 'ADMIN_FEATURE_OVERRIDE_CLEARED',
      entityType: 'organization_feature_override',
      entityId: args.businessId,
      before: beforeRow ?? null,
      after: null,
      reason,
      userId,
    });
    return { state: 'NO_OVERRIDE', row: null };
  }

  const { data: row, error } = await supabase
    .from('organization_feature_overrides')
    .upsert(
      {
        business_id: args.businessId,
        feature_key: args.featureKey,
        state: args.state,
        reason,
        changed_by: userId,
      },
      { onConflict: 'business_id,feature_key' },
    )
    .select()
    .single();
  if (error) throw new Error(`Failed to persist override: ${error.message}`);

  await writeAudit({
    action: 'ADMIN_FEATURE_OVERRIDE',
    entityType: 'organization_feature_override',
    entityId: args.businessId,
    before: beforeRow ?? null,
    after: row,
    reason,
    userId,
  });
  return { state: args.state, row: row as FeatureOverrideRow };
}
export async function updateOrganizationSubscription(args: {
  businessId: string;
  planId: string;
  status: string;
  accountType: string;
  effectivePriceCents: number;
  reason: string;
  expectedVersion: number | null;
}) {
  const { data, error } = await supabase.rpc('platform_update_subscription', {
    p_business_id: args.businessId,
    p_plan_id: args.planId,
    p_status: args.status,
    p_account_type: args.accountType,
    p_effective_price_cents: args.effectivePriceCents,
    p_reason: args.reason,
    p_expected_version: args.expectedVersion
  });

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
  return data;
}

export async function updateOrganizationCore(args: {
  businessId: string;
  name: string;
  slug: string | null;
  status: string;
  onboardingStatus: string;
  reason: string;
  expectedVersion: number | null;
}) {
  const { data, error } = await supabase.rpc('platform_update_organization_core', {
    p_business_id: args.businessId,
    p_name: args.name,
    p_slug: args.slug,
    p_status: args.status,
    p_onboarding_status: args.onboardingStatus,
    p_reason: args.reason,
    p_expected_version: args.expectedVersion
  });

  if (error) {
    throw new Error(`Failed to update organization: ${error.message}`);
  }
  return data;
}
