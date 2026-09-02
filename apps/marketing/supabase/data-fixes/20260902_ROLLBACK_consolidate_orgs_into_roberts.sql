-- ============================================================================
-- ROLLBACK for 20260902000001_consolidate_orgs_into_roberts.sql
--
-- Restores every row this migration touched from
-- public.org_consolidation_backup_20260902, then empties the backup table so
-- the forward migration can be run again.
--
-- Safe to run only if no NEW rows were created under Roberts Enterprises that
-- you want to keep pointing at the legacy orgs - it only rewrites rows that
-- were captured in the backup, by primary key, so newer rows are untouched.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.org_consolidation_backup_20260902) THEN
    RAISE EXCEPTION 'Backup table is empty - nothing to roll back.';
  END IF;
END $$;

UPDATE public.locations l SET name = b.old_name
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'locations.name' AND l.id = b.row_id;

UPDATE public.appointment_requests r
SET business_id = b.old_business_id, preferred_location_id = b.old_location_id, brand_id = b.old_brand_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'appointment_requests' AND r.id = b.row_id;

UPDATE public.customers c SET business_id = b.old_business_id, location_id = b.old_location_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'customers' AND c.id = b.row_id;

UPDATE public.leads l SET business_id = b.old_business_id, location_id = b.old_location_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'leads' AND l.id = b.row_id;

UPDATE public.messages x SET business_id = b.old_business_id, location_id = b.old_location_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'messages' AND x.id = b.row_id;

UPDATE public.appointment_audit_events x SET business_id = b.old_business_id, location_id = b.old_location_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'appointment_audit_events' AND x.id = b.row_id;

UPDATE public.form_submissions x SET business_id = b.old_business_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'form_submissions' AND x.id = b.row_id;

UPDATE public.audit_logs x SET business_id = b.old_business_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'audit_logs' AND x.id = b.row_id;

UPDATE public.appointment_intake_notification_outbox x
SET business_id = b.old_business_id, brand_id = b.old_brand_id
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'appointment_intake_notification_outbox' AND x.id = b.row_id;

UPDATE public.business_sites s
SET business_id = b.old_business_id, location_id = b.old_location_id, brand_id = b.old_brand_id, updated_at = now()
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'business_sites' AND s.id = b.row_id;

UPDATE public.business_sites s SET status = b.old_status, updated_at = now()
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'business_sites.status' AND s.id = b.row_id;

UPDATE public.businesses bz SET parent_id = b.old_business_id, updated_at = now()
FROM public.org_consolidation_backup_20260902 b
WHERE b.tbl = 'businesses.parent_id' AND bz.id = b.row_id;

UPDATE public.locations SET is_active = true
WHERE id IN ('1bf69ca1-91a2-417b-890f-79089763ae4f','244179aa-63fa-408b-9615-9f552d57edd3',
             '0d872f24-d8aa-48a7-ad3b-e9257509a6da','a31f8e83-3597-4868-a911-dc8c45612052');

DELETE FROM public.org_consolidation_backup_20260902;

COMMIT;
