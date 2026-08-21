
-- 1. Standardized System Events Table
CREATE TABLE IF NOT EXISTS public.system_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    organization_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'INFO',
    created_at timestamptz DEFAULT now()
);

-- Index for querying events by organization and type
CREATE INDEX IF NOT EXISTS idx_system_events_org ON public.system_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_events(created_at DESC);

-- 2. Modify handle_new_user to emit an event
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- If skip_auto_provision is set in metadata, do not create a default business
  IF NEW.raw_user_meta_data->>'skip_auto_provision' = 'true' THEN
    RETURN NEW;
  END IF;

  -- We don't auto-create if a membership was somehow already seeded (unlikely in normal flow)
  IF NOT EXISTS (SELECT 1 FROM public.business_memberships WHERE user_id = NEW.id) THEN
    v_business_id := gen_random_uuid();
    
    INSERT INTO public.businesses (id, name, organization_type)
    VALUES (v_business_id, COALESCE(NEW.raw_user_meta_data->>'name', 'My Business') || '''s Business', 'TRIAL');

    INSERT INTO public.business_memberships (user_id, business_id, role)
    VALUES (NEW.id, v_business_id, 'Owner');

    INSERT INTO public.locations (id, business_id, name, address)
    VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');
    
    -- Emit domain event
    INSERT INTO public.system_events (event_type, organization_id, actor_id, severity, payload)
    VALUES (
      'organization.created', 
      v_business_id, 
      NEW.id, 
      'INFO', 
      jsonb_build_object('source', 'signup', 'user_email', NEW.email)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Data Freshness Engine (Integration Sync Status)
CREATE TABLE IF NOT EXISTS public.integration_sync_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    integration_type text NOT NULL,
    status text NOT NULL DEFAULT 'LIVE',
    last_successful_sync timestamptz,
    last_attempt timestamptz,
    error_message text,
    records_processed integer DEFAULT 0,
    next_sync timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, integration_type)
);

-- 4. Health Scoring Engine (Materialized View or SQL View)
CREATE OR REPLACE VIEW public.organization_health_scores AS
SELECT 
    b.id as organization_id,
    b.name as organization_name,
    b.organization_type,
    (
        100 
        - CASE WHEN (SELECT count(*) FROM public.business_memberships WHERE business_id = b.id) = 0 THEN 20 ELSE 0 END
        - CASE WHEN (SELECT count(*) FROM public.integration_sync_status WHERE organization_id = b.id AND status = 'FAILED') > 0 THEN 15 ELSE 0 END
        - CASE WHEN (SELECT count(*) FROM public.support_tickets WHERE business_id = b.id AND status = 'OPEN' AND severity = 'CRITICAL') > 0 THEN 25 ELSE 0 END
    ) as health_score,
    CASE 
        WHEN (SELECT count(*) FROM public.support_tickets WHERE business_id = b.id AND status = 'OPEN' AND severity = 'CRITICAL') > 0 THEN 'CRITICAL'
        WHEN (SELECT count(*) FROM public.integration_sync_status WHERE organization_id = b.id AND status = 'FAILED') > 0 THEN 'AT_RISK'
        ELSE 'HEALTHY'
    END as health_status,
    (SELECT max(created_at) FROM public.system_events WHERE organization_id = b.id) as last_activity
FROM 
    public.businesses b
WHERE b.parent_id IS NULL;

-- 5. RLS Policies
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read system events" ON public.system_events FOR SELECT USING (is_super_admin());
CREATE POLICY "Super admins can read integration sync status" ON public.integration_sync_status FOR SELECT USING (is_super_admin());

CREATE POLICY "Tenants can read their own integration sync status" ON public.integration_sync_status FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.business_memberships bm
        WHERE bm.business_id = integration_sync_status.organization_id
        AND bm.user_id = auth.uid()
    )
);

