-- VowOS Production Reconciliation - Dry Run Report & Safe Fixes

-- 1. Create a view for ambiguous/corrupted records for manager review
CREATE OR REPLACE VIEW public.vw_reconciliation_quarantine WITH (security_invoker = on) AS
SELECT 
    'Booking request marked CONFIRMED but no appointment exists' as issue_type,
    id as record_id,
    business_id
FROM public.appointment_requests
WHERE status = 'CONFIRMED'
AND NOT EXISTS (SELECT 1 FROM public.appointments WHERE request_id = appointment_requests.id)

UNION ALL

SELECT 
    'Appointment missing source request ID' as issue_type,
    id as record_id,
    business_id
FROM public.appointments
WHERE request_id IS NULL AND status = 'Scheduled'

UNION ALL

SELECT 
    'Orphaned appointment note' as issue_type,
    id as record_id,
    business_id
FROM public.appointment_notes
WHERE appointment_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.appointments WHERE id = appointment_notes.appointment_id)

UNION ALL

SELECT
    'Placeholder Main Store Location used' as issue_type,
    ar.id as record_id,
    ar.business_id
FROM public.appointment_requests ar
JOIN public.locations l ON ar.preferred_location_id = l.id
WHERE l.name ILIKE '%Main Store%' OR l.name ILIKE '%Main Boutique%';

-- 2. Safe Auto-Repair Deterministic Cases

-- Fix request notes mapped directly to appointment_notes where appointment doesn't exist
-- We can't automatically move them if they violate the NOT NULL constraint, but we created booking_request_notes for this.
-- If any stuck in some invalid state, we leave them in quarantine.

-- Fix appointments marked Scheduled but have no confirmation_status
UPDATE public.appointments
SET confirmation_status = 'Confirmed'
WHERE status = 'Scheduled' AND confirmation_status IS NULL;

-- Fix requests with status = 'CONFIRMED' but no appointment (revert to REVIEW so managers can re-confirm)
UPDATE public.appointment_requests
SET status = 'REVIEW'
WHERE status = 'CONFIRMED'
AND NOT EXISTS (SELECT 1 FROM public.appointments WHERE request_id = appointment_requests.id);
