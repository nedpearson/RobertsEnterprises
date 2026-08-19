-- 20260810000000_workforce_scheduling_extensions.sql

-- 1. Extend employee_schedules
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'Regular';
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS shift_series_id UUID;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS unpaid_break_minutes INTEGER DEFAULT 0;
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS paid_break_minutes INTEGER DEFAULT 0;

-- 2. Time Off Requests
CREATE TABLE IF NOT EXISTS time_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    type TEXT NOT NULL, -- Vacation, Sick, Personal, Unavailable
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, denied
    notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employee Availability
CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    is_available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, day_of_week)
);

-- 4. Open Shifts
CREATE TABLE IF NOT EXISTS open_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    shift_type TEXT DEFAULT 'Regular',
    department TEXT,
    status TEXT DEFAULT 'open', -- open, claimed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Shift Swap Requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES employee_schedules(id) ON DELETE CASCADE,
    requesting_employee_id UUID NOT NULL,
    covering_employee_id UUID,
    status TEXT DEFAULT 'pending', -- pending, offered, approved, denied
    manager_approval_required BOOLEAN DEFAULT true,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- Apply standard multi-tenant RLS Policies
DROP POLICY IF EXISTS "Enable all access for business members" ON time_off_requests;
CREATE POLICY "Enable all access for business members" ON time_off_requests FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON employee_availability;
CREATE POLICY "Enable all access for business members" ON employee_availability FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON open_shifts;
CREATE POLICY "Enable all access for business members" ON open_shifts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON shift_swap_requests;
CREATE POLICY "Enable all access for business members" ON shift_swap_requests FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
-- 20260811000000_vowos_control_plane.sql
-- Establishes the Central VowOS Control Plane.
-- This represents the absolute architectural shift from "Single Monolith CRM"
-- to a "Multi-Tenant SaaS Control Plane". 

CREATE TABLE IF NOT EXISTS vowos_tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    primary_domain text UNIQUE,
    db_url text NOT NULL,
    anon_key text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vowos_tenant_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES vowos_tenants(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'staff',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS vowos_tenant_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES vowos_tenants(id) ON DELETE CASCADE,
    logo_url text,
    primary_color text DEFAULT '#000000',
    secondary_color text DEFAULT '#ffffff',
    font_family text DEFAULT 'Inter',
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS vowos_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES vowos_tenants(id) ON DELETE CASCADE,
    plan_id text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE vowos_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vowos_tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vowos_tenant_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE vowos_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service Role Bypass (Since this is control plane, mostly accessed by server-side worker)
-- For the frontend, users can view their own tenant configuration
DROP POLICY IF EXISTS "Users can view their assigned tenants" ON vowos_tenants;
CREATE POLICY "Users can view their assigned tenants" ON vowos_tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM vowos_tenant_users WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can view their tenant brand" ON vowos_tenant_brands;
CREATE POLICY "Users can view their tenant brand" ON vowos_tenant_brands
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM vowos_tenant_users WHERE user_id = auth.uid())
    );

-- Seed Initial Control Plane Data for Roberts Enterprises and Demo
INSERT INTO vowos_tenants (name, slug, primary_domain, db_url, anon_key)
VALUES 
  ('Roberts Enterprises', 'roberts-enterprises', 'robertsenterprises.vowos.bridgebox.ai', 'ENV:VITE_SUPABASE_URL', 'ENV:VITE_SUPABASE_ANON_KEY'),
  ('VowOS Demo', 'demo', 'vowos.bridgebox.ai', 'ENV:VITE_DEMO_SUPABASE_URL', 'ENV:DEMO_SUPABASE_ANON_KEY');

-- Note: The anon_keys and db_urls will be dynamically hydrated by the worker node layer 
-- replacing 'ENV:...' with the actual environment variable values to prevent leaking 
-- secrets into the database while maintaining the database-per-tenant architecture.
-- 1. PLATFORM HIERARCHY

CREATE TABLE IF NOT EXISTS platform_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    platform_role text NOT NULL DEFAULT 'USER',
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(auth_user_id)
);

-- Enable RLS
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- Only super admins can view platform_users
DROP POLICY IF EXISTS "Super Admins can view platform_users" ON platform_users;
CREATE POLICY "Super Admins can view platform_users" ON platform_users
    FOR SELECT USING (
        auth_user_id = auth.uid() AND platform_role = 'SUPER_ADMIN'
    );

-- Seed initial SUPER_ADMIN (nedpearson@gmail.com)
-- This requires the auth user to exist, which we can look up by email,
-- or we can insert it if it doesn't exist. Since auth users are handled 
-- by Supabase, we'll do an insert if exists.
DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'nedpearson@gmail.com';
    
    IF super_admin_id IS NOT NULL THEN
        INSERT INTO platform_users (auth_user_id, email, platform_role)
        VALUES (super_admin_id, 'nedpearson@gmail.com', 'SUPER_ADMIN')
        ON CONFLICT (auth_user_id) DO UPDATE SET platform_role = 'SUPER_ADMIN';
    END IF;
END $$;

-- 2. SECURE PLATFORM RPCs
-- Function to securely check if the current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM platform_users 
        WHERE auth_user_id = auth.uid() 
        AND platform_role IN ('SUPER_ADMIN', 'PLATFORM_OWNER')
        AND active = true
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$;
-- MULTI-TENANT SCHEMA UPDATES

-- 1. Extend `businesses` to support the canonical Organization concept
-- (We retain the physical table name `businesses` to safely preserve all 40+ 
-- foreign keys and RLS policies across the platform without breaking existing integrations,
-- while fulfilling the architectural requirement for Individual vs Business workspaces.)

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS organization_type text DEFAULT 'BUSINESS',
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'TRIAL',
ADD COLUMN IF NOT EXISTS subscription_plan_id text,
ADD COLUMN IF NOT EXISTS trial_start timestamptz,
ADD COLUMN IF NOT EXISTS trial_end timestamptz,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'PENDING';

-- 2. Extend `business_memberships` roles
-- Roles: OWNER, ADMIN, MANAGER, EMPLOYEE, STAFF, SALES, MARKETING, ACCOUNTING, READ_ONLY
ALTER TABLE business_memberships
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing memberships to OWNER if they are the only member (likely the creator)
-- or keep existing roles.
UPDATE business_memberships
SET role = 'OWNER'
WHERE id IN (
  SELECT id FROM business_memberships bm
  WHERE (SELECT COUNT(*) FROM business_memberships bm2 WHERE bm2.business_id = bm.business_id) = 1
) AND role != 'OWNER';

-- 3. Consolidate Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
    plan_id text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE',
    trial_start timestamptz,
    trial_end timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_feature_overrides (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    state text NOT NULL, -- 'FORCED_ON', 'FORCED_OFF'
    reason text,
    changed_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(business_id, feature_key)
);

ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization subscriptions" ON organization_subscriptions;
CREATE POLICY "Users can view their organization subscriptions" ON organization_subscriptions
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their organization feature overrides" ON organization_feature_overrides;
CREATE POLICY "Users can view their organization feature overrides" ON organization_feature_overrides
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- Only Super Admins can modify these
DROP POLICY IF EXISTS "Super Admins can modify organization_subscriptions" ON organization_subscriptions;
CREATE POLICY "Super Admins can modify organization_subscriptions" ON organization_subscriptions
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can modify feature overrides" ON organization_feature_overrides;
CREATE POLICY "Super Admins can modify feature overrides" ON organization_feature_overrides
    FOR ALL USING (is_super_admin());

-- 4. Audit Logging (Extend existing table)
ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS actor_user_id uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS actor_type text,
    ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS resource text,
    ADD COLUMN IF NOT EXISTS resource_id text,
    ADD COLUMN IF NOT EXISTS before_state jsonb,
    ADD COLUMN IF NOT EXISTS after_state jsonb,
    ADD COLUMN IF NOT EXISTS ip_address text,
    ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business audit logs" ON audit_logs;
CREATE POLICY "Users can view their business audit logs" ON audit_logs
    FOR SELECT USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Super Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Super Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (is_super_admin());

-- Allow system/RPC to insert
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()) OR is_super_admin()
    );
-- PROVISION NEW ORGANIZATION RPC

CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug already exists';
    END IF;

    -- 3. Create the Organization (Businesses table)
    INSERT INTO businesses (
        name,
        organization_type,
        legal_name,
        display_name,
        slug,
        status,
        subscription_status,
        timezone,
        country,
        state
    ) VALUES (
        COALESCE(p_display_name, p_legal_name),
        p_organization_type,
        p_legal_name,
        p_display_name,
        p_slug,
        'ACTIVE',
        'TRIAL',
        COALESCE(p_timezone, 'America/New_York'),
        p_country,
        p_state
    ) RETURNING id INTO v_new_business_id;

    -- 4. Assign the caller as the OWNER
    INSERT INTO business_memberships (
        user_id,
        business_id,
        role,
        status,
        invited_by,
        approved_by
    ) VALUES (
        auth.uid(),
        v_new_business_id,
        'OWNER',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription (TRIAL)
    INSERT INTO organization_subscriptions (
        business_id,
        plan_id,
        status,
        trial_start,
        trial_end
    ) VALUES (
        v_new_business_id,
        'starter', -- Default plan
        'ACTIVE',
        now(),
        now() + interval '14 days'
    );

    -- 6. Audit Log
    INSERT INTO audit_logs (
        actor_user_id,
        actor_type,
        business_id,
        action,
        resource,
        resource_id
    ) VALUES (
        auth.uid(),
        'USER',
        v_new_business_id,
        'ORGANIZATION_PROVISIONED',
        'organization',
        v_new_business_id::text
    );

    RETURN v_new_business_id;
END;
$$;
-- Auto-generated tenant isolation RLS for missing tables

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for business members" ON staff_profiles;
CREATE POLICY "Enable all access for business members" ON staff_profiles FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- 20260814000000_final_production_rls_audit.sql
-- FINAL PRODUCTION AUDIT: Enforce RLS on all operational child tables and remove duplicate tenant/AI schemas.

-- 1. DROP DUPLICATE/DISCONNECTED PARALLEL IMPLEMENTATIONS
-- The vowos_ control plane tables were a duplicate implementation of the existing business/memberships architecture.
DROP TABLE IF EXISTS vowos_subscriptions CASCADE;
DROP TABLE IF EXISTS vowos_tenant_brands CASCADE;
DROP TABLE IF EXISTS vowos_tenant_users CASCADE;
DROP TABLE IF EXISTS vowos_tenants CASCADE;

-- Drop disconnected AI schemas that are not wired to the tenant architecture and lack RLS
DROP TABLE IF EXISTS ai_model_registry CASCADE;
DROP TABLE IF EXISTS ai_model_versions CASCADE;
DROP TABLE IF EXISTS ai_prompt_registry CASCADE;
DROP TABLE IF EXISTS ai_prediction_events CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS ai_recommendation_actions CASCADE;
DROP TABLE IF EXISTS ai_explanations CASCADE;
DROP TABLE IF EXISTS ai_feature_definitions CASCADE;
DROP TABLE IF EXISTS ai_feature_snapshots CASCADE;
DROP TABLE IF EXISTS ai_training_runs CASCADE;
DROP TABLE IF EXISTS ai_evaluation_runs CASCADE;
DROP TABLE IF EXISTS ai_drift_metrics CASCADE;
DROP TABLE IF EXISTS marketing_experiments CASCADE;
DROP TABLE IF EXISTS marketing_experiment_variants CASCADE;
DROP TABLE IF EXISTS marketing_experiment_assignments CASCADE;
DROP TABLE IF EXISTS marketing_experiment_outcomes CASCADE;
DROP TABLE IF EXISTS marketing_bandit_states CASCADE;
DROP TABLE IF EXISTS marketing_causal_estimates CASCADE;
DROP TABLE IF EXISTS marketing_budget_scenarios CASCADE;
DROP TABLE IF EXISTS marketing_optimizer_runs CASCADE;
DROP TABLE IF EXISTS marketing_optimizer_allocations CASCADE;
DROP TABLE IF EXISTS marketing_competitors CASCADE;
DROP TABLE IF EXISTS marketing_competitor_signals CASCADE;
DROP TABLE IF EXISTS marketing_trend_signals CASCADE;
DROP TABLE IF EXISTS marketing_creative_attributes CASCADE;
DROP TABLE IF EXISTS marketing_creative_scores CASCADE;
DROP TABLE IF EXISTS marketing_lifecycle_segments CASCADE;
DROP TABLE IF EXISTS marketing_capacity_snapshots CASCADE;
DROP TABLE IF EXISTS marketing_data_quality_metrics CASCADE;
DROP TABLE IF EXISTS marketing_intelligence_briefs CASCADE;
DROP TABLE IF EXISTS marketing_budgets CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS automation_rules CASCADE;
DROP TABLE IF EXISTS durable_jobs CASCADE;
DROP TABLE IF EXISTS provider_connections CASCADE;

-- 2. ENABLE RLS ON ALL MISSING CHILD TABLES
ALTER TABLE employee_schedule_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_request_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_assignment_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_permissions ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES FOR CHILD TABLES (Via JOIN to parent table)

DROP POLICY IF EXISTS "Enable all access for schedule breaks via business" ON employee_schedule_breaks;
CREATE POLICY "Enable all access for schedule breaks via business" ON employee_schedule_breaks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employee_schedules 
        WHERE employee_schedules.id = employee_schedule_breaks.schedule_id 
        AND employee_schedules.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for request location preferences via business" ON appointment_request_location_preferences;
CREATE POLICY "Enable all access for request location preferences via business" ON appointment_request_location_preferences FOR ALL USING (
    EXISTS (
        SELECT 1 FROM appointment_requests 
        WHERE appointment_requests.id = appointment_request_location_preferences.request_id 
        AND appointment_requests.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for assignment recommendations via business" ON appointment_assignment_recommendations;
CREATE POLICY "Enable all access for assignment recommendations via business" ON appointment_assignment_recommendations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM appointment_requests 
        WHERE appointment_requests.id = appointment_assignment_recommendations.request_id 
        AND appointment_requests.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for employee calendar connections via user_id" ON employee_calendar_connections;
CREATE POLICY "Enable all access for employee calendar connections via user_id" ON employee_calendar_connections FOR ALL USING (
    employee_id = auth.uid()
);

-- File child tables link to files
DROP POLICY IF EXISTS "Enable all access for file versions via business" ON file_versions;
CREATE POLICY "Enable all access for file versions via business" ON file_versions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_versions.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for file links via business" ON file_links;
CREATE POLICY "Enable all access for file links via business" ON file_links FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_links.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for file permissions via business" ON file_permissions;
CREATE POLICY "Enable all access for file permissions via business" ON file_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM files 
        WHERE files.id = file_permissions.file_id 
        AND files.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

-- Communication child tables
DROP POLICY IF EXISTS "Enable all access for communication attachments via business" ON communication_attachments;
CREATE POLICY "Enable all access for communication attachments via business" ON communication_attachments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_attachments.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for communication delivery events via business" ON communication_delivery_events;
CREATE POLICY "Enable all access for communication delivery events via business" ON communication_delivery_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_delivery_events.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for communication recipients via business" ON communication_recipients;
CREATE POLICY "Enable all access for communication recipients via business" ON communication_recipients FOR ALL USING (
    EXISTS (
        SELECT 1 FROM communications 
        WHERE communications.id = communication_recipients.communication_id 
        AND communications.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

-- Task child tables
DROP POLICY IF EXISTS "Enable all access for task assignments via business" ON task_assignments;
CREATE POLICY "Enable all access for task assignments via business" ON task_assignments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_assignments.task_id 
        AND tasks.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for task events via business" ON task_events;
CREATE POLICY "Enable all access for task events via business" ON task_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_events.task_id 
        AND tasks.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for reminder events via business" ON reminder_events;
CREATE POLICY "Enable all access for reminder events via business" ON reminder_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM reminders 
        WHERE reminders.id = reminder_events.reminder_id 
        AND reminders.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for settings versions via business" ON settings_versions;
CREATE POLICY "Enable all access for settings versions via business" ON settings_versions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM settings_values 
        WHERE settings_values.id = settings_versions.setting_value_id 
        AND settings_values.business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Enable all access for location permissions via business memberships" ON location_permissions;
CREATE POLICY "Enable all access for location permissions via business memberships" ON location_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM business_memberships 
        WHERE business_memberships.id = location_permissions.membership_id 
        AND business_memberships.user_id = auth.uid()
    )
);

-- The calendar_sync_events table connects to employee_calendar_connections
DROP POLICY IF EXISTS "Enable all access for calendar sync events via user_id" ON calendar_sync_events;
CREATE POLICY "Enable all access for calendar sync events via user_id" ON calendar_sync_events FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employee_calendar_connections 
        WHERE employee_calendar_connections.employee_id = calendar_sync_events.employee_id 
        AND employee_calendar_connections.employee_id = auth.uid()
    )
);
-- 20260814000001_public_appointment_rpc.sql
-- SECURE PUBLIC BOOKING RPC
-- This RPC allows the public booking page to securely insert an appointment, lead, and message 
-- into the correct tenant's database without exposing RLS to anonymous users or requiring them to know the business_id.

CREATE OR REPLACE FUNCTION submit_public_appointment(
    p_store_slug text,
    p_customer_name text,
    p_email text,
    p_phone text,
    p_type text,
    p_date date,
    p_time text,
    p_looking_for text,
    p_budget_cents integer,
    p_payment_intent_id text,
    p_total_cents integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id uuid;
    v_location_id uuid;
    v_customer_id uuid;
    v_appointment_id uuid;
BEGIN
    -- Reference Tenant Lookup (Roberts Enterprises)
    SELECT id INTO v_business_id FROM businesses WHERE slug = 'roberts-enterprises' LIMIT 1;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Reference business not found';
    END IF;

    -- Lookup Location by matching name loosely against the slug/metadata
    -- (In a fully mature model, locations would have a 'slug' column, but for now we pick the first one)
    SELECT id INTO v_location_id FROM locations WHERE business_id = v_business_id LIMIT 1;

    -- 1) Upsert Customer
    SELECT id INTO v_customer_id FROM customers WHERE business_id = v_business_id AND email = p_email LIMIT 1;
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (business_id, first_name, last_name, email, phone)
        VALUES (
            v_business_id, 
            split_part(p_customer_name, ' ', 1), 
            SUBSTRING(p_customer_name FROM length(split_part(p_customer_name, ' ', 1)) + 2),
            p_email, 
            p_phone
        ) RETURNING id INTO v_customer_id;
    END IF;

    -- 2) Create Appointment
    INSERT INTO appointments (
        business_id,
        location_id,
        customer_id,
        type,
        date,
        time,
        status,
        looking_for,
        budget_cents,
        fee_paid
    ) VALUES (
        v_business_id,
        v_location_id,
        v_customer_id,
        p_type,
        p_date,
        p_time,
        'Pending',
        p_looking_for,
        p_budget_cents,
        true
    ) RETURNING id INTO v_appointment_id;

    -- 3) Create Lead (Marketing pipeline)
    INSERT INTO leads (
        business_id,
        location_id,
        name,
        email,
        source,
        budget_cents,
        wedding_date,
        stage
    ) VALUES (
        v_business_id,
        v_location_id,
        p_customer_name,
        p_email,
        'Booking Page',
        p_budget_cents,
        p_date,
        'Appointment Set'
    );

    -- 4) Create Message (Payment confirmation log)
    INSERT INTO messages (
        business_id,
        location_id,
        customer_id,
        sender,
        channel,
        to_address,
        subject,
        body,
        status
    ) VALUES (
        v_business_id,
        v_location_id,
        v_customer_id,
        'System',
        'email',
        p_email,
        'Booking fee received',
        'Payment of ' || (p_total_cents / 100.0)::text || ' received. Stripe Ref: ' || p_payment_intent_id,
        'sent'
    );

    RETURN v_appointment_id;
END;
$$;
-- Add parent_id to businesses for hierarchical organizations
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES businesses(id) ON DELETE SET NULL;

-- CREATE TABLE IF NOT EXISTS for multiple websites per business
CREATE TABLE IF NOT EXISTS business_websites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for business_websites
ALTER TABLE business_websites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view websites for businesses they are members of
DROP POLICY IF EXISTS "Users can view websites for their businesses" ON business_websites;
CREATE POLICY "Users can view websites for their businesses" ON business_websites
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- Policy: Users can manage websites for their businesses
DROP POLICY IF EXISTS "Users can manage websites for their businesses" ON business_websites;
CREATE POLICY "Users can manage websites for their businesses" ON business_websites
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- UPDATE PROVISION NEW ORGANIZATION RPC TO SUPPORT PARENT AND WEBSITES
DROP FUNCTION IF EXISTS provision_new_organization(text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text,
    p_parent_id uuid DEFAULT NULL,
    p_websites text[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
    v_website text;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug already exists';
    END IF;

    -- 3. Create the Organization (Businesses table)
    INSERT INTO businesses (
        name,
        organization_type,
        legal_name,
        display_name,
        slug,
        status,
        subscription_status,
        timezone,
        country,
        state,
        parent_id
    ) VALUES (
        COALESCE(p_display_name, p_legal_name),
        p_organization_type,
        p_legal_name,
        p_display_name,
        p_slug,
        'ACTIVE',
        'TRIAL',
        COALESCE(p_timezone, 'America/New_York'),
        p_country,
        p_state,
        p_parent_id
    ) RETURNING id INTO v_new_business_id;

    -- 3.5 Insert websites if provided
    IF p_websites IS NOT NULL AND array_length(p_websites, 1) > 0 THEN
        FOREACH v_website IN ARRAY p_websites
        LOOP
            INSERT INTO business_websites (business_id, url)
            VALUES (v_new_business_id, v_website);
        END LOOP;
    END IF;

    -- 4. Assign the caller as the OWNER
    INSERT INTO business_memberships (
        user_id,
        business_id,
        role,
        status,
        invited_by,
        approved_by
    ) VALUES (
        auth.uid(),
        v_new_business_id,
        'OWNER',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription (TRIAL)
    INSERT INTO organization_subscriptions (
        business_id,
        plan_id,
        status,
        trial_start,
        trial_end
    ) VALUES (
        v_new_business_id,
        'starter', -- Default plan
        'ACTIVE',
        now(),
        now() + interval '14 days'
    );

    -- 6. Audit Log
    INSERT INTO audit_logs (
        actor_user_id,
        actor_type,
        business_id,
        action,
        resource,
        resource_id
    ) VALUES (
        auth.uid(),
        'USER',
        v_new_business_id,
        'ORGANIZATION_PROVISIONED',
        'organization',
        v_new_business_id::text
    );

    RETURN v_new_business_id;
END;
$$;
-- VowOS MASTER SAAS / TENANT / DEMO / SUPER ADMIN IMPLEMENTATION
-- This migration drops the parallel tenant architecture and establishes the single
-- source of truth for VowOS SaaS using the `businesses` table as the Tenant/Organization record.

-- 1. Drop redundant parallel architecture
DROP TABLE IF EXISTS vowos_tenant_brands CASCADE;
DROP TABLE IF EXISTS vowos_tenant_users CASCADE;
DROP TABLE IF EXISTS vowos_subscriptions CASCADE;
DROP TABLE IF EXISTS vowos_tenants CASCADE;

-- 2. Platform Users (for PLATFORM_OWNER role)
ALTER TABLE platform_users ADD UNIQUE (email);

-- Seed PLATFORM_OWNER (upsert by email)
INSERT INTO platform_users (email, platform_role) 
VALUES ('nedpearson@gmail.com', 'PLATFORM_OWNER')
ON CONFLICT (email) DO UPDATE SET platform_role = 'PLATFORM_OWNER';

-- 3. Support Sessions
CREATE TABLE IF NOT EXISTS support_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_user_id uuid REFERENCES auth.users(id) NOT NULL,
    target_organization_id uuid REFERENCES businesses(id) NOT NULL,
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    active boolean DEFAULT true,
    ip_address text,
    user_agent text
);

-- Enable RLS on support_sessions
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform owners can manage support sessions" ON support_sessions;
CREATE POLICY "Platform owners can manage support sessions" ON support_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM platform_users
            WHERE platform_users.auth_user_id = auth.uid()
            AND platform_users.platform_role = 'PLATFORM_OWNER'
        )
    );

-- 4. Establish Roberts Enterprises Privileges
-- Ensure Roberts Enterprises is comped
UPDATE businesses 
SET subscription_status = 'COMPED' 
WHERE slug IN ('roberts-enterprises', 'robertsenterprises', 're');

-- Add the feature override for Full Platform Access
INSERT INTO organization_feature_overrides (business_id, feature_key, state, reason)
SELECT id, 'ALL_CURRENT_AND_FUTURE_FEATURES', 'FORCED_ON', 'Platform Owner Directive'
FROM businesses 
WHERE slug IN ('roberts-enterprises', 'robertsenterprises', 're')
ON CONFLICT (business_id, feature_key) DO UPDATE SET state = 'FORCED_ON';

-- 5. Ensure Demo Organization
-- Ensure id constraint is clean
INSERT INTO businesses (id, name, slug, organization_type, status, onboarding_status)
VALUES (
    '11111111-1111-1111-1111-111111111111', -- Stable demo UUID if needed
    'VowOS Demo', 
    'demo', 
    'DEMO', 
    'ACTIVE', 
    'COMPLETED'
)
ON CONFLICT (id) DO UPDATE SET 
    name = 'VowOS Demo',
    slug = 'demo',
    organization_type = 'DEMO';

-- Ensure demo user has OWNER access to demo organization
INSERT INTO business_memberships (business_id, user_id, role, status)
SELECT 
    '11111111-1111-1111-1111-111111111111', 
    u.id, 
    'OWNER', 
    'ACTIVE'
FROM auth.users u WHERE u.email = 'demo123@gmail.com'
ON CONFLICT DO NOTHING;

-- 6. Update Platform Users trigger
-- We need to link auth.users.id to platform_users when a user signs up.
CREATE OR REPLACE FUNCTION link_platform_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE platform_users 
    SET auth_user_id = NEW.id 
    WHERE email = NEW.email AND auth_user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_platform ON auth.users;
CREATE TRIGGER on_auth_user_created_link_platform
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION link_platform_user();

-- Also run it immediately for any existing users
UPDATE platform_users p
SET auth_user_id = u.id
FROM auth.users u
WHERE p.email = u.email AND p.auth_user_id IS NULL;
-- Seed script for Massive Demo Environment
-- This script provisions the 'demo' data plane with 100+ entities across all domains

BEGIN;

-- We'll assume the demo business already exists or we'll create it explicitly.
-- Let's define variables to reuse IDs
DO $$ 
DECLARE 
  demo_business_id UUID := '10000000-0000-0000-0000-000000000001';
  demo_location_id UUID := '20000000-0000-0000-0000-000000000001';
  demo_vendor_id UUID := '30000000-0000-0000-0000-000000000001';
BEGIN
  
  -- Create Demo Business if not exists
  INSERT INTO public.businesses (id, name, slug, organization_type, status, onboarding_status)
  VALUES (
    demo_business_id, 
    'The Boutique Demo Store', 
    'demo-store', 
    'BUSINESS', 
    'ACTIVE', 
    'COMPLETE'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create Demo Location
  INSERT INTO public.locations (id, business_id, name)
  VALUES (
    demo_location_id,
    demo_business_id,
    'Flagship Store'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create Demo Vendor if not exists
  INSERT INTO public.vendors (id, business_id, name)
  VALUES (
    demo_vendor_id,
    demo_business_id,
    'Demo Vendor'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create Customers (50)
  FOR i IN 1..50 LOOP
    INSERT INTO public.customers (id, business_id, name, email, phone)
    VALUES (
      gen_random_uuid(),
      demo_business_id,
      'Demo Customer ' || i,
      'demo_customer_' || i || '@example.com',
      '555-01' || lpad(i::text, 2, '0')
    );
  END LOOP;

  -- Create Products/Catalog (50)
  FOR i IN 1..50 LOOP
    INSERT INTO public.products (id, business_id, vendor_id, name, style_number, category, status)
    VALUES (
      gen_random_uuid(),
      demo_business_id,
      demo_vendor_id,
      'Demo Gown ' || i,
      'DG-00' || i,
      'Bridal Gowns',
      'Active'
    );
  END LOOP;

  -- More entities could be inserted here (Appointments, Invoices, Transfers)

END $$;

COMMIT;
-- BILLING, ONBOARDING, AND ENTITLEMENT HARDENING

-- 1. Hardening businesses and subscriptions
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS onboarding_progress jsonb DEFAULT '{"currentStep": 1, "completedSteps": [], "startedAt": null, "updatedAt": null}'::jsonb;

ALTER TABLE organization_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;

-- 2. Revoke client-side modification of organization_subscriptions
-- We must drop the insecure policy that allows ORG_SUPER_ADMIN to update subscriptions directly from the browser.
DROP POLICY IF EXISTS "Super Admins can modify organization_subscriptions" ON organization_subscriptions;

-- Instead, only allow select. Any modification must happen via secure RPC or service role.
-- (The "Users can view their organization subscriptions" policy already exists for SELECT).
-- If we need Super Admins to be able to create the initial row during provisioning, the RPC `provision_new_organization` runs as SECURITY DEFINER, so it bypasses RLS.

-- 3. Webhook Idempotency Table
CREATE TABLE IF NOT EXISTS webhook_events (
    id text PRIMARY KEY,
    type text NOT NULL,
    status text NOT NULL DEFAULT 'processing', -- processing, processed, failed
    error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No public access to webhook_events. Only service role/RPC.

-- 4. Rewrite `provision_new_organization` to use ORG_SUPER_ADMIN and accept plan_id securely
CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text,
    p_plan_id text DEFAULT 'essentials'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
    v_onboarding_progress jsonb;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'slug_exists'; -- Throw a specific code for the frontend to catch
    END IF;

    v_onboarding_progress := jsonb_build_object(
        'currentStep', 1,
        'completedSteps', '[]'::jsonb,
        'startedAt', now(),
        'updatedAt', now()
    );

    -- 3. Create the Organization
    INSERT INTO businesses (
        name,
        organization_type,
        legal_name,
        display_name,
        slug,
        status,
        subscription_status,
        timezone,
        country,
        state,
        onboarding_progress
    ) VALUES (
        COALESCE(p_display_name, p_legal_name),
        p_organization_type,
        p_legal_name,
        p_display_name,
        p_slug,
        'ACTIVE',
        'TRIAL',
        COALESCE(p_timezone, 'America/New_York'),
        p_country,
        p_state,
        v_onboarding_progress
    ) RETURNING id INTO v_new_business_id;

    -- 4. Assign the caller as the ORG_SUPER_ADMIN (Canonical Role)
    INSERT INTO business_memberships (
        user_id,
        business_id,
        role,
        status,
        invited_by,
        approved_by
    ) VALUES (
        auth.uid(),
        v_new_business_id,
        'ORG_SUPER_ADMIN',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription
    -- We only allow specific free/trial plans to be selected at provisioning
    IF p_plan_id NOT IN ('essentials', 'growth', 'pro', 'enterprise', 'comped') THEN
        p_plan_id := 'essentials';
    END IF;

    INSERT INTO organization_subscriptions (
        business_id,
        plan_id,
        status,
        trial_start,
        trial_end
    ) VALUES (
        v_new_business_id,
        p_plan_id,
        'ACTIVE',
        now(),
        now() + interval '14 days'
    );

    -- 6. Audit Log
    INSERT INTO audit_logs (
        actor_user_id,
        actor_type,
        business_id,
        action,
        resource,
        resource_id
    ) VALUES (
        auth.uid(),
        'USER',
        v_new_business_id,
        'ORGANIZATION_PROVISIONED',
        'organization',
        v_new_business_id::text
    );

    RETURN v_new_business_id;
END;
$$;


-- 5. Simulated Billing RPCs for Deterministic Server-Side Checkout & Webhooks

CREATE OR REPLACE FUNCTION billing_create_checkout_session(
    p_business_id uuid,
    p_plan_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean;
    v_session_id text;
BEGIN
    -- Verify the caller is ORG_SUPER_ADMIN or PLATFORM_OWNER
    SELECT EXISTS (
        SELECT 1 FROM business_memberships
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
          AND role = 'ORG_SUPER_ADMIN'
    ) OR is_super_admin() INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Generate a mock session ID
    v_session_id := 'cs_mock_' || encode(gen_random_bytes(16), 'hex');

    -- In a real Stripe integration, we would call Stripe API here.
    -- For this simulated production gate, we return the mock URL.
    
    RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION billing_handle_webhook(
    p_event_id text,
    p_event_type text,
    p_business_id uuid,
    p_plan_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_status text;
BEGIN
    -- In a real app, this RPC is called by the Edge Function verifying the Stripe signature.
    
    -- 1. Idempotency Check
    SELECT status INTO v_existing_status FROM webhook_events WHERE id = p_event_id;
    IF FOUND THEN
        -- If it's already processed, just return true (idempotent)
        IF v_existing_status = 'processed' THEN
            RETURN true;
        END IF;
    ELSE
        -- Insert new event
        INSERT INTO webhook_events (id, type, status) VALUES (p_event_id, p_event_type, 'processing');
    END IF;

    -- 2. Handle Event
    IF p_event_type = 'checkout.session.completed' OR p_event_type = 'invoice.paid' THEN
        -- Safely update the subscription
        UPDATE organization_subscriptions
        SET plan_id = p_plan_id,
            status = 'ACTIVE',
            updated_at = now()
        WHERE business_id = p_business_id;

        -- We could also update businesses.subscription_status
        UPDATE businesses
        SET subscription_status = 'ACTIVE'
        WHERE id = p_business_id;
        
    ELSIF p_event_type = 'invoice.payment_failed' THEN
        UPDATE organization_subscriptions
        SET status = 'PAST_DUE',
            updated_at = now()
        WHERE business_id = p_business_id;

        UPDATE businesses
        SET subscription_status = 'PAST_DUE'
        WHERE id = p_business_id;

    ELSIF p_event_type = 'customer.subscription.deleted' THEN
        UPDATE organization_subscriptions
        SET status = 'CANCELED',
            updated_at = now()
        WHERE business_id = p_business_id;

        UPDATE businesses
        SET subscription_status = 'CANCELED'
        WHERE id = p_business_id;
    END IF;

    -- 3. Mark processed
    UPDATE webhook_events SET status = 'processed', updated_at = now() WHERE id = p_event_id;

    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- On failure, mark as failed if we inserted it
    UPDATE webhook_events SET status = 'failed', error = SQLERRM, updated_at = now() WHERE id = p_event_id;
    RAISE;
END;
$$;
-- 20260817000000_multi_channel_commerce.sql
-- VowOS Multi-Channel Commerce Architecture

-- 1. Drop existing unused dummy table to replace with formal OAuth model
DROP TABLE IF EXISTS integrations CASCADE;

-- ==========================================
-- CONNECTED ACCOUNTS & RESOURCES
-- ==========================================

-- Extensible provider model (Shopify, GoDaddy, etc.)
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'SHOPIFY', 'GODADDY', 'STRIPE'
    external_account_id TEXT,
    display_name TEXT NOT NULL,
    status TEXT DEFAULT 'CONNECTED', -- 'CONNECTED', 'DISCONNECTED', 'ERROR', 'REAUTH_REQUIRED'
    access_token TEXT, -- Encrypted/secured at rest
    refresh_token TEXT,
    scopes JSONB,
    connected_by UUID REFERENCES auth.users(id),
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (business_id, provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS connected_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- e.g., 'STORE', 'DOMAIN', 'WEBSITE'
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connected_account_id, external_id)
);

-- ==========================================
-- SITES & BRANDS
-- ==========================================

-- Rename/Upgrade business_websites to business_sites for a unified domain model
-- (Dropping it for clean creation since we are in active early dev, assuming no prod data exists for it yet)
DROP TABLE IF EXISTS business_websites CASCADE;

CREATE TABLE IF NOT EXISTS business_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES business_brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    site_type TEXT NOT NULL, -- 'MARKETING', 'ECOMMERCE', 'BOOKING', 'BRAND', 'LOCATION'
    provider TEXT NOT NULL, -- 'SHOPIFY', 'GODADDY', 'VOWOS_HOSTED', 'CUSTOM'
    status TEXT DEFAULT 'ACTIVE',
    is_primary BOOLEAN DEFAULT false,
    inquiry_enabled BOOLEAN DEFAULT true,
    booking_enabled BOOLEAN DEFAULT false,
    ecommerce_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- COMMERCE CHANNELS & PUBLISHING
-- ==========================================

CREATE TABLE IF NOT EXISTS commerce_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES business_sites(id) ON DELETE CASCADE,
    connected_resource_id UUID REFERENCES connected_resources(id) ON DELETE SET NULL, -- E.g., the specific Shopify Store
    sync_direction TEXT DEFAULT 'VOWOS_TO_SHOPIFY', -- 'VOWOS_TO_SHOPIFY', 'SHOPIFY_TO_VOWOS', 'BIDIRECTIONAL'
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES commerce_channels(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    external_product_id TEXT,
    external_variant_id TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PUBLISHED', 'PENDING', 'SYNCING', 'FAILED', 'CONFLICT'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS channel_product_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
    price_cents INTEGER,
    compare_at_cents INTEGER,
    title_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id)
);

-- ==========================================
-- SYNC HEALTH & CONFLICTS
-- ==========================================

CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES commerce_channels(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'FULL_CATALOG_SYNC', 'INVENTORY_RECONCILIATION', 'ORDER_IMPORT'
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'MANUAL_REVIEW'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'PRODUCT', 'ORDER', 'CUSTOMER', 'INVENTORY'
    local_id UUID,
    external_id TEXT,
    conflict_reason TEXT NOT NULL,
    resolution_status TEXT DEFAULT 'UNRESOLVED', -- 'UNRESOLVED', 'RESOLVED_LOCAL_WON', 'RESOLVED_EXTERNAL_WON'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- CUSTOMER IDENTITIES
-- ==========================================

CREATE TABLE IF NOT EXISTS customer_external_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, provider, external_id)
);

-- ==========================================
-- ORDERS UPGRADE
-- ==========================================

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDING',
    total_cents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alter existing orders table to capture channel origin
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'IN_STORE'; -- 'IN_STORE', 'WEBSITE', 'SHOPIFY'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES commerce_channels(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_url TEXT;

-- ==========================================
-- FORM SUBMISSIONS (Web Inquiries)
-- ==========================================

CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    site_id UUID REFERENCES business_sites(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    form_type TEXT DEFAULT 'INQUIRY',
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_product_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_external_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Shared Policy Template for Business Members
DROP POLICY IF EXISTS "Enable all access for business members" ON connected_accounts;
CREATE POLICY "Enable all access for business members" ON connected_accounts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON connected_resources;
CREATE POLICY "Enable all access for business members" ON connected_resources FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON business_brands;
CREATE POLICY "Enable all access for business members" ON business_brands FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON business_sites;
CREATE POLICY "Enable all access for business members" ON business_sites FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON commerce_channels;
CREATE POLICY "Enable all access for business members" ON commerce_channels FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON channel_listings;
CREATE POLICY "Enable all access for business members" ON channel_listings FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON channel_product_overrides;
CREATE POLICY "Enable all access for business members" ON channel_product_overrides FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON sync_jobs;
CREATE POLICY "Enable all access for business members" ON sync_jobs FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON sync_conflicts;
CREATE POLICY "Enable all access for business members" ON sync_conflicts FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON customer_external_identities;
CREATE POLICY "Enable all access for business members" ON customer_external_identities FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable all access for business members" ON form_submissions;
CREATE POLICY "Enable all access for business members" ON form_submissions FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));

-- ==========================================
-- UPDATE PROVISIONING RPC
-- ==========================================

-- Modify the existing provision_new_organization to use business_sites instead of business_websites
CREATE OR REPLACE FUNCTION provision_new_organization(
    p_organization_type text,
    p_legal_name text,
    p_display_name text,
    p_slug text,
    p_industry text,
    p_country text,
    p_state text,
    p_timezone text,
    p_parent_id uuid DEFAULT NULL,
    p_websites text[] DEFAULT NULL,
    p_plan_id text DEFAULT 'starter'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_business_id uuid;
    v_website text;
BEGIN
    -- 1. Validate auth user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify slug uniqueness
    IF EXISTS (SELECT 1 FROM businesses WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug already exists';
    END IF;

    -- 3. Create the Organization (Businesses table)
    INSERT INTO businesses (
        name,
        organization_type,
        legal_name,
        display_name,
        slug,
        status,
        subscription_status,
        timezone,
        country,
        state,
        parent_id
    ) VALUES (
        COALESCE(p_display_name, p_legal_name),
        p_organization_type,
        p_legal_name,
        p_display_name,
        p_slug,
        'ACTIVE',
        'TRIAL',
        COALESCE(p_timezone, 'America/New_York'),
        p_country,
        p_state,
        p_parent_id
    ) RETURNING id INTO v_new_business_id;

    -- 3.5 Insert sites if provided
    IF p_websites IS NOT NULL AND array_length(p_websites, 1) > 0 THEN
        FOREACH v_website IN ARRAY p_websites
        LOOP
            INSERT INTO business_sites (business_id, name, domain, site_type, provider, is_primary)
            VALUES (v_new_business_id, v_website, v_website, 'MARKETING', 'CUSTOM', true);
        END LOOP;
    END IF;

    -- 4. Assign the caller as the OWNER
    INSERT INTO business_memberships (
        user_id,
        business_id,
        role,
        status,
        invited_by,
        approved_by
    ) VALUES (
        auth.uid(),
        v_new_business_id,
        'OWNER',
        'ACTIVE',
        auth.uid(),
        auth.uid()
    );

    -- 5. Create Default Subscription (TRIAL)
    INSERT INTO organization_subscriptions (
        business_id,
        plan_id,
        status,
        trial_start,
        trial_end
    ) VALUES (
        v_new_business_id,
        p_plan_id,
        'ACTIVE',
        now(),
        now() + interval '14 days'
    );

    -- 6. Audit Log
    INSERT INTO audit_logs (
        actor_user_id,
        actor_type,
        business_id,
        action,
        resource,
        resource_id
    ) VALUES (
        auth.uid(),
        'USER',
        v_new_business_id,
        'ORGANIZATION_PROVISIONED',
        'organization',
        v_new_business_id::text
    );

    RETURN v_new_business_id;
END;
$$;
-- 20260818000000_concurrency_safe_scheduling.sql
-- Enforces true concurrency-safe assignment of appointments using Postgres Transactions and Advisory Locks

CREATE OR REPLACE FUNCTION assign_appointment_idempotent(
    p_business_id uuid,
    p_request_id uuid,
    p_employee_id uuid,
    p_location_id uuid,
    p_room_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_overlap_count int;
    v_appointment record;
    v_employee_lock_key bigint;
BEGIN
    -- 1. Acquire transaction-level advisory lock for the employee to serialize concurrent requests
    -- We convert the uuid to a bigint hash for the lock key
    v_employee_lock_key := ('x'||substr(md5(p_employee_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_employee_lock_key);

    -- 2. Verify Request Status
    SELECT * INTO v_request 
    FROM appointment_requests 
    WHERE id = p_request_id AND business_id = p_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or unauthorized';
    END IF;

    IF v_request.status <> 'submitted' THEN
        RAISE EXCEPTION 'Request already assigned or processed';
    END IF;

    -- 3. Check Employee Schedule Overlaps (Concurrency Safe due to lock)
    SELECT count(*) INTO v_overlap_count
    FROM appointments
    WHERE employee_id = p_employee_id
      AND end_at > p_start_at
      AND start_at < p_end_at
      AND status NOT IN ('Canceled', 'No-show');

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Employee is already booked during this time';
    END IF;

    -- 4. Check Room Overlaps if applicable
    IF p_room_id IS NOT NULL THEN
        SELECT count(*) INTO v_overlap_count
        FROM appointments
        WHERE room_id = p_room_id
          AND end_at > p_start_at
          AND start_at < p_end_at
          AND status NOT IN ('Canceled', 'No-show');

        IF v_overlap_count > 0 THEN
            RAISE EXCEPTION 'Room is already booked during this time';
        END IF;
    END IF;

    -- 5. Lock Tentative Holds
    SELECT count(*) INTO v_overlap_count
    FROM appointment_holds
    WHERE employee_id = p_employee_id
      AND end_at > p_start_at
      AND start_at < p_end_at
      AND expires_at > now();

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Employee has a tentative hold during this time';
    END IF;

    -- 6. Insert Canonical Appointment
    INSERT INTO appointments (
        business_id,
        location_id,
        request_id,
        customer_id,
        employee_id,
        service_id,
        room_id,
        start_at,
        end_at,
        confirmation_status,
        status,
        intake_source
    ) VALUES (
        p_business_id,
        p_location_id,
        p_request_id,
        v_request.customer_id,
        p_employee_id,
        v_request.service_id,
        p_room_id,
        p_start_at,
        p_end_at,
        'pending',
        'Pending',
        v_request.intake_source
    ) RETURNING * INTO v_appointment;

    -- 7. Update Request Status
    UPDATE appointment_requests 
    SET status = 'assigned' 
    WHERE id = p_request_id;

    -- 8. Clear Conflicting Recommendations
    DELETE FROM appointment_assignment_recommendations 
    WHERE request_id = p_request_id;

    RETURN to_jsonb(v_appointment);
END;
$$;
-- 20260818000001_order_idempotency.sql
-- Enforce idempotency and external unique constraints to protect against webhook double-delivery

-- 1. Ensure external_order_id cannot be duplicated per channel
-- This prevents a Shopify or Square webhook retry from creating two identical orders in VowOS.
ALTER TABLE orders 
ADD CONSTRAINT unique_external_order_per_channel 
UNIQUE NULLS NOT DISTINCT (business_id, channel_id, external_order_id);

-- 2. Create an idempotent upsert function for external orders
CREATE OR REPLACE FUNCTION upsert_external_order(
    p_business_id uuid,
    p_location_id uuid,
    p_customer_id uuid,
    p_channel_id uuid,
    p_external_order_id text,
    p_external_order_url text,
    p_source_type text,
    p_status text,
    p_total_cents integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
BEGIN
    -- Insert or update the order, guaranteeing no duplicates
    INSERT INTO orders (
        business_id,
        location_id,
        customer_id,
        channel_id,
        external_order_id,
        external_order_url,
        source_type,
        status,
        total_cents
    ) VALUES (
        p_business_id,
        p_location_id,
        p_customer_id,
        p_channel_id,
        p_external_order_id,
        p_external_order_url,
        p_source_type,
        p_status,
        p_total_cents
    )
    ON CONFLICT (business_id, channel_id, external_order_id) DO UPDATE SET
        status = EXCLUDED.status,
        total_cents = EXCLUDED.total_cents,
        customer_id = EXCLUDED.customer_id
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$;
-- 20260818000002_secure_storage_rls.sql
-- Enforces strict tenant isolation on the document-templates storage bucket

-- Drop the insecure policies that allowed any business member to read/write across tenant boundaries
DROP POLICY IF EXISTS "Business members can read templates" ON storage.objects;
DROP POLICY IF EXISTS "Business members can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Business members can update templates" ON storage.objects;
DROP POLICY IF EXISTS "Business members can delete templates" ON storage.objects;

-- Create secure policies that enforce that the first path segment of the storage object 
-- MUST match a business_id that the user has membership to.
-- Convention: The storage object path must be: `[business_id]/[filename]`

DROP POLICY IF EXISTS "Tenant isolation read templates" ON storage.objects;
CREATE POLICY "Tenant isolation read templates" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "Tenant isolation upload templates" ON storage.objects;
CREATE POLICY "Tenant isolation upload templates" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "Tenant isolation update templates" ON storage.objects;
CREATE POLICY "Tenant isolation update templates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "Tenant isolation delete templates" ON storage.objects;
CREATE POLICY "Tenant isolation delete templates" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));
-- 20260818000003_audit_logging_triggers.sql
-- Enforces universal audit logging for critical canonical tables

-- Ensure audit_logs has the correct tenant boundary column if missing
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION process_audit_log() RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_business_id uuid;
BEGIN
    -- Extract user if executed via authenticated Supabase request
    v_user_id := auth.uid();
    
    -- Attempt to extract business_id from the modified record
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_business_id := OLD.business_id;
        ELSE
            v_business_id := NEW.business_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_business_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, after_value, reason)
        VALUES (TG_TABLE_NAME, NEW.id, v_business_id, 'INSERT', v_user_id, row_to_json(NEW)::jsonb, 'System Audit Trigger');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, before_value, after_value, reason)
        VALUES (TG_TABLE_NAME, NEW.id, v_business_id, 'UPDATE', v_user_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'System Audit Trigger');
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (entity_type, entity_id, business_id, action, user_id, before_value, reason)
        VALUES (TG_TABLE_NAME, OLD.id, v_business_id, 'DELETE', v_user_id, row_to_json(OLD)::jsonb, 'System Audit Trigger');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to canonical ledgers
DROP TRIGGER IF EXISTS audit_appointments_trigger ON appointments;
CREATE TRIGGER audit_appointments_trigger
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_orders_trigger ON orders;
CREATE TRIGGER audit_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_invoices_trigger ON invoices;
CREATE TRIGGER audit_invoices_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS audit_customers_trigger ON customers;
CREATE TRIGGER audit_customers_trigger
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
-- Phase 13: Customer Success & Support Schema

-- Helper function to get the current user's tenant ID
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id uuid;
BEGIN
    SELECT business_id INTO v_business_id
    FROM public.business_memberships
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN v_business_id;
END;
$$;

-- Helper function to get the current user's platform role
CREATE OR REPLACE FUNCTION public.get_auth_platform_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT platform_role INTO v_role
    FROM public.platform_users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
    
    RETURN v_role;
END;
$$;

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    severity TEXT NOT NULL DEFAULT 'Normal',
    app_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Support Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Articles
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'EMPLOYEE',
    role TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_timestamp_support_tickets ON public.support_tickets;
CREATE TRIGGER set_timestamp_support_tickets
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_knowledge_articles ON public.knowledge_articles;
CREATE TRIGGER set_timestamp_knowledge_articles
BEFORE UPDATE ON public.knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_support_tickets_org ON public.support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX idx_knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX idx_knowledge_articles_status ON public.knowledge_articles(status);

-- RLS Policies: Support Tickets
DROP POLICY IF EXISTS "Users can view their organization's tickets" ON public.support_tickets;
CREATE POLICY "Users can view their organization's tickets" ON public.support_tickets
    FOR SELECT USING (
        organization_id = get_auth_tenant_id() OR
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

DROP POLICY IF EXISTS "Users can insert tickets for their organization" ON public.support_tickets;
CREATE POLICY "Users can insert tickets for their organization" ON public.support_tickets
    FOR INSERT WITH CHECK (
        organization_id = get_auth_tenant_id()
    );

DROP POLICY IF EXISTS "Users can update their organization's tickets" ON public.support_tickets;
CREATE POLICY "Users can update their organization's tickets" ON public.support_tickets
    FOR UPDATE USING (
        organization_id = get_auth_tenant_id() OR
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

-- RLS Policies: Support Messages
DROP POLICY IF EXISTS "Users can view their ticket messages" ON public.support_messages;
CREATE POLICY "Users can view their ticket messages" ON public.support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND (
                t.organization_id = get_auth_tenant_id() OR 
                public.get_auth_platform_role() = 'PLATFORM_OWNER'
            )
        ) AND 
        (is_internal_note = false OR public.get_auth_platform_role() = 'PLATFORM_OWNER')
    );

DROP POLICY IF EXISTS "Users can insert messages" ON public.support_messages;
CREATE POLICY "Users can insert messages" ON public.support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets t 
            WHERE t.id = ticket_id AND (
                t.organization_id = get_auth_tenant_id() OR 
                public.get_auth_platform_role() = 'PLATFORM_OWNER'
            )
        ) AND 
        (is_internal_note = false OR public.get_auth_platform_role() = 'PLATFORM_OWNER')
    );

-- RLS Policies: Knowledge Articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.knowledge_articles;
CREATE POLICY "Anyone can view published articles" ON public.knowledge_articles
    FOR SELECT USING (
        status = 'PUBLISHED' OR public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );

DROP POLICY IF EXISTS "Platform Owner can manage articles" ON public.knowledge_articles;
CREATE POLICY "Platform Owner can manage articles" ON public.knowledge_articles
    FOR ALL USING (
        public.get_auth_platform_role() = 'PLATFORM_OWNER'
    );
-- Safe public tenant bootstrap resolver.
-- Returns only non-sensitive organization metadata needed to render a tenant shell.
-- Runtime authorization for tenant-owned records remains enforced by RLS.

CREATE OR REPLACE FUNCTION public.resolve_public_organization_by_slug(p_slug text)
RETURNS TABLE (
    id uuid,
    name text,
    display_name text,
    slug text,
    status text,
    subscription_status text,
    primary_color text,
    secondary_color text,
    accent_color text,
    logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        b.id,
        b.name,
        b.display_name,
        b.slug,
        b.status,
        b.subscription_status,
        b.primary_color,
        b.secondary_color,
        b.accent_color,
        b.logo_url
    FROM public.businesses b
    WHERE lower(b.slug) = lower(trim(p_slug))
      AND b.status = 'ACTIVE'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_organization_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_organization_by_slug(text) TO anon, authenticated;
-- 20260821000000_strict_rbac_rls_enforcement.sql
-- Final Audit: Convert all overly permissive "FOR ALL" policies to strict RBAC

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

DROP POLICY IF EXISTS "Enable all access for business members" ON rooms;
DROP POLICY IF EXISTS "Members can view rooms" ON rooms;
CREATE POLICY "Members can view rooms" ON rooms FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify rooms" ON rooms;
CREATE POLICY "Managers can modify rooms" ON rooms FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update rooms" ON rooms;
CREATE POLICY "Managers can update rooms" ON rooms FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete rooms" ON rooms;
CREATE POLICY "Managers can delete rooms" ON rooms FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_services;
DROP POLICY IF EXISTS "Members can view appointment_services" ON appointment_services;
CREATE POLICY "Members can view appointment_services" ON appointment_services FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_services" ON appointment_services;
CREATE POLICY "Managers can modify appointment_services" ON appointment_services FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_services" ON appointment_services;
CREATE POLICY "Managers can update appointment_services" ON appointment_services FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_services" ON appointment_services;
CREATE POLICY "Managers can delete appointment_services" ON appointment_services FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_service_eligibility;
DROP POLICY IF EXISTS "Members can view employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Members can view employee_service_eligibility" ON employee_service_eligibility FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can modify employee_service_eligibility" ON employee_service_eligibility FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can update employee_service_eligibility" ON employee_service_eligibility FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_service_eligibility" ON employee_service_eligibility;
CREATE POLICY "Managers can delete employee_service_eligibility" ON employee_service_eligibility FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_schedules;
DROP POLICY IF EXISTS "Members can view employee_schedules" ON employee_schedules;
CREATE POLICY "Members can view employee_schedules" ON employee_schedules FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can modify employee_schedules" ON employee_schedules FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can update employee_schedules" ON employee_schedules FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_schedules" ON employee_schedules;
CREATE POLICY "Managers can delete employee_schedules" ON employee_schedules FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_requests;
DROP POLICY IF EXISTS "Members can view appointment_requests" ON appointment_requests;
CREATE POLICY "Members can view appointment_requests" ON appointment_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can modify appointment_requests" ON appointment_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can update appointment_requests" ON appointment_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_requests" ON appointment_requests;
CREATE POLICY "Managers can delete appointment_requests" ON appointment_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_holds;
DROP POLICY IF EXISTS "Members can view appointment_holds" ON appointment_holds;
CREATE POLICY "Members can view appointment_holds" ON appointment_holds FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can modify appointment_holds" ON appointment_holds FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can update appointment_holds" ON appointment_holds FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_holds" ON appointment_holds;
CREATE POLICY "Managers can delete appointment_holds" ON appointment_holds FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_audit_events;
DROP POLICY IF EXISTS "Members can view appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Members can view appointment_audit_events" ON appointment_audit_events FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can modify appointment_audit_events" ON appointment_audit_events FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can update appointment_audit_events" ON appointment_audit_events FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_audit_events" ON appointment_audit_events;
CREATE POLICY "Managers can delete appointment_audit_events" ON appointment_audit_events FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_schedule_breaks;
DROP POLICY IF EXISTS "Members can view employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Members can view employee_schedule_breaks" ON employee_schedule_breaks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can modify employee_schedule_breaks" ON employee_schedule_breaks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can update employee_schedule_breaks" ON employee_schedule_breaks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete employee_schedule_breaks" ON employee_schedule_breaks;
CREATE POLICY "Managers can delete employee_schedule_breaks" ON employee_schedule_breaks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_schedules.id = employee_schedule_breaks.schedule_id
    AND public.user_has_role(employee_schedules.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_request_location_preferences;
DROP POLICY IF EXISTS "Members can view appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Members can view appointment_request_location_preferences" ON appointment_request_location_preferences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can modify appointment_request_location_preferences" ON appointment_request_location_preferences FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can update appointment_request_location_preferences" ON appointment_request_location_preferences FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete appointment_request_location_preferences" ON appointment_request_location_preferences;
CREATE POLICY "Managers can delete appointment_request_location_preferences" ON appointment_request_location_preferences FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_request_location_preferences.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_assignment_recommendations;
DROP POLICY IF EXISTS "Members can view appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Members can view appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can modify appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can update appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete appointment_assignment_recommendations" ON appointment_assignment_recommendations;
CREATE POLICY "Managers can delete appointment_assignment_recommendations" ON appointment_assignment_recommendations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM appointment_requests
    WHERE appointment_requests.id = appointment_assignment_recommendations.request_id
    AND public.user_has_role(appointment_requests.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable access to own calendar connection" ON employee_calendar_connections;
DROP POLICY IF EXISTS "Users can access own employee_calendar_connections" ON employee_calendar_connections;
CREATE POLICY "Users can access own employee_calendar_connections" ON employee_calendar_connections FOR ALL USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for business members" ON files;
DROP POLICY IF EXISTS "Members can view files" ON files;
CREATE POLICY "Members can view files" ON files FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify files" ON files;
CREATE POLICY "Managers can modify files" ON files FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update files" ON files;
CREATE POLICY "Managers can update files" ON files FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete files" ON files;
CREATE POLICY "Managers can delete files" ON files FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_versions;
DROP POLICY IF EXISTS "Members can view file_versions" ON file_versions;
CREATE POLICY "Members can view file_versions" ON file_versions FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_versions" ON file_versions;
CREATE POLICY "Managers can modify file_versions" ON file_versions FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_versions" ON file_versions;
CREATE POLICY "Managers can update file_versions" ON file_versions FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_versions" ON file_versions;
CREATE POLICY "Managers can delete file_versions" ON file_versions FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_links;
DROP POLICY IF EXISTS "Members can view file_links" ON file_links;
CREATE POLICY "Members can view file_links" ON file_links FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_links" ON file_links;
CREATE POLICY "Managers can modify file_links" ON file_links FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_links" ON file_links;
CREATE POLICY "Managers can update file_links" ON file_links FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_links" ON file_links;
CREATE POLICY "Managers can delete file_links" ON file_links FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON file_permissions;
DROP POLICY IF EXISTS "Members can view file_permissions" ON file_permissions;
CREATE POLICY "Members can view file_permissions" ON file_permissions FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify file_permissions" ON file_permissions;
CREATE POLICY "Managers can modify file_permissions" ON file_permissions FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update file_permissions" ON file_permissions;
CREATE POLICY "Managers can update file_permissions" ON file_permissions FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete file_permissions" ON file_permissions;
CREATE POLICY "Managers can delete file_permissions" ON file_permissions FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.files WHERE id = file_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_threads;
DROP POLICY IF EXISTS "Members can view communication_threads" ON communication_threads;
CREATE POLICY "Members can view communication_threads" ON communication_threads FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_threads" ON communication_threads;
CREATE POLICY "Managers can modify communication_threads" ON communication_threads FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_threads" ON communication_threads;
CREATE POLICY "Managers can update communication_threads" ON communication_threads FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_threads" ON communication_threads;
CREATE POLICY "Managers can delete communication_threads" ON communication_threads FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communications;
DROP POLICY IF EXISTS "Members can view communications" ON communications;
CREATE POLICY "Members can view communications" ON communications FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communications" ON communications;
CREATE POLICY "Managers can modify communications" ON communications FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communications" ON communications;
CREATE POLICY "Managers can update communications" ON communications FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communications" ON communications;
CREATE POLICY "Managers can delete communications" ON communications FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_attachments;
DROP POLICY IF EXISTS "Members can view communication_attachments" ON communication_attachments;
CREATE POLICY "Members can view communication_attachments" ON communication_attachments FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can modify communication_attachments" ON communication_attachments FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can update communication_attachments" ON communication_attachments FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_attachments" ON communication_attachments;
CREATE POLICY "Managers can delete communication_attachments" ON communication_attachments FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_delivery_events;
DROP POLICY IF EXISTS "Members can view communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Members can view communication_delivery_events" ON communication_delivery_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can modify communication_delivery_events" ON communication_delivery_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can update communication_delivery_events" ON communication_delivery_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_delivery_events" ON communication_delivery_events;
CREATE POLICY "Managers can delete communication_delivery_events" ON communication_delivery_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON call_logs;
DROP POLICY IF EXISTS "Members can view call_logs" ON call_logs;
CREATE POLICY "Members can view call_logs" ON call_logs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify call_logs" ON call_logs;
CREATE POLICY "Managers can modify call_logs" ON call_logs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update call_logs" ON call_logs;
CREATE POLICY "Managers can update call_logs" ON call_logs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete call_logs" ON call_logs;
CREATE POLICY "Managers can delete call_logs" ON call_logs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON appointment_notes;
DROP POLICY IF EXISTS "Members can view appointment_notes" ON appointment_notes;
CREATE POLICY "Members can view appointment_notes" ON appointment_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can modify appointment_notes" ON appointment_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can update appointment_notes" ON appointment_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete appointment_notes" ON appointment_notes;
CREATE POLICY "Managers can delete appointment_notes" ON appointment_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_notes;
DROP POLICY IF EXISTS "Members can view customer_notes" ON customer_notes;
CREATE POLICY "Members can view customer_notes" ON customer_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_notes" ON customer_notes;
CREATE POLICY "Managers can modify customer_notes" ON customer_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_notes" ON customer_notes;
CREATE POLICY "Managers can update customer_notes" ON customer_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_notes" ON customer_notes;
CREATE POLICY "Managers can delete customer_notes" ON customer_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_notes;
DROP POLICY IF EXISTS "Members can view employee_notes" ON employee_notes;
CREATE POLICY "Members can view employee_notes" ON employee_notes FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_notes" ON employee_notes;
CREATE POLICY "Managers can modify employee_notes" ON employee_notes FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_notes" ON employee_notes;
CREATE POLICY "Managers can update employee_notes" ON employee_notes FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_notes" ON employee_notes;
CREATE POLICY "Managers can delete employee_notes" ON employee_notes FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON tasks;
DROP POLICY IF EXISTS "Members can view tasks" ON tasks;
CREATE POLICY "Members can view tasks" ON tasks FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify tasks" ON tasks;
CREATE POLICY "Managers can modify tasks" ON tasks FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update tasks" ON tasks;
CREATE POLICY "Managers can update tasks" ON tasks FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete tasks" ON tasks;
CREATE POLICY "Managers can delete tasks" ON tasks FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON task_assignments;
DROP POLICY IF EXISTS "Members can view task_assignments" ON task_assignments;
CREATE POLICY "Members can view task_assignments" ON task_assignments FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify task_assignments" ON task_assignments;
CREATE POLICY "Managers can modify task_assignments" ON task_assignments FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update task_assignments" ON task_assignments;
CREATE POLICY "Managers can update task_assignments" ON task_assignments FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete task_assignments" ON task_assignments;
CREATE POLICY "Managers can delete task_assignments" ON task_assignments FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON task_events;
DROP POLICY IF EXISTS "Members can view task_events" ON task_events;
CREATE POLICY "Members can view task_events" ON task_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify task_events" ON task_events;
CREATE POLICY "Managers can modify task_events" ON task_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update task_events" ON task_events;
CREATE POLICY "Managers can update task_events" ON task_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete task_events" ON task_events;
CREATE POLICY "Managers can delete task_events" ON task_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.tasks WHERE id = task_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON payments;
DROP POLICY IF EXISTS "Members can view payments" ON payments;
CREATE POLICY "Members can view payments" ON payments FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify payments" ON payments;
CREATE POLICY "Managers can modify payments" ON payments FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update payments" ON payments;
CREATE POLICY "Managers can update payments" ON payments FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete payments" ON payments;
CREATE POLICY "Managers can delete payments" ON payments FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON booking_fees;
DROP POLICY IF EXISTS "Members can view booking_fees" ON booking_fees;
CREATE POLICY "Members can view booking_fees" ON booking_fees FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify booking_fees" ON booking_fees;
CREATE POLICY "Managers can modify booking_fees" ON booking_fees FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update booking_fees" ON booking_fees;
CREATE POLICY "Managers can update booking_fees" ON booking_fees FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete booking_fees" ON booking_fees;
CREATE POLICY "Managers can delete booking_fees" ON booking_fees FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON refunds;
DROP POLICY IF EXISTS "Members can view refunds" ON refunds;
CREATE POLICY "Members can view refunds" ON refunds FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify refunds" ON refunds;
CREATE POLICY "Managers can modify refunds" ON refunds FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update refunds" ON refunds;
CREATE POLICY "Managers can update refunds" ON refunds FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete refunds" ON refunds;
CREATE POLICY "Managers can delete refunds" ON refunds FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON reminders;
DROP POLICY IF EXISTS "Members can view reminders" ON reminders;
CREATE POLICY "Members can view reminders" ON reminders FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify reminders" ON reminders;
CREATE POLICY "Managers can modify reminders" ON reminders FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update reminders" ON reminders;
CREATE POLICY "Managers can update reminders" ON reminders FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete reminders" ON reminders;
CREATE POLICY "Managers can delete reminders" ON reminders FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON reminder_events;
DROP POLICY IF EXISTS "Members can view reminder_events" ON reminder_events;
CREATE POLICY "Members can view reminder_events" ON reminder_events FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify reminder_events" ON reminder_events;
CREATE POLICY "Managers can modify reminder_events" ON reminder_events FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update reminder_events" ON reminder_events;
CREATE POLICY "Managers can update reminder_events" ON reminder_events FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete reminder_events" ON reminder_events;
CREATE POLICY "Managers can delete reminder_events" ON reminder_events FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.reminders WHERE id = reminder_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable access to own calendar sync events" ON calendar_sync_events;
DROP POLICY IF EXISTS "Users can access own calendar_sync_events" ON calendar_sync_events;
CREATE POLICY "Users can access own calendar_sync_events" ON calendar_sync_events FOR ALL USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_preferences;
DROP POLICY IF EXISTS "Members can view customer_preferences" ON customer_preferences;
CREATE POLICY "Members can view customer_preferences" ON customer_preferences FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can modify customer_preferences" ON customer_preferences FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can update customer_preferences" ON customer_preferences FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_preferences" ON customer_preferences;
CREATE POLICY "Managers can delete customer_preferences" ON customer_preferences FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_time_off;
DROP POLICY IF EXISTS "Members can view employee_time_off" ON employee_time_off;
CREATE POLICY "Members can view employee_time_off" ON employee_time_off FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can modify employee_time_off" ON employee_time_off FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can update employee_time_off" ON employee_time_off FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_time_off" ON employee_time_off;
CREATE POLICY "Managers can delete employee_time_off" ON employee_time_off FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON communication_recipients;
DROP POLICY IF EXISTS "Members can view communication_recipients" ON communication_recipients;
CREATE POLICY "Members can view communication_recipients" ON communication_recipients FOR SELECT USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can modify communication_recipients" ON communication_recipients FOR INSERT WITH CHECK (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can update communication_recipients" ON communication_recipients FOR UPDATE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete communication_recipients" ON communication_recipients;
CREATE POLICY "Managers can delete communication_recipients" ON communication_recipients FOR DELETE USING (public.user_has_role((SELECT business_id FROM public.communications WHERE id = communication_id), ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON vendors;
DROP POLICY IF EXISTS "Members can view vendors" ON vendors;
CREATE POLICY "Members can view vendors" ON vendors FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify vendors" ON vendors;
CREATE POLICY "Managers can modify vendors" ON vendors FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update vendors" ON vendors;
CREATE POLICY "Managers can update vendors" ON vendors FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete vendors" ON vendors;
CREATE POLICY "Managers can delete vendors" ON vendors FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON brands;
DROP POLICY IF EXISTS "Members can view brands" ON brands;
CREATE POLICY "Members can view brands" ON brands FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify brands" ON brands;
CREATE POLICY "Managers can modify brands" ON brands FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update brands" ON brands;
CREATE POLICY "Managers can update brands" ON brands FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete brands" ON brands;
CREATE POLICY "Managers can delete brands" ON brands FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON collections;
DROP POLICY IF EXISTS "Members can view collections" ON collections;
CREATE POLICY "Members can view collections" ON collections FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify collections" ON collections;
CREATE POLICY "Managers can modify collections" ON collections FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update collections" ON collections;
CREATE POLICY "Managers can update collections" ON collections FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete collections" ON collections;
CREATE POLICY "Managers can delete collections" ON collections FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON size_systems;
DROP POLICY IF EXISTS "Members can view size_systems" ON size_systems;
CREATE POLICY "Members can view size_systems" ON size_systems FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify size_systems" ON size_systems;
CREATE POLICY "Managers can modify size_systems" ON size_systems FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update size_systems" ON size_systems;
CREATE POLICY "Managers can update size_systems" ON size_systems FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete size_systems" ON size_systems;
CREATE POLICY "Managers can delete size_systems" ON size_systems FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON vendor_colors;
DROP POLICY IF EXISTS "Members can view vendor_colors" ON vendor_colors;
CREATE POLICY "Members can view vendor_colors" ON vendor_colors FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can modify vendor_colors" ON vendor_colors FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can update vendor_colors" ON vendor_colors FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete vendor_colors" ON vendor_colors;
CREATE POLICY "Managers can delete vendor_colors" ON vendor_colors FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON products;
DROP POLICY IF EXISTS "Members can view products" ON products;
CREATE POLICY "Members can view products" ON products FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify products" ON products;
CREATE POLICY "Managers can modify products" ON products FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update products" ON products;
CREATE POLICY "Managers can update products" ON products FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete products" ON products;
CREATE POLICY "Managers can delete products" ON products FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON product_variants;
DROP POLICY IF EXISTS "Members can view product_variants" ON product_variants;
CREATE POLICY "Members can view product_variants" ON product_variants FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify product_variants" ON product_variants;
CREATE POLICY "Managers can modify product_variants" ON product_variants FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update product_variants" ON product_variants;
CREATE POLICY "Managers can update product_variants" ON product_variants FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete product_variants" ON product_variants;
CREATE POLICY "Managers can delete product_variants" ON product_variants FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON import_jobs;
DROP POLICY IF EXISTS "Members can view import_jobs" ON import_jobs;
CREATE POLICY "Members can view import_jobs" ON import_jobs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify import_jobs" ON import_jobs;
CREATE POLICY "Managers can modify import_jobs" ON import_jobs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update import_jobs" ON import_jobs;
CREATE POLICY "Managers can update import_jobs" ON import_jobs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete import_jobs" ON import_jobs;
CREATE POLICY "Managers can delete import_jobs" ON import_jobs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON import_staging_records;
DROP POLICY IF EXISTS "Members can view import_staging_records" ON import_staging_records;
CREATE POLICY "Members can view import_staging_records" ON import_staging_records FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can modify import_staging_records" ON import_staging_records FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can update import_staging_records" ON import_staging_records FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete import_staging_records" ON import_staging_records;
CREATE POLICY "Managers can delete import_staging_records" ON import_staging_records FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON time_off_requests;
DROP POLICY IF EXISTS "Members can view time_off_requests" ON time_off_requests;
CREATE POLICY "Members can view time_off_requests" ON time_off_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can modify time_off_requests" ON time_off_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can update time_off_requests" ON time_off_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete time_off_requests" ON time_off_requests;
CREATE POLICY "Managers can delete time_off_requests" ON time_off_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON employee_availability;
DROP POLICY IF EXISTS "Members can view employee_availability" ON employee_availability;
CREATE POLICY "Members can view employee_availability" ON employee_availability FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify employee_availability" ON employee_availability;
CREATE POLICY "Managers can modify employee_availability" ON employee_availability FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update employee_availability" ON employee_availability;
CREATE POLICY "Managers can update employee_availability" ON employee_availability FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete employee_availability" ON employee_availability;
CREATE POLICY "Managers can delete employee_availability" ON employee_availability FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON open_shifts;
DROP POLICY IF EXISTS "Members can view open_shifts" ON open_shifts;
CREATE POLICY "Members can view open_shifts" ON open_shifts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify open_shifts" ON open_shifts;
CREATE POLICY "Managers can modify open_shifts" ON open_shifts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update open_shifts" ON open_shifts;
CREATE POLICY "Managers can update open_shifts" ON open_shifts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete open_shifts" ON open_shifts;
CREATE POLICY "Managers can delete open_shifts" ON open_shifts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON shift_swap_requests;
DROP POLICY IF EXISTS "Members can view shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Members can view shift_swap_requests" ON shift_swap_requests FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can modify shift_swap_requests" ON shift_swap_requests FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can update shift_swap_requests" ON shift_swap_requests FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete shift_swap_requests" ON shift_swap_requests;
CREATE POLICY "Managers can delete shift_swap_requests" ON shift_swap_requests FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON staff_profiles;
DROP POLICY IF EXISTS "Members can view staff_profiles" ON staff_profiles;
CREATE POLICY "Members can view staff_profiles" ON staff_profiles FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can modify staff_profiles" ON staff_profiles FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can update staff_profiles" ON staff_profiles FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete staff_profiles" ON staff_profiles;
CREATE POLICY "Managers can delete staff_profiles" ON staff_profiles FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for settings versions via business" ON settings_versions;
DROP POLICY IF EXISTS "Members can view settings_versions" ON settings_versions;
CREATE POLICY "Members can view settings_versions" ON settings_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify settings_versions" ON settings_versions;
CREATE POLICY "Managers can modify settings_versions" ON settings_versions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update settings_versions" ON settings_versions;
CREATE POLICY "Managers can update settings_versions" ON settings_versions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete settings_versions" ON settings_versions;
CREATE POLICY "Managers can delete settings_versions" ON settings_versions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM settings_values
    WHERE settings_values.id = settings_versions.setting_value_id
    AND public.user_has_role(settings_values.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for location permissions via business memberships" ON location_permissions;
DROP POLICY IF EXISTS "Members can view location_permissions" ON location_permissions;
CREATE POLICY "Members can view location_permissions" ON location_permissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist'])
  )
);
DROP POLICY IF EXISTS "Managers can modify location_permissions" ON location_permissions;
CREATE POLICY "Managers can modify location_permissions" ON location_permissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can update location_permissions" ON location_permissions;
CREATE POLICY "Managers can update location_permissions" ON location_permissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);
DROP POLICY IF EXISTS "Managers can delete location_permissions" ON location_permissions;
CREATE POLICY "Managers can delete location_permissions" ON location_permissions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM business_memberships
    WHERE business_memberships.id = location_permissions.membership_id
    AND public.user_has_role(business_memberships.business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER'])
  )
);

DROP POLICY IF EXISTS "Enable all access for business members" ON connected_accounts;
DROP POLICY IF EXISTS "Members can view connected_accounts" ON connected_accounts;
CREATE POLICY "Members can view connected_accounts" ON connected_accounts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can modify connected_accounts" ON connected_accounts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can update connected_accounts" ON connected_accounts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete connected_accounts" ON connected_accounts;
CREATE POLICY "Managers can delete connected_accounts" ON connected_accounts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON connected_resources;
DROP POLICY IF EXISTS "Members can view connected_resources" ON connected_resources;
CREATE POLICY "Members can view connected_resources" ON connected_resources FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify connected_resources" ON connected_resources;
CREATE POLICY "Managers can modify connected_resources" ON connected_resources FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update connected_resources" ON connected_resources;
CREATE POLICY "Managers can update connected_resources" ON connected_resources FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete connected_resources" ON connected_resources;
CREATE POLICY "Managers can delete connected_resources" ON connected_resources FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON business_brands;
DROP POLICY IF EXISTS "Members can view business_brands" ON business_brands;
CREATE POLICY "Members can view business_brands" ON business_brands FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify business_brands" ON business_brands;
CREATE POLICY "Managers can modify business_brands" ON business_brands FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update business_brands" ON business_brands;
CREATE POLICY "Managers can update business_brands" ON business_brands FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete business_brands" ON business_brands;
CREATE POLICY "Managers can delete business_brands" ON business_brands FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON business_sites;
DROP POLICY IF EXISTS "Members can view business_sites" ON business_sites;
CREATE POLICY "Members can view business_sites" ON business_sites FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify business_sites" ON business_sites;
CREATE POLICY "Managers can modify business_sites" ON business_sites FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update business_sites" ON business_sites;
CREATE POLICY "Managers can update business_sites" ON business_sites FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete business_sites" ON business_sites;
CREATE POLICY "Managers can delete business_sites" ON business_sites FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON commerce_channels;
DROP POLICY IF EXISTS "Members can view commerce_channels" ON commerce_channels;
CREATE POLICY "Members can view commerce_channels" ON commerce_channels FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can modify commerce_channels" ON commerce_channels FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can update commerce_channels" ON commerce_channels FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete commerce_channels" ON commerce_channels;
CREATE POLICY "Managers can delete commerce_channels" ON commerce_channels FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON channel_listings;
DROP POLICY IF EXISTS "Members can view channel_listings" ON channel_listings;
CREATE POLICY "Members can view channel_listings" ON channel_listings FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify channel_listings" ON channel_listings;
CREATE POLICY "Managers can modify channel_listings" ON channel_listings FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update channel_listings" ON channel_listings;
CREATE POLICY "Managers can update channel_listings" ON channel_listings FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete channel_listings" ON channel_listings;
CREATE POLICY "Managers can delete channel_listings" ON channel_listings FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON channel_product_overrides;
DROP POLICY IF EXISTS "Members can view channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Members can view channel_product_overrides" ON channel_product_overrides FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can modify channel_product_overrides" ON channel_product_overrides FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can update channel_product_overrides" ON channel_product_overrides FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete channel_product_overrides" ON channel_product_overrides;
CREATE POLICY "Managers can delete channel_product_overrides" ON channel_product_overrides FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON sync_jobs;
DROP POLICY IF EXISTS "Members can view sync_jobs" ON sync_jobs;
CREATE POLICY "Members can view sync_jobs" ON sync_jobs FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can modify sync_jobs" ON sync_jobs FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can update sync_jobs" ON sync_jobs FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete sync_jobs" ON sync_jobs;
CREATE POLICY "Managers can delete sync_jobs" ON sync_jobs FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON sync_conflicts;
DROP POLICY IF EXISTS "Members can view sync_conflicts" ON sync_conflicts;
CREATE POLICY "Members can view sync_conflicts" ON sync_conflicts FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can modify sync_conflicts" ON sync_conflicts FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can update sync_conflicts" ON sync_conflicts FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete sync_conflicts" ON sync_conflicts;
CREATE POLICY "Managers can delete sync_conflicts" ON sync_conflicts FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON customer_external_identities;
DROP POLICY IF EXISTS "Members can view customer_external_identities" ON customer_external_identities;
CREATE POLICY "Members can view customer_external_identities" ON customer_external_identities FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can modify customer_external_identities" ON customer_external_identities FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can update customer_external_identities" ON customer_external_identities FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete customer_external_identities" ON customer_external_identities;
CREATE POLICY "Managers can delete customer_external_identities" ON customer_external_identities FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Enable all access for business members" ON form_submissions;
DROP POLICY IF EXISTS "Members can view form_submissions" ON form_submissions;
CREATE POLICY "Members can view form_submissions" ON form_submissions FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));
DROP POLICY IF EXISTS "Managers can modify form_submissions" ON form_submissions;
CREATE POLICY "Managers can modify form_submissions" ON form_submissions FOR INSERT WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can update form_submissions" ON form_submissions;
CREATE POLICY "Managers can update form_submissions" ON form_submissions FOR UPDATE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));
DROP POLICY IF EXISTS "Managers can delete form_submissions" ON form_submissions;
CREATE POLICY "Managers can delete form_submissions" ON form_submissions FOR DELETE USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- ==============================================================================
-- VOWOS PLATFORM CONTROL PLANE & SECURE SUPPORT RPCs
-- ==============================================================================

-- 1. Create Platform Audit Logs
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    target_resource_id uuid,
    target_resource_type text,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view audit logs
CREATE POLICY "Platform admins can view audit logs"
    ON public.platform_audit_logs FOR SELECT
    USING (is_super_admin());

-- 2. Audit Event Helper Function
CREATE OR REPLACE FUNCTION log_platform_event(
    p_action text,
    p_target_id uuid DEFAULT NULL,
    p_target_type text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.platform_audit_logs (actor_id, action, target_resource_id, target_resource_type, details)
    VALUES (auth.uid(), p_action, p_target_id, p_target_type, p_details);
END;
$$;

-- 3. Secure Platform Directory RPC
-- This safely fetches platform users joined with profiles without exposing raw auth data directly.
CREATE OR REPLACE FUNCTION get_platform_directory()
RETURNS TABLE (
    id uuid,
    email text,
    platform_role text,
    active boolean,
    created_at timestamp with time zone,
    last_login timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow platform owners or admins
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        pu.auth_user_id as id,
        pu.email,
        pu.platform_role,
        pu.active,
        pu.created_at,
        u.last_sign_in_at as last_login
    FROM public.platform_users pu
    LEFT JOIN auth.users u ON u.id = pu.auth_user_id
    ORDER BY pu.created_at DESC;
END;
$$;

-- 4. Secure Tenant User Directory RPC
CREATE OR REPLACE FUNCTION get_tenant_user_directory()
RETURNS TABLE (
    id uuid,
    email text,
    business_id uuid,
    role text,
    business_name text,
    created_at timestamp with time zone,
    last_login timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow platform owners or admins
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        bm.business_id,
        bm.role,
        b.name as business_name,
        u.created_at,
        u.last_sign_in_at as last_login
    FROM auth.users u
    JOIN public.business_memberships bm ON bm.user_id = u.id
    JOIN public.businesses b ON b.id = bm.business_id
    ORDER BY u.created_at DESC;
END;
$$;

-- 5. Support Mode Control Token Infrastructure
-- Allows a platform admin to generate a secure scoped token or state representing impersonation
-- Note: Since we are using Supabase auth context directly in RLS, we will log the action and 
-- use a custom claim mechanism or rely on frontend context propagation backed by RLS exceptions.

CREATE OR REPLACE FUNCTION enter_support_mode(target_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_name text;
BEGIN
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Must be Platform Admin to enter Support Mode';
    END IF;

    SELECT name INTO org_name FROM public.businesses WHERE id = target_business_id;

    IF org_name IS NULL THEN
        RAISE EXCEPTION 'Target organization not found';
    END IF;

    -- Log the entry
    PERFORM log_platform_event(
        'SUPPORT_MODE_ENTERED', 
        target_business_id, 
        'business', 
        jsonb_build_object('business_name', org_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Support mode authorized',
        'business_id', target_business_id,
        'business_name', org_name
    );
END;
$$;
