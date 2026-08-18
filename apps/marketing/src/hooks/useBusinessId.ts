/**
 * The current tenant's business_id.
 *
 * WHY THIS EXISTS: several catalog call sites hardcoded
 * 'b0000000-0000-0000-0000-000000000001' as the business id. Migration
 * 20260824000000_purge_demo_contamination.sql DELETED that business, so every
 * one of those queries filters on a tenant that no longer exists — vendor lists
 * come back permanently empty and inventory writes create orphaned rows against
 * a dead tenant. Worse, if that id were ever recreated, one tenant would be
 * reading and writing another's catalog.
 *
 * Resolve the tenant here, once, so no feature has to invent one again.
 */
import { useAuth } from '@/contexts/AuthContext';
import { getActiveDataPlane } from '@/lib/supabase';

/** Stable scope key for the anonymous /demoapp sandbox, which has no session. */
export const DEMO_BUSINESS_ID = 'demo-business';

export function useBusinessId(): string | null {
  const { tenant, session } = useAuth();
  if (tenant?.id) return tenant.id;
  if (getActiveDataPlane() === 'demo' || !session) return DEMO_BUSINESS_ID;
  return null;
}
