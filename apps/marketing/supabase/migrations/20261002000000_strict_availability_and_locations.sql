-- VowOS Strict Availability and Location Data Model

-- 1. Purge synthetic locations
UPDATE public.locations
SET name = 'Location Review Required'
WHERE name IN ('Main Store', 'Main Boutique', 'Main Boutique - City Center', 'Main Boutique - Northside');

-- 2. Staff Availability Submissions
CREATE TABLE IF NOT EXISTS public.staff_availability_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
    staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'published')),
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_avail_submissions_org ON public.staff_availability_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_avail_submissions_staff ON public.staff_availability_submissions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_avail_submissions_dates ON public.staff_availability_submissions(period_start, period_end);

-- 3. Staff Availability Periods
CREATE TABLE IF NOT EXISTS public.staff_availability_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid NOT NULL REFERENCES public.staff_availability_submissions(id) ON DELETE CASCADE,
    staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    availability_type text NOT NULL DEFAULT 'available' CHECK (availability_type IN ('available', 'unavailable', 'time_off')),
    source text DEFAULT 'employee_submission',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_time_range CHECK (starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS idx_avail_periods_staff ON public.staff_availability_periods(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_avail_periods_times ON public.staff_availability_periods(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_avail_periods_sub ON public.staff_availability_periods(submission_id);

-- 4. Availability Reminder Rules
CREATE TABLE IF NOT EXISTS public.availability_reminder_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    weeks_required integer NOT NULL DEFAULT 2,
    submission_deadline_day_of_week integer NOT NULL DEFAULT 4, -- Thursday
    first_reminder_offset_days integer NOT NULL DEFAULT 7,
    second_reminder_offset_days integer NOT NULL DEFAULT 3,
    final_reminder_offset_days integer NOT NULL DEFAULT 0,
    escalation_rule text DEFAULT 'manager_notify',
    enabled_channels text[] DEFAULT '{"in_app", "email"}',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organization_id)
);

-- 5. Availability Reminder Events
CREATE TABLE IF NOT EXISTS public.availability_reminder_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id uuid NOT NULL REFERENCES public.availability_reminder_rules(id) ON DELETE CASCADE,
    staff_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    channel text NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'acknowledged')),
    sent_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminder_events_staff ON public.availability_reminder_events(staff_user_id);

-- 6. Add Mode to AI Decisions
ALTER TABLE public.ai_scheduling_decisions 
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'recommend_only',
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.businesses(id),
ADD COLUMN IF NOT EXISTS overrides jsonb;

-- 8. Enable RLS
ALTER TABLE public.staff_availability_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_reminder_events ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (Organization isolation)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view submissions for their org" ON public.staff_availability_submissions;
    CREATE POLICY "Users can view submissions for their org" ON public.staff_availability_submissions
        FOR SELECT
        USING (organization_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.staff_availability_submissions;
    CREATE POLICY "Users can insert their own submissions" ON public.staff_availability_submissions
        FOR INSERT
        WITH CHECK (staff_user_id = auth.uid() AND organization_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()));
        
    DROP POLICY IF EXISTS "Managers can update submissions" ON public.staff_availability_submissions;
    CREATE POLICY "Managers can update submissions" ON public.staff_availability_submissions
        FOR UPDATE
        USING (organization_id IN (SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid() AND role IN ('Owner', 'Manager', 'Admin')));

    -- periods
    DROP POLICY IF EXISTS "Users can view periods for their org" ON public.staff_availability_periods;
    CREATE POLICY "Users can view periods for their org" ON public.staff_availability_periods
        FOR SELECT
        USING (staff_user_id = auth.uid() OR submission_id IN (
            SELECT id FROM public.staff_availability_submissions WHERE organization_id IN (
                SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid()
            )
        ));

    DROP POLICY IF EXISTS "Users can insert periods for their submissions" ON public.staff_availability_periods;
    CREATE POLICY "Users can insert periods for their submissions" ON public.staff_availability_periods
        FOR INSERT
        WITH CHECK (staff_user_id = auth.uid());
        
    DROP POLICY IF EXISTS "Managers can update periods" ON public.staff_availability_periods;
    CREATE POLICY "Managers can update periods" ON public.staff_availability_periods
        FOR UPDATE
        USING (submission_id IN (
            SELECT id FROM public.staff_availability_submissions WHERE organization_id IN (
                SELECT business_id FROM public.business_memberships WHERE user_id = auth.uid() AND role IN ('Owner', 'Manager', 'Admin')
            )
        ));
END $$;
