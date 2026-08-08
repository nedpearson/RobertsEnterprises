-- 20260807000005_document_templates.sql

CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_plane TEXT DEFAULT 'production',
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    document_type TEXT NOT NULL,
    template_name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    file_path TEXT,
    file_type TEXT,
    logo_url TEXT,
    
    header_text TEXT,
    footer_text TEXT,
    terms_text TEXT,
    
    field_mappings JSONB DEFAULT '{}'::jsonb,
    signature_blocks JSONB DEFAULT '[]'::jsonb,
    
    typography JSONB DEFAULT '{"font": "Inter", "size": "10pt"}'::jsonb,
    margins JSONB DEFAULT '{"top": 1, "bottom": 1, "left": 1, "right": 1}'::jsonb,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for business members" ON document_templates
    FOR SELECT
    USING (
        business_id IS NULL OR 
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Enable modify for business members" ON document_templates
    FOR ALL
    USING (
        business_id IS NULL OR 
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    );

-- Storage Bucket for Templates
INSERT INTO storage.buckets (id, name, public) VALUES ('document-templates', 'document-templates', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Business members can read templates" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships
    )));

CREATE POLICY "Business members can upload templates" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships
    )));

CREATE POLICY "Business members can update templates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships
    )));

CREATE POLICY "Business members can delete templates" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'document-templates' AND (auth.uid() IN (
        SELECT user_id FROM business_memberships
    )));
