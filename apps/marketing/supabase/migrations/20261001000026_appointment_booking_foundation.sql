-- =============================================================================
-- 20261001000026_appointment_booking_foundation.sql
--
-- Slice 1 of making a booking request bookable.
--
-- Context: production holds 3,705 appointment requests and ZERO appointments.
-- Not because booking is broken in an interesting way — because every path to
-- it dead-ends. Rooms, services, staff eligibility and published shifts are all
-- empty, and both assignment RPCs gate on data that does not exist.
--
-- This migration does three things:
--   1. Adds the bride's party, which is what a bridal appointment actually is.
--      A consultant needs to know that four people are walking in and which one
--      is the bride before they open the door.
--   2. Closes two tenant-isolation holes in assign_appointment_idempotent.
--   3. Makes the terminal status consistent so a booked request leaves the queue.
--
-- It seeds nothing. Roberts Enterprises is a live tenant; its suites, services
-- and shifts are its own data and get entered through the UI this slice adds.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The bride's party
-- -----------------------------------------------------------------------------
-- appointment_requests already carries number_of_guests, an integer. "4" tells
-- a consultant nothing: which one is the bride, who is the mother, who holds
-- the card, who has a mobility need, who is joining by video from out of state.
-- The party is the appointment.
--
-- Attached to the request first and the appointment second, because the party
-- is known at enquiry time and must survive the request becoming a booking.
CREATE TABLE IF NOT EXISTS public.appointment_party_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_id      UUID        REFERENCES public.appointment_requests(id) ON DELETE CASCADE,
  appointment_id  UUID        REFERENCES public.appointments(id) ON DELETE CASCADE,

  full_name       TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'GUEST'
                    CHECK (role IN ('BRIDE','PARTNER','MOTHER','FATHER','MAID_OF_HONOUR',
                                    'BRIDESMAID','FAMILY','FRIEND','PAYER','GUEST','OTHER')),
  is_primary      BOOLEAN     NOT NULL DEFAULT false,
  email           TEXT,
  phone           TEXT,

  -- Free text the consultant reads before the appointment. Accessibility needs,
  -- "do not mention the price in front of her mother", allergies for the toast.
  notes           TEXT,

  attending       BOOLEAN     NOT NULL DEFAULT true,
  arrived_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A party member belongs to an enquiry, a booking, or both — never neither.
  CONSTRAINT appointment_party_member_has_parent
    CHECK (request_id IS NOT NULL OR appointment_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS appointment_party_members_request_idx
  ON public.appointment_party_members (request_id);
CREATE INDEX IF NOT EXISTS appointment_party_members_appointment_idx
  ON public.appointment_party_members (appointment_id);
CREATE INDEX IF NOT EXISTS appointment_party_members_business_idx
  ON public.appointment_party_members (business_id);

-- Exactly one primary (the bride) per request, and per appointment. A partial
-- unique index rather than a trigger: the database refuses the second one.
CREATE UNIQUE INDEX IF NOT EXISTS appointment_party_one_primary_per_request
  ON public.appointment_party_members (request_id) WHERE is_primary AND request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS appointment_party_one_primary_per_appointment
  ON public.appointment_party_members (appointment_id) WHERE is_primary AND appointment_id IS NOT NULL;

ALTER TABLE public.appointment_party_members ENABLE ROW LEVEL SECURITY;

-- RLS with a real tenant policy, not RLS with nothing. This table holds names
-- and contact details of people who are not the customer of record.
DROP POLICY IF EXISTS appointment_party_members_tenant ON public.appointment_party_members;
CREATE POLICY appointment_party_members_tenant
  ON public.appointment_party_members
  FOR ALL
  USING (public.is_active_business_member(business_id))
  WITH CHECK (public.is_active_business_member(business_id));

COMMENT ON TABLE public.appointment_party_members IS
  'Everyone attending a bridal appointment. number_of_guests is a count; this is who they are.';

COMMIT;

BEGIN;

-- -----------------------------------------------------------------------------
-- 2. Indexes the slot engine needs
-- -----------------------------------------------------------------------------
-- Generating bookable slots means subtracting existing appointments, holds and
-- shifts over a date window, per employee and per room. Without these, every
-- slot query is a sequential scan over the whole table.
CREATE INDEX IF NOT EXISTS appointments_employee_window_idx
  ON public.appointments (employee_id, start_at, end_at) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS appointments_room_window_idx
  ON public.appointments (room_id, start_at, end_at) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS appointment_holds_employee_window_idx
  ON public.appointment_holds (employee_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS appointment_holds_room_window_idx
  ON public.appointment_holds (room_id, start_at, end_at) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employee_schedules_window_idx
  ON public.employee_schedules (business_id, status, start_at, end_at);

-- -----------------------------------------------------------------------------
-- 3. assign_appointment_idempotent — two tenant holes and a capacity bug
-- -----------------------------------------------------------------------------
-- The existing function is good work: an advisory lock keyed on the employee,
-- overlap checks against appointments and live holds, a single transaction.
-- Three things are wrong with it, and all three matter more now that it is
-- about to become the only booking path:
--
--   a) p_room_id is caller-supplied and only ever overlap-checked. Nothing
--      verifies the room belongs to p_business_id. A caller could attach
--      another tenant's suite to their own appointment. Same for p_employee_id.
--      This is the payload-controlled-tenant-resolution class that this repo has
--      already been bitten by once in the Shopify webhook.
--
--   b) Room overlap is treated as binary. rooms.capacity exists and defaults to
--      1, but a lounge that seats three parties was still blocked by one.
--
--   c) It leaves the request as 'assigned' while assign_appointment_request and
--      confirm_appointment_hold leave it as 'confirmed'. Neither status is in
--      ARCHIVED_REQUEST_STATUSES and neither is a pipeline stage, so a booked
--      request sat in the active queue forever, in no stage, looking unhandled.
--      One terminal status: 'confirmed'.
--
-- The signature is unchanged so the existing worker call site keeps working.
CREATE OR REPLACE FUNCTION public.assign_appointment_idempotent(
  p_business_id uuid,
  p_request_id  uuid,
  p_employee_id uuid,
  p_location_id uuid,
  p_room_id     uuid,
  p_start_at    timestamptz,
  p_end_at      timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_request           record;
  v_appointment       record;
  v_overlap_count     int;
  v_room_capacity     int;
  v_employee_lock_key bigint;
BEGIN
  IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'An appointment must end after it starts';
  END IF;

  -- Serialize concurrent assignment for this employee.
  v_employee_lock_key := ('x' || substr(md5(p_employee_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_employee_lock_key);

  SELECT * INTO v_request
  FROM appointment_requests
  WHERE id = p_request_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or unauthorized';
  END IF;

  IF v_request.status NOT IN ('submitted', 'new', 'review', 'staffing_review', 'ai_ready',
                              'recommended', 'tentative_hold', 'confirmation_pending', 'waitlist') THEN
    RAISE EXCEPTION 'Request is % and cannot be assigned', COALESCE(v_request.status, 'unknown');
  END IF;

  -- (a) The employee must be a member of THIS business. Without this, a
  -- caller-supplied uuid attaches a stranger to the booking.
  IF NOT EXISTS (
    SELECT 1 FROM business_memberships
    WHERE user_id = p_employee_id AND business_id = p_business_id
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Employee does not belong to this organization';
  END IF;

  -- (a) The room must belong to THIS business, and to the location being booked.
  IF p_room_id IS NOT NULL THEN
    SELECT capacity INTO v_room_capacity
    FROM rooms
    WHERE id = p_room_id
      AND business_id = p_business_id
      AND COALESCE(active, true)
      AND (location_id IS NULL OR p_location_id IS NULL OR location_id = p_location_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Suite does not belong to this organization or location, or is inactive';
    END IF;
  END IF;

  SELECT count(*) INTO v_overlap_count
  FROM appointments
  WHERE employee_id = p_employee_id
    AND end_at > p_start_at
    AND start_at < p_end_at
    AND COALESCE(status, '') NOT IN ('Canceled', 'Cancelled', 'No-show');

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'That consultant is already booked at this time';
  END IF;

  -- (b) Respect capacity rather than treating any occupancy as full.
  IF p_room_id IS NOT NULL THEN
    SELECT count(*) INTO v_overlap_count
    FROM appointments
    WHERE room_id = p_room_id
      AND end_at > p_start_at
      AND start_at < p_end_at
      AND COALESCE(status, '') NOT IN ('Canceled', 'Cancelled', 'No-show');

    IF v_overlap_count >= GREATEST(COALESCE(v_room_capacity, 1), 1) THEN
      RAISE EXCEPTION 'That suite is at capacity at this time';
    END IF;
  END IF;

  SELECT count(*) INTO v_overlap_count
  FROM appointment_holds
  WHERE employee_id = p_employee_id
    AND end_at > p_start_at
    AND start_at < p_end_at
    AND expires_at > now();

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'That consultant has a tentative hold at this time';
  END IF;

  INSERT INTO appointments (
    business_id, location_id, request_id, customer_id, employee_id, service_id, room_id,
    start_at, end_at, confirmation_status, status, intake_source, type, looking_for,
    budget_cents, fee_paid
  ) VALUES (
    p_business_id, p_location_id, p_request_id, v_request.customer_id, p_employee_id,
    v_request.service_id, p_room_id, p_start_at, p_end_at,
    'Confirmed', 'Scheduled', v_request.intake_source, v_request.type, v_request.looking_for,
    v_request.budget_cents, v_request.fee_paid
  ) RETURNING * INTO v_appointment;

  -- The party was captured against the enquiry. Carry it onto the booking so the
  -- consultant sees who is coming without re-keying it.
  UPDATE appointment_party_members
  SET appointment_id = v_appointment.id, updated_at = now()
  WHERE request_id = p_request_id AND appointment_id IS NULL;

  -- (c) One terminal status across every booking path.
  UPDATE appointment_requests SET status = 'confirmed' WHERE id = p_request_id;

  DELETE FROM appointment_assignment_recommendations WHERE request_id = p_request_id;

  RETURN to_jsonb(v_appointment);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_appointment_idempotent(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz) FROM anon;

-- Any request already left in the older terminal status joins the same stage.
UPDATE public.appointment_requests SET status = 'confirmed' WHERE status = 'assigned';

COMMIT;
