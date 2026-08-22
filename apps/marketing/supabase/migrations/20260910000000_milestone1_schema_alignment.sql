-- ============================================================================
-- 20260910000000_milestone1_schema_alignment.sql
-- Milestone 1: Database Schema Alignment & Mutation Persistence
-- ============================================================================

-- Ensure uuid-ossp or pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. RECREATE MISSING & DROPPED TABLES
-- ============================================================================

-- 1.1 time_entries (Staff timeclock tracking)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_open ON public.time_entries(staff_name) WHERE clock_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_business_date ON public.time_entries(business_id, clock_in);

-- 1.2 sales_goals (Boutique location sales targets)
CREATE TABLE IF NOT EXISTS public.sales_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    month TEXT NOT NULL, -- Format: 'YYYY-MM'
    goal_cents BIGINT NOT NULL DEFAULT 2500000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sales_goals_loc_month UNIQUE (location, month)
);
CREATE INDEX IF NOT EXISTS idx_sales_goals_business_month ON public.sales_goals(business_id, month);

-- 1.3 try_on_notes (Fit profile try-on records)
CREATE TABLE IF NOT EXISTS public.try_on_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    bride_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer TEXT,
    gown_name TEXT,
    designer TEXT,
    price_cents BIGINT DEFAULT 0,
    rating TEXT DEFAULT 'Liked',
    notes TEXT,
    stylist TEXT,
    tried_on DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_try_on_notes_bride ON public.try_on_notes(bride_id);
CREATE INDEX IF NOT EXISTS idx_try_on_notes_business ON public.try_on_notes(business_id);

-- 1.4 measurements (Fit profile customer body & gown measurements)
CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    bride_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer TEXT,
    taken_on DATE DEFAULT CURRENT_DATE,
    bust TEXT,
    waist TEXT,
    hips TEXT,
    hollow_to_hem TEXT,
    height TEXT,
    heel_height TEXT,
    street_size TEXT,
    gown_size TEXT,
    notes TEXT,
    taken_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_measurements_bride ON public.measurements(bride_id);
CREATE INDEX IF NOT EXISTS idx_measurements_business ON public.measurements(business_id);

-- 1.5 staff_schedules (Weekly shift templates & time-off definitions)
CREATE TABLE IF NOT EXISTS public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'shift', -- 'shift' or 'time_off'
    weekday INTEGER,     -- 0 (Sun) - 6 (Sat)
    is_working BOOLEAN DEFAULT true,
    start_minutes INTEGER DEFAULT 540, -- 9:00 AM
    end_minutes INTEGER DEFAULT 1020,   -- 5:00 PM
    off_start DATE,
    off_end DATE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_lookup ON public.staff_schedules(staff_name, kind);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_business ON public.staff_schedules(business_id);

-- 1.6 internal_notes (Cross-entity internal staff notes)
CREATE TABLE IF NOT EXISTS public.internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'appointment',
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_internal_notes_entity ON public.internal_notes(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_internal_notes_business ON public.internal_notes(business_id);

-- 1.7 staff_contacts (Staff email & notifications directory)
CREATE TABLE IF NOT EXISTS public.staff_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 app_settings (Generic application key-value preferences)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 durable_jobs (Durable background worker queue)
CREATE TABLE IF NOT EXISTS public.durable_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    queue_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, dead-letter
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(255),
    next_retry_at TIMESTAMPTZ DEFAULT now(),
    error_message TEXT,
    error_code VARCHAR(100),
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_durable_jobs_status_poll ON public.durable_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_durable_jobs_queue ON public.durable_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_durable_jobs_business ON public.durable_jobs(business_id);

-- 1.10 automation_rules (Autonomous marketing and workflow automation rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand TEXT,
    name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    execution_level INTEGER NOT NULL DEFAULT 1,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_business ON public.automation_rules(business_id, is_active);

-- 1.11 marketing_budgets (Marketing spending limits and allocations)
CREATE TABLE IF NOT EXISTS public.marketing_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand TEXT,
    monthly_budget_cents BIGINT NOT NULL DEFAULT 0,
    allocated_budget_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_budgets_business ON public.marketing_budgets(business_id);

-- 1.12 pickups (Order pickup verification and tracking)
CREATE TABLE IF NOT EXISTS public.pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    item_description TEXT,
    qa_verified BOOLEAN DEFAULT false,
    ready_since DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pickups_business ON public.pickups(business_id, status);

-- ============================================================================
-- 2. COMPATIBILITY VIEWS
-- ============================================================================

-- 2.1 public.brides (Updatable view on customers)
CREATE OR REPLACE VIEW public.brides AS
SELECT 
    id,
    business_id,
    location_id,
    name,
    email,
    phone,
    wedding_date,
    stylist,
    status,
    spend_cents,
    portal_token,
    profile_photo_url,
    profile_photo_updated_at,
    sms_opt_in,
    sms_consent,
    email_consent,
    created_at
FROM public.customers;

-- 2.2 public.inventory_items (Compatibility view on products/gowns)
CREATE OR REPLACE VIEW public.inventory_items AS
SELECT 
    id,
    business_id,
    designer AS vendor_name,
    style AS style_number,
    price_cents AS base_price_cents,
    category,
    created_at
FROM public.gowns;

-- 2.3 public.inventory_variants (Compatibility view on product_variants/gown_variants)
CREATE OR REPLACE VIEW public.inventory_variants AS
SELECT 
    id,
    id AS item_id,
    sku,
    size,
    color,
    stock,
    price_cents,
    created_at
FROM public.gowns;

-- ============================================================================
-- 3. COLUMN SCHEMA EXTENSIONS & RECONCILIATIONS
-- ============================================================================

-- 3.1 messages: Add columns for complete outbound/inbound communications
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS customer TEXT,
    ADD COLUMN IF NOT EXISTS to_address TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS body TEXT,
    ADD COLUMN IF NOT EXISTS kind TEXT,
    ADD COLUMN IF NOT EXISTS error TEXT,
    ADD COLUMN IF NOT EXISTS sentiment TEXT,
    ADD COLUMN IF NOT EXISTS external_id TEXT,
    ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- Create bidirectional content <-> body sync trigger for messages
CREATE OR REPLACE FUNCTION public.sync_message_content_and_body()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS NULL AND NEW.body IS NOT NULL THEN
        NEW.content := NEW.body;
    ELSIF NEW.body IS NULL AND NEW.content IS NOT NULL THEN
        NEW.body := NEW.content;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_message_content ON public.messages;
CREATE TRIGGER trg_sync_message_content
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.sync_message_content_and_body();

CREATE INDEX IF NOT EXISTS idx_messages_customer_text ON public.messages(business_id, customer);

-- 3.2 support_tickets: Add multi-tenant compatibility aliases
ALTER TABLE public.support_tickets
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'ACCOUNT',
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'Normal',
    ADD COLUMN IF NOT EXISTS app_version TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Backfill business_id from organization_id / tenant_id if null
UPDATE public.support_tickets p SET business_id = p.organization_id
 WHERE p.business_id IS NULL AND p.organization_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.organization_id);
UPDATE public.support_tickets p SET business_id = p.tenant_id
 WHERE p.business_id IS NULL AND p.tenant_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.tenant_id);
UPDATE public.support_tickets p SET organization_id = p.business_id
 WHERE p.organization_id IS NULL AND p.business_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.business_id);
UPDATE public.support_tickets p SET tenant_id = p.business_id
 WHERE p.tenant_id IS NULL AND p.business_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.business_id);

-- 3.3 audit_logs: Reconcile columns across all audit mutation patterns
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id UUID,
    ADD COLUMN IF NOT EXISTS resource TEXT,
    ADD COLUMN IF NOT EXISTS resource_id TEXT,
    ADD COLUMN IF NOT EXISTS resource_type TEXT,
    ADD COLUMN IF NOT EXISTS action TEXT,
    ADD COLUMN IF NOT EXISTS brand TEXT,
    ADD COLUMN IF NOT EXISTS before_value JSONB,
    ADD COLUMN IF NOT EXISTS after_value JSONB,
    ADD COLUMN IF NOT EXISTS before_state JSONB,
    ADD COLUMN IF NOT EXISTS after_state JSONB,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- NOTE: every backfill below is EXISTS-guarded against public.businesses.
-- These columns are FK-constrained to businesses, but the LEGACY columns they
-- copy from are not, so a purge of `businesses` left orphan rows behind. An
-- unguarded copy therefore fails with SQLSTATE 23503 and rolls back the whole
-- migration -- which is exactly what happened on the first push attempt:
--   Key (organization_id)=(23758f5d-2db3-454c-b49b-c00c7e7d80b0)
--   is not present in table "businesses".
-- Orphans are left with a NULL alias rather than deleted; the unique index below
-- tolerates that, since Postgres treats NULLs as distinct. See the follow-up
-- query in the runbook to find and clean them deliberately.
-- 3.4 organization_module_preferences: Ensure organization_id alias and unique constraint
ALTER TABLE public.organization_module_preferences
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.organization_module_preferences p SET organization_id = p.business_id
 WHERE p.organization_id IS NULL AND p.business_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.business_id);
UPDATE public.organization_module_preferences p SET business_id = p.organization_id
 WHERE p.business_id IS NULL AND p.organization_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p.organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_mod_pref_org_mod ON public.organization_module_preferences(organization_id, module_id);

-- 3.5 Core Entity Tables: Add legacy UI location and customer helper columns
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS customer TEXT,
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS date TEXT,
    ADD COLUMN IF NOT EXISTS time TEXT,
    ADD COLUMN IF NOT EXISTS stylist TEXT,
    ADD COLUMN IF NOT EXISTS looking_for TEXT,
    ADD COLUMN IF NOT EXISTS budget_cents BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fee_paid BOOLEAN DEFAULT false;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS customer TEXT;

ALTER TABLE public.purchase_orders
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS assigned_customer TEXT,
    ADD COLUMN IF NOT EXISTS assigned_staff TEXT;

ALTER TABLE public.gowns
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS sku TEXT,
    ADD COLUMN IF NOT EXISTS cost_cents BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS msrp_cents BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Bridal Gown',
    ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'New',
    ADD COLUMN IF NOT EXISTS vendor TEXT,
    ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.transfers
    ADD COLUMN IF NOT EXISTS from_location TEXT,
    ADD COLUMN IF NOT EXISTS to_location TEXT,
    ADD COLUMN IF NOT EXISTS gown_name TEXT;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Ensure helper function exists
CREATE OR REPLACE FUNCTION public.user_has_role(check_business_id uuid, allowed_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_memberships
    WHERE business_id = check_business_id
    AND user_id = auth.uid()
    AND role = ANY(allowed_roles)
    AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.1 time_entries RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view time_entries" ON public.time_entries;
CREATE POLICY "Members can view time_entries" ON public.time_entries FOR SELECT
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Members can modify time_entries" ON public.time_entries;
CREATE POLICY "Members can modify time_entries" ON public.time_entries FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- 4.2 sales_goals RLS
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view sales_goals" ON public.sales_goals;
CREATE POLICY "Members can view sales_goals" ON public.sales_goals FOR SELECT
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify sales_goals" ON public.sales_goals;
CREATE POLICY "Managers can modify sales_goals" ON public.sales_goals FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- 4.3 try_on_notes RLS
ALTER TABLE public.try_on_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access try_on_notes" ON public.try_on_notes;
CREATE POLICY "Members can access try_on_notes" ON public.try_on_notes FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- 4.4 measurements RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access measurements" ON public.measurements;
CREATE POLICY "Members can access measurements" ON public.measurements FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- 4.5 staff_schedules RLS
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view staff_schedules" ON public.staff_schedules;
CREATE POLICY "Members can view staff_schedules" ON public.staff_schedules FOR SELECT
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify staff_schedules" ON public.staff_schedules;
CREATE POLICY "Managers can modify staff_schedules" ON public.staff_schedules FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- 4.6 internal_notes RLS
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access internal_notes" ON public.internal_notes;
CREATE POLICY "Members can access internal_notes" ON public.internal_notes FOR ALL
    USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- 4.7 staff_contacts RLS
ALTER TABLE public.staff_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access staff_contacts" ON public.staff_contacts;
CREATE POLICY "Members can access staff_contacts" ON public.staff_contacts FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- 4.8 app_settings RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true);

-- 4.9 durable_jobs RLS
ALTER TABLE public.durable_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow workers and platform to manage durable_jobs" ON public.durable_jobs;
CREATE POLICY "Allow workers and platform to manage durable_jobs" ON public.durable_jobs FOR ALL USING (true);

-- 4.10 automation_rules RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to automation_rules" ON public.automation_rules;
CREATE POLICY "Allow access to automation_rules" ON public.automation_rules FOR ALL USING (true);

-- 4.11 marketing_budgets RLS
ALTER TABLE public.marketing_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to marketing_budgets" ON public.marketing_budgets;
CREATE POLICY "Allow access to marketing_budgets" ON public.marketing_budgets FOR ALL USING (true);

-- 4.12 pickups RLS
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can access pickups" ON public.pickups;
CREATE POLICY "Members can access pickups" ON public.pickups FOR ALL
    USING (business_id IS NULL OR public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
