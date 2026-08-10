-- 20260811000000_vowos_control_plane.sql
-- Establishes the Central VowOS Control Plane.
-- This represents the absolute architectural shift from "Single Monolith CRM"
-- to a "Multi-Tenant SaaS Control Plane". 

CREATE TABLE vowos_tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    primary_domain text UNIQUE,
    db_url text NOT NULL,
    anon_key text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE vowos_tenant_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES vowos_tenants(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'staff',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

CREATE TABLE vowos_tenant_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES vowos_tenants(id) ON DELETE CASCADE,
    logo_url text,
    primary_color text DEFAULT '#000000',
    secondary_color text DEFAULT '#ffffff',
    font_family text DEFAULT 'Inter',
    created_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id)
);

CREATE TABLE vowos_subscriptions (
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
CREATE POLICY "Users can view their assigned tenants" ON vowos_tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM vowos_tenant_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view their tenant brand" ON vowos_tenant_brands
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM vowos_tenant_users WHERE user_id = auth.uid())
    );

-- Seed Initial Control Plane Data for Roberts Enterprises and Demo
INSERT INTO vowos_tenants (name, slug, primary_domain, db_url, anon_key)
VALUES 
  ('Roberts Enterprises', 'roberts-enterprises', 'robertsenterprises.bridgebox.ai', 'ENV:VITE_SUPABASE_URL', 'ENV:VITE_SUPABASE_ANON_KEY'),
  ('VowOS Demo', 'demo', 'vowos.bridgebox.ai', 'ENV:VITE_DEMO_SUPABASE_URL', 'ENV:DEMO_SUPABASE_ANON_KEY');

-- Note: The anon_keys and db_urls will be dynamically hydrated by the worker node layer 
-- replacing 'ENV:...' with the actual environment variable values to prevent leaking 
-- secrets into the database while maintaining the database-per-tenant architecture.
