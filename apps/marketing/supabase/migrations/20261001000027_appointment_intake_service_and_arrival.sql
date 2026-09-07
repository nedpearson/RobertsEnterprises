-- =============================================================================
-- 20261001000027_appointment_intake_service_and_arrival.sql
--
-- Slice 2. Two gaps slice 1 left open on purpose:
--
--   1. service_id is null on every one of the 3,705 requests, because intake
--      never set it. The form does say what the bride wants — "Bridal",
--      "Mother of the Bride", "Evening Wear" — it just lands in the free-text
--      `type` column and nothing reads it. Without a service there is no
--      duration, and without a duration there are no slots, so the operator had
--      to pick a type by hand on every request before they could book it.
--
--   2. The party is captured but nothing records who actually turned up.
--
-- Nothing here seeds data into a live tenant.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Services learn what the form calls them
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointment_services
  ADD COLUMN IF NOT EXISTS intake_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_default      BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointment_services.intake_keywords IS
  'Case-insensitive substrings matched against the enquiry type/occasion text to pick this service at intake.';
COMMENT ON COLUMN public.appointment_services.is_default IS
  'Used when no keyword matches. At most one active default per business.';

-- One default per business, enforced by the database rather than the form.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_services_one_default_per_business
  ON public.appointment_services (business_id) WHERE is_default AND active;

-- -----------------------------------------------------------------------------
-- 2. Resolve a service from what the bride typed
-- -----------------------------------------------------------------------------
-- Longest keyword wins, so "mother of the bride" beats "bride". SECURITY INVOKER
-- and STABLE: it only reads, and it reads as the caller. Called from the worker
-- with the service role, so RLS is not in play; if it is ever exposed to a
-- client it inherits that client's row visibility rather than bypassing it.
CREATE OR REPLACE FUNCTION public.resolve_intake_service(p_business_id uuid, p_text text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH matched AS (
    SELECT s.id, max(length(k.keyword)) AS strength
    FROM appointment_services s
    CROSS JOIN LATERAL unnest(s.intake_keywords) AS k(keyword)
    WHERE s.business_id = p_business_id
      AND s.active
      AND p_text IS NOT NULL
      AND length(trim(k.keyword)) > 0
      AND lower(p_text) LIKE '%' || lower(trim(k.keyword)) || '%'
    GROUP BY s.id
    ORDER BY strength DESC
    LIMIT 1
  )
  SELECT id FROM matched
  UNION ALL
  SELECT id FROM appointment_services
  WHERE business_id = p_business_id AND active AND is_default
    AND NOT EXISTS (SELECT 1 FROM matched)
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_intake_service(uuid, text) FROM anon;

-- -----------------------------------------------------------------------------
-- 3. Who checked the party member in
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointment_party_members
  ADD COLUMN IF NOT EXISTS checked_in_by UUID;

COMMIT;
