-- VowOS Appointments Date Reconciliation and Booking Request Notes

-- 1. Drop redundant start_time and end_time columns from appointments
ALTER TABLE public.appointments DROP COLUMN IF EXISTS start_time;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS end_time;

-- 2. Ensure start_at and end_at exist (they should, but just in case)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE;

-- 3. Clean up event_date in booking requests vs wedding_date in customers
-- Move event_date to wedding_date if customer exists and wedding_date is null
UPDATE public.customers c
SET wedding_date = r.event_date
FROM public.appointment_requests r
WHERE r.customer_id = c.id
AND c.wedding_date IS NULL
AND r.event_date IS NOT NULL;

-- 4. Standardize booking request dates
ALTER TABLE public.appointment_requests RENAME COLUMN preferred_date_1 TO requested_date;
ALTER TABLE public.appointment_requests ADD COLUMN IF NOT EXISTS requested_start_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.appointment_requests ADD COLUMN IF NOT EXISTS requested_time_flexible BOOLEAN DEFAULT false;

-- 5. Booking Request Notes Table
CREATE TABLE IF NOT EXISTS public.booking_request_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_request_id UUID NOT NULL REFERENCES public.appointment_requests(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    note_category TEXT DEFAULT 'general',
    visibility TEXT DEFAULT 'staff' CHECK (visibility IN ('staff', 'manager', 'private')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_request_notes_request ON public.booking_request_notes(booking_request_id);
CREATE INDEX IF NOT EXISTS idx_booking_request_notes_org ON public.booking_request_notes(organization_id);

ALTER TABLE public.booking_request_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view booking_request_notes" ON public.booking_request_notes;
    CREATE POLICY "Members can view booking_request_notes" ON public.booking_request_notes
        FOR SELECT USING (public.user_has_role(organization_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist', 'Consultant']));

    DROP POLICY IF EXISTS "Members can insert booking_request_notes" ON public.booking_request_notes;
    CREATE POLICY "Members can insert booking_request_notes" ON public.booking_request_notes
        FOR INSERT WITH CHECK (public.user_has_role(organization_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist', 'Consultant']));
END $$;
