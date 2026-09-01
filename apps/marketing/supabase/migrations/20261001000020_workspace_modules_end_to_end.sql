-- End-to-end persistence for Workspace Modules that previously exposed UI-only
-- or roster-only surfaces. This migration also closes the historical
-- business_id/organization_id compatibility gap in module preferences.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Canonical module preference tenant key synchronization
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_module_preference_tenant_keys()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL AND NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Module preference requires a business tenant';
  END IF;

  IF NEW.business_id IS NULL THEN
    NEW.business_id := NEW.organization_id;
  ELSIF NEW.organization_id IS NULL THEN
    NEW.organization_id := NEW.business_id;
  ELSIF NEW.business_id <> NEW.organization_id THEN
    RAISE EXCEPTION 'Module preference tenant keys must match';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_module_preference_tenant_keys
  ON public.organization_module_preferences;
CREATE TRIGGER trg_sync_module_preference_tenant_keys
BEFORE INSERT OR UPDATE ON public.organization_module_preferences
FOR EACH ROW EXECUTE FUNCTION public.sync_module_preference_tenant_keys();

UPDATE public.organization_module_preferences
SET organization_id = business_id
WHERE organization_id IS DISTINCT FROM business_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_module_preferences_business_module
  ON public.organization_module_preferences(business_id, module_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_preferences_org_module
  ON public.organization_module_preferences(organization_id, module_id);

-- ---------------------------------------------------------------------------
-- 2. Bride style profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  preferred_silhouettes text[] NOT NULL DEFAULT ARRAY[]::text[],
  favorite_designers text[] NOT NULL DEFAULT ARRAY[]::text[],
  aesthetics text[] NOT NULL DEFAULT ARRAY[]::text[],
  preferred_necklines text[] NOT NULL DEFAULT ARRAY[]::text[],
  preferred_colors text[] NOT NULL DEFAULT ARRAY[]::text[],
  disliked_styles text[] NOT NULL DEFAULT ARRAY[]::text[],
  budget_min_cents integer,
  budget_max_cents integer,
  inspiration_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_style_profiles_budget_order CHECK (
    budget_min_cents IS NULL OR budget_max_cents IS NULL OR budget_min_cents <= budget_max_cents
  ),
  CONSTRAINT customer_style_profiles_tenant_customer_unique UNIQUE (business_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_style_profiles_customer
  ON public.customer_style_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_style_profiles_business
  ON public.customer_style_profiles(business_id);

ALTER TABLE public.customer_style_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read customer style profiles" ON public.customer_style_profiles;
CREATE POLICY "Members can read customer style profiles"
ON public.customer_style_profiles FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

DROP POLICY IF EXISTS "Customer staff can insert style profiles" ON public.customer_style_profiles;
CREATE POLICY "Customer staff can insert style profiles"
ON public.customer_style_profiles FOR INSERT
WITH CHECK (
  public.is_super_admin() OR
  public.user_has_role(business_id, ARRAY['OWNER','STORE_MANAGER','BRIDAL_CONSULTANT'])
);

DROP POLICY IF EXISTS "Customer staff can update style profiles" ON public.customer_style_profiles;
CREATE POLICY "Customer staff can update style profiles"
ON public.customer_style_profiles FOR UPDATE
USING (
  public.is_super_admin() OR
  public.user_has_role(business_id, ARRAY['OWNER','STORE_MANAGER','BRIDAL_CONSULTANT'])
)
WITH CHECK (
  public.is_super_admin() OR
  public.user_has_role(business_id, ARRAY['OWNER','STORE_MANAGER','BRIDAL_CONSULTANT'])
);

DROP POLICY IF EXISTS "Managers can delete style profiles" ON public.customer_style_profiles;
CREATE POLICY "Managers can delete style profiles"
ON public.customer_style_profiles FOR DELETE
USING (public.is_super_admin() OR public.is_business_manager(business_id));

-- ---------------------------------------------------------------------------
-- 3. Customer portal operations metadata
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS portal_token_rotated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_customers_portal_status
  ON public.customers(business_id, portal_enabled);

-- ---------------------------------------------------------------------------
-- 4. Real layaway / payment plan domain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('LAYAWAY','PAYMENT_PLAN')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','COMPLETED','CANCELLED','DEFAULTED')),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  down_payment_cents integer NOT NULL DEFAULT 0 CHECK (down_payment_cents >= 0),
  installment_count integer NOT NULL CHECK (installment_count BETWEEN 1 AND 120),
  frequency text NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('WEEKLY','BIWEEKLY','MONTHLY','CUSTOM')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_plans_down_payment_lte_total CHECK (down_payment_cents <= total_cents)
);
CREATE INDEX IF NOT EXISTS idx_payment_plans_business_type
  ON public.payment_plans(business_id, plan_type, status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_customer
  ON public.payment_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_invoice
  ON public.payment_plans(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_plan_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  due_date date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  paid_cents integer NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIAL','PAID','WAIVED','OVERDUE')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_plan_installments_paid_lte_amount CHECK (paid_cents <= amount_cents),
  CONSTRAINT payment_plan_installments_sequence_unique UNIQUE (plan_id, sequence_no)
);
CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_due
  ON public.payment_plan_installments(business_id, due_date, status);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read payment plans" ON public.payment_plans;
CREATE POLICY "Members can read payment plans"
ON public.payment_plans FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers can manage payment plans" ON public.payment_plans;
CREATE POLICY "Managers can manage payment plans"
ON public.payment_plans FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP POLICY IF EXISTS "Members can read payment installments" ON public.payment_plan_installments;
CREATE POLICY "Members can read payment installments"
ON public.payment_plan_installments FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers can manage payment installments" ON public.payment_plan_installments;
CREATE POLICY "Managers can manage payment installments"
ON public.payment_plan_installments FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

-- ---------------------------------------------------------------------------
-- 5. Communications automation rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('APPOINTMENT_REMINDER','APPOINTMENT_FOLLOW_UP')),
  channel text NOT NULL CHECK (channel IN ('SMS','EMAIL')),
  timing_direction text NOT NULL CHECK (timing_direction IN ('BEFORE','AFTER')),
  offset_minutes integer NOT NULL CHECK (offset_minutes BETWEEN 0 AND 10080),
  template_subject text,
  template_body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_communication_automation_rules_active
  ON public.communication_automation_rules(business_id, enabled, rule_type);

CREATE TABLE IF NOT EXISTS public.communication_automation_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.communication_automation_rules(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','SKIPPED')),
  durable_job_id uuid REFERENCES public.durable_jobs(id) ON DELETE SET NULL,
  error_message text,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_automation_delivery_dedupe UNIQUE (rule_id, appointment_id)
);
CREATE INDEX IF NOT EXISTS idx_communication_automation_deliveries_business
  ON public.communication_automation_deliveries(business_id, status, scheduled_for);

ALTER TABLE public.communication_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_automation_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read communication automation rules" ON public.communication_automation_rules;
CREATE POLICY "Members can read communication automation rules"
ON public.communication_automation_rules FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers can manage communication automation rules" ON public.communication_automation_rules;
CREATE POLICY "Managers can manage communication automation rules"
ON public.communication_automation_rules FOR ALL
USING (public.is_super_admin() OR public.is_business_manager(business_id))
WITH CHECK (public.is_super_admin() OR public.is_business_manager(business_id));

DROP POLICY IF EXISTS "Members can read communication automation deliveries" ON public.communication_automation_deliveries;
CREATE POLICY "Members can read communication automation deliveries"
ON public.communication_automation_deliveries FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));

-- ---------------------------------------------------------------------------
-- 6. Timestamp maintenance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_style_profiles_touch ON public.customer_style_profiles;
CREATE TRIGGER trg_customer_style_profiles_touch
BEFORE UPDATE ON public.customer_style_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_payment_plans_touch ON public.payment_plans;
CREATE TRIGGER trg_payment_plans_touch
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_payment_plan_installments_touch ON public.payment_plan_installments;
CREATE TRIGGER trg_payment_plan_installments_touch
BEFORE UPDATE ON public.payment_plan_installments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_communication_automation_rules_touch ON public.communication_automation_rules;
CREATE TRIGGER trg_communication_automation_rules_touch
BEFORE UPDATE ON public.communication_automation_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMIT;
