-- ==============================================================================
-- VOWOS ENTERPRISE SECURITY & DATA GOVERNANCE MIGRATION
-- ==============================================================================

-- 1. SECURE PLATFORM LEADS
-- Only platform users can view/manage platform leads. Tenants cannot access this.
ALTER TABLE IF EXISTS "public"."platform_leads" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view all leads" ON "public"."platform_leads";
CREATE POLICY "Platform admins can view all leads" ON "public"."platform_leads"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (raw_user_meta_data->>'platform_role' IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT'))
  )
);

DROP POLICY IF EXISTS "Platform admins can manage leads" ON "public"."platform_leads";
CREATE POLICY "Platform admins can manage leads" ON "public"."platform_leads"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (raw_user_meta_data->>'platform_role' IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN'))
  )
);

-- Note: The marketing site inserts leads directly via anon/public currently.
-- We must allow anon inserts for public lead generation forms.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON "public"."platform_leads";
CREATE POLICY "Anyone can submit a lead" ON "public"."platform_leads"
FOR INSERT WITH CHECK (true);


-- 2. SECURE ORGANIZATIONS
-- A user can only view organizations they are a member of, or if they are a Platform Admin.
ALTER TABLE IF EXISTS "public"."businesses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organizations" ON "public"."businesses";
CREATE POLICY "Users can view their own organizations" ON "public"."businesses"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "public"."staff_profiles"
    WHERE staff_profiles.user_id = auth.uid()
    AND staff_profiles.business_id = businesses.id
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (raw_user_meta_data->>'platform_role' IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT'))
  )
);

-- Only Platform Owners can create/delete organizations.
DROP POLICY IF EXISTS "Only Platform Owners can delete organizations" ON "public"."businesses";
CREATE POLICY "Only Platform Owners can delete organizations" ON "public"."businesses"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND raw_user_meta_data->>'platform_role' = 'PLATFORM_OWNER'
  )
);


-- 3. AUDIT LOGS TRIGGER
-- Create a generic function to log critical actions.
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid REFERENCES "public"."businesses"(id),
    actor_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own audit logs.
DROP POLICY IF EXISTS "Tenants can view their own audit logs" ON "public"."audit_logs";
CREATE POLICY "Tenants can view their own audit logs" ON "public"."audit_logs"
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM staff_profiles WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (raw_user_meta_data->>'platform_role' IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN'))
  )
);

-- Nobody can delete audit logs (IMMUTABLE).
DROP POLICY IF EXISTS "Nobody can delete audit logs" ON "public"."audit_logs";
CREATE POLICY "Nobody can delete audit logs" ON "public"."audit_logs"
FOR DELETE USING (false);

-- Nobody can update audit logs (IMMUTABLE).
DROP POLICY IF EXISTS "Nobody can update audit logs" ON "public"."audit_logs";
CREATE POLICY "Nobody can update audit logs" ON "public"."audit_logs"
FOR UPDATE USING (false);


-- 4. STORAGE SECURITY
-- Secure the 'tenant-documents' bucket.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Allow users to upload and view documents only in their organization's folder.
-- Path structure: <organization_id>/<filename>
DROP POLICY IF EXISTS "Users can view their organization documents" ON storage.objects;
CREATE POLICY "Users can view their organization documents" ON storage.objects
FOR SELECT USING (
    bucket_id = 'tenant-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM staff_profiles WHERE user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND (raw_user_meta_data->>'platform_role' IN ('PLATFORM_OWNER', 'PLATFORM_ADMIN'))
        )
    )
);

DROP POLICY IF EXISTS "Users can upload to their organization documents" ON storage.objects;
CREATE POLICY "Users can upload to their organization documents" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM staff_profiles WHERE user_id = auth.uid()
    )
);

-- Ensure 'public-assets' is public for reads, but requires auth for writes.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public assets are publicly viewable" ON storage.objects;
CREATE POLICY "Public assets are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Users can upload public assets" ON storage.objects;
CREATE POLICY "Users can upload public assets" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'public-assets'
    AND auth.role() = 'authenticated'
);
