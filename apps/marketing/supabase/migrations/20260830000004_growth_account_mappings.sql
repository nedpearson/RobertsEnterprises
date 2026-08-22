-- 20260830000004_growth_account_mappings.sql
-- One OAuth authorization can expose multiple provider accounts/properties.
-- Keep the secret/token connection singular while mapping any number of external
-- accounts to the correct VowOS business/location.

CREATE TABLE IF NOT EXISTS public.growth_provider_account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.growth_provider_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_account_id text NOT NULL,
  display_name text,
  account_type text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_provider_account_mapping
  ON public.growth_provider_account_mappings (
    business_id,
    provider,
    external_account_id,
    COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX IF NOT EXISTS idx_growth_provider_account_mapping_connection
  ON public.growth_provider_account_mappings (connection_id, status, provider);
CREATE INDEX IF NOT EXISTS idx_growth_provider_account_mapping_location
  ON public.growth_provider_account_mappings (business_id, location_id, provider, status);

-- Null-safe uniqueness for business-wide configuration rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_market_profiles_scope
  ON public.growth_market_profiles (
    business_id,
    COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE UNIQUE INDEX IF NOT EXISTS uq_growth_budget_guardrails_scope
  ON public.growth_budget_guardrails (
    business_id,
    COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE public.growth_provider_account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Growth account mappings members can view" ON public.growth_provider_account_mappings;
CREATE POLICY "Growth account mappings members can view"
  ON public.growth_provider_account_mappings FOR SELECT
  USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));

DROP POLICY IF EXISTS "Growth account mappings managers can insert" ON public.growth_provider_account_mappings;
CREATE POLICY "Growth account mappings managers can insert"
  ON public.growth_provider_account_mappings FOR INSERT
  WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));

DROP POLICY IF EXISTS "Growth account mappings managers can update" ON public.growth_provider_account_mappings;
CREATE POLICY "Growth account mappings managers can update"
  ON public.growth_provider_account_mappings FOR UPDATE
  USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));

DROP POLICY IF EXISTS "Growth account mappings owners can delete" ON public.growth_provider_account_mappings;
CREATE POLICY "Growth account mappings owners can delete"
  ON public.growth_provider_account_mappings FOR DELETE
  USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN']));

DROP TRIGGER IF EXISTS trg_growth_provider_account_mappings_updated_at ON public.growth_provider_account_mappings;
CREATE TRIGGER trg_growth_provider_account_mappings_updated_at
  BEFORE UPDATE ON public.growth_provider_account_mappings
  FOR EACH ROW EXECUTE FUNCTION public.growth_touch_updated_at();
