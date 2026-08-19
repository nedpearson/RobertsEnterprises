-- Create the organization_module_preferences table
CREATE TABLE IF NOT EXISTS public.organization_module_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, module_id)
);

-- Enable RLS
ALTER TABLE public.organization_module_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization module preferences"
    ON public.organization_module_preferences
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Managers can update their organization module preferences"
    ON public.organization_module_preferences
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('Owner', 'Manager')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() AND role IN ('Owner', 'Manager')
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_organization_module_preferences_updated_at
    BEFORE UPDATE ON public.organization_module_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
