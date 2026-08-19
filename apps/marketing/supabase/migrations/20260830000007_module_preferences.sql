-- Fix for partial application in prod: rename mistakenly created organization_id columns to business_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_module_preferences' AND column_name = 'organization_id') THEN
        ALTER TABLE public.organization_module_preferences RENAME COLUMN organization_id TO business_id;
    END IF;
END $$;

-- Create the organization_module_preferences table
CREATE TABLE IF NOT EXISTS public.organization_module_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(business_id, module_id)
);

-- Enable RLS
ALTER TABLE public.organization_module_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their organization module preferences" ON public.organization_module_preferences;
CREATE POLICY "Users can view their organization module preferences"
    ON public.organization_module_preferences
    FOR SELECT
    USING (
        business_id IN (
            SELECT business_id 
            FROM public.business_memberships 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners and Managers can update their organization module preferences" ON public.organization_module_preferences;
CREATE POLICY "Owners and Managers can update their organization module preferences"
    ON public.organization_module_preferences
    FOR ALL
    USING (
        business_id IN (
            SELECT business_id 
            FROM public.business_memberships 
            WHERE user_id = auth.uid() 
            AND role IN ('ORG_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_MANAGER')
        )
    );
