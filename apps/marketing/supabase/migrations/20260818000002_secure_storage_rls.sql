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

CREATE POLICY "Tenant isolation read templates" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

CREATE POLICY "Tenant isolation upload templates" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

CREATE POLICY "Tenant isolation update templates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));

CREATE POLICY "Tenant isolation delete templates" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships WHERE business_id::text = (storage.foldername(name))[1]
    )));
