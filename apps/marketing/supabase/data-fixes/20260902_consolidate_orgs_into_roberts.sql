-- ============================================================================
-- Consolidate the two legacy top-level businesses into the Roberts Enterprises
-- organization, mapping their locations onto Roberts' brand-scoped locations.
--
--   Org    Roberts Enterprises      82a5b426-78a2-47ba-896b-3146b1a99c53
--   Brand  I Do Bridal Couture      06013fb3-1a8f-4127-ae62-8c940cd11efa
--   Brand  Proper & Co              fae4547a-6052-41e6-88e7-c6a90aa197d8
--
--   Legacy I Do Bridal Couture      65ad28de-3f86-428d-a5b6-9d89af3542fc
--   Legacy Proper & Company         81c291ed-e9a0-430c-ab8c-7ed2216a9c62
--
-- Location map (legacy -> Roberts):
--   1bf69ca1  I Do   Baton Rouge  ->  b7b013f4
--   244179aa  I Do   Covington    ->  f4809557
--   0d872f24  Proper Baton Rouge  ->  22783385
--   a31f8e83  Proper Covington    ->  6c663431
--
-- Every mutated row is captured in org_consolidation_backup_20260902 BEFORE it
-- changes, so the whole migration is reversible (see the rollback script).
--
-- Affected row counts measured 2026-09-02:
--   appointment_requests 3692 | customers 3094 | audit_logs 3094
--   messages 194 | form_submissions 194 | appointment_audit_events 194
--   leads 193 | intake outbox 98 | business_sites 3 | locations 8
-- Zero appointments, invoices, contracts, orders or gowns exist under the
-- legacy orgs, so nothing financial is touched.
-- ============================================================================

BEGIN;

-- 0. Backup ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_consolidation_backup_20260902 (
  id              bigserial PRIMARY KEY,
  tbl             text        NOT NULL,
  row_id          uuid        NOT NULL,
  old_business_id uuid,
  old_location_id uuid,
  old_brand_id    uuid,
  old_name        text,
  captured_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.org_consolidation_backup_20260902 ENABLE ROW LEVEL SECURITY;

-- Refuse to run twice.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.org_consolidation_backup_20260902) THEN
    RAISE EXCEPTION 'org_consolidation_backup_20260902 already has rows - this migration has already been applied. Run the rollback first if you mean to re-run it.';
  END IF;
END $$;

-- 1. Brand-qualify the Roberts location names --------------------------------
-- REQUIRED, not cosmetic. Roberts has two locations named "Baton Rouge" and two
-- named "Covington". chooseWebsiteSubmissionLocation() matches a submitted city
-- against EVERY location in the org, so unqualified names make every future
-- form-bridge submission fail with "ambiguous location".
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_name)
SELECT 'locations.name', id, name FROM public.locations
WHERE id IN ('b7b013f4-6c5f-4ebd-bc55-290d73f969fb','f4809557-4834-41c7-a997-9046444682c0',
             '22783385-f099-4ddc-a8d6-0cafd0e3ffbd','6c663431-dc51-467d-82e4-4f26ae4953bb');

UPDATE public.locations SET name = 'I Do Bridal Couture - Baton Rouge' WHERE id = 'b7b013f4-6c5f-4ebd-bc55-290d73f969fb';
UPDATE public.locations SET name = 'I Do Bridal Couture - Covington'   WHERE id = 'f4809557-4834-41c7-a997-9046444682c0';
UPDATE public.locations SET name = 'Proper & Co. - Baton Rouge'        WHERE id = '22783385-f099-4ddc-a8d6-0cafd0e3ffbd';
UPDATE public.locations SET name = 'Proper & Co. - Covington'          WHERE id = '6c663431-dc51-467d-82e4-4f26ae4953bb';

-- 2. appointment_requests ----------------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id, old_brand_id)
SELECT 'appointment_requests', id, business_id, preferred_location_id, brand_id
FROM public.appointment_requests
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.appointment_requests r SET preferred_location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE r.preferred_location_id = m.old_loc
  AND r.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.appointment_requests r
SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53', brand_id = b.new_brand
FROM (VALUES
  ('65ad28de-3f86-428d-a5b6-9d89af3542fc'::uuid,'06013fb3-1a8f-4127-ae62-8c940cd11efa'::uuid),
  ('81c291ed-e9a0-430c-ab8c-7ed2216a9c62','fae4547a-6052-41e6-88e7-c6a90aa197d8')
) AS b(old_biz, new_brand)
WHERE r.business_id = b.old_biz;

-- 3. customers ---------------------------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id)
SELECT 'customers', id, business_id, location_id FROM public.customers
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.customers c SET location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE c.location_id = m.old_loc
  AND c.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.customers SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

-- 4. leads -------------------------------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id)
SELECT 'leads', id, business_id, location_id FROM public.leads
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.leads l SET location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE l.location_id = m.old_loc
  AND l.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.leads SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

-- 5. messages ----------------------------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id)
SELECT 'messages', id, business_id, location_id FROM public.messages
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.messages x SET location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE x.location_id = m.old_loc
  AND x.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.messages SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

-- 6. appointment_audit_events ------------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id)
SELECT 'appointment_audit_events', id, business_id, location_id FROM public.appointment_audit_events
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.appointment_audit_events x SET location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE x.location_id = m.old_loc
  AND x.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.appointment_audit_events SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

-- 7. form_submissions, audit_logs --------------------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id)
SELECT 'form_submissions', id, business_id FROM public.form_submissions
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');
UPDATE public.form_submissions SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id)
SELECT 'audit_logs', id, business_id FROM public.audit_logs
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');
UPDATE public.audit_logs SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

-- 8. appointment_intake_notification_outbox ----------------------------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_brand_id)
SELECT 'appointment_intake_notification_outbox', id, business_id, brand_id
FROM public.appointment_intake_notification_outbox
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.appointment_intake_notification_outbox x
SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53', brand_id = b.new_brand
FROM (VALUES
  ('65ad28de-3f86-428d-a5b6-9d89af3542fc'::uuid,'06013fb3-1a8f-4127-ae62-8c940cd11efa'::uuid),
  ('81c291ed-e9a0-430c-ab8c-7ed2216a9c62','fae4547a-6052-41e6-88e7-c6a90aa197d8')
) AS b(old_biz, new_brand)
WHERE x.business_id = b.old_biz;

-- 9. business_sites - this is what routes every FUTURE submission ------------
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id, old_location_id, old_brand_id)
SELECT 'business_sites', id, business_id, location_id, brand_id FROM public.business_sites
WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.business_sites s SET location_id = m.new_loc
FROM (VALUES
  ('1bf69ca1-91a2-417b-890f-79089763ae4f'::uuid,'b7b013f4-6c5f-4ebd-bc55-290d73f969fb'::uuid),
  ('244179aa-63fa-408b-9615-9f552d57edd3','f4809557-4834-41c7-a997-9046444682c0'),
  ('0d872f24-d8aa-48a7-ad3b-e9257509a6da','22783385-f099-4ddc-a8d6-0cafd0e3ffbd'),
  ('a31f8e83-3597-4868-a911-dc8c45612052','6c663431-dc51-467d-82e4-4f26ae4953bb')
) AS m(old_loc, new_loc)
WHERE s.location_id = m.old_loc
  AND s.business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.business_sites s
SET business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53', brand_id = b.new_brand, updated_at = now()
FROM (VALUES
  ('65ad28de-3f86-428d-a5b6-9d89af3542fc'::uuid,'06013fb3-1a8f-4127-ae62-8c940cd11efa'::uuid),
  ('81c291ed-e9a0-430c-ab8c-7ed2216a9c62','fae4547a-6052-41e6-88e7-c6a90aa197d8')
) AS b(old_biz, new_brand)
WHERE s.business_id = b.old_biz;

-- 10. Nest the emptied legacy shells under the org, retire their locations ----
INSERT INTO public.org_consolidation_backup_20260902 (tbl, row_id, old_business_id)
SELECT 'businesses.parent_id', id, parent_id FROM public.businesses
WHERE id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.businesses
SET parent_id = '82a5b426-78a2-47ba-896b-3146b1a99c53', updated_at = now()
WHERE id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');

UPDATE public.locations SET is_active = false
WHERE id IN ('1bf69ca1-91a2-417b-890f-79089763ae4f','244179aa-63fa-408b-9615-9f552d57edd3',
             '0d872f24-d8aa-48a7-ad3b-e9257509a6da','a31f8e83-3597-4868-a911-dc8c45612052');

-- 11. Assertions - the transaction aborts if the move did not land ------------
DO $$
DECLARE stragglers bigint; moved bigint; dupes bigint;
BEGIN
  SELECT count(*) INTO stragglers FROM public.appointment_requests
  WHERE business_id IN ('65ad28de-3f86-428d-a5b6-9d89af3542fc','81c291ed-e9a0-430c-ab8c-7ed2216a9c62');
  IF stragglers > 0 THEN RAISE EXCEPTION 'appointment_requests: % rows still on a legacy org', stragglers; END IF;

  SELECT count(*) INTO moved FROM public.appointment_requests
  WHERE business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53';
  IF moved < 3692 THEN RAISE EXCEPTION 'expected at least 3692 requests on Roberts Enterprises, found %', moved; END IF;

  SELECT count(*) INTO stragglers FROM public.appointment_requests
  WHERE business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53'
    AND preferred_location_id IS NOT NULL
    AND preferred_location_id NOT IN (SELECT id FROM public.locations WHERE business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53');
  IF stragglers > 0 THEN RAISE EXCEPTION '% requests point at a location outside the org', stragglers; END IF;

  SELECT count(*) INTO dupes FROM (
    SELECT 1 FROM public.locations
    WHERE business_id = '82a5b426-78a2-47ba-896b-3146b1a99c53' AND is_active
    GROUP BY lower(name) HAVING count(*) > 1
  ) d;
  IF dupes > 0 THEN RAISE EXCEPTION 'duplicate active location names remain - the form bridge will be ambiguous'; END IF;
END $$;

COMMIT;
