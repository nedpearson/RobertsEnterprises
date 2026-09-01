-- Production time-clock model. Removes the need to encode breaks, transfers,
-- geofence state, and terminal source inside time_entries.note.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters integer NOT NULL DEFAULT 150;

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_geofence_radius_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_geofence_radius_check
  CHECK (geofence_radius_meters BETWEEN 25 AND 5000);

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_latitude_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_latitude_check
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_longitude_check;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_longitude_check
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN IF NOT EXISTS clock_in_latitude double precision,
  ADD COLUMN IF NOT EXISTS clock_in_longitude double precision,
  ADD COLUMN IF NOT EXISTS clock_in_accuracy_meters double precision,
  ADD COLUMN IF NOT EXISTS clock_in_geofence_status text,
  ADD COLUMN IF NOT EXISTS clock_in_distance_meters double precision,
  ADD COLUMN IF NOT EXISTS clock_out_latitude double precision,
  ADD COLUMN IF NOT EXISTS clock_out_longitude double precision,
  ADD COLUMN IF NOT EXISTS clock_out_accuracy_meters double precision,
  ADD COLUMN IF NOT EXISTS clock_out_geofence_status text,
  ADD COLUMN IF NOT EXISTS clock_out_distance_meters double precision;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_source_check;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_source_check
  CHECK (source IN ('PERSONAL','MANAGER_KIOSK'));

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_clock_in_geofence_check;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_clock_in_geofence_check
  CHECK (clock_in_geofence_status IS NULL OR clock_in_geofence_status IN ('VERIFIED','OUTSIDE','UNCONFIGURED','UNAVAILABLE'));

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_clock_out_geofence_check;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_clock_out_geofence_check
  CHECK (clock_out_geofence_status IS NULL OR clock_out_geofence_status IN ('VERIFIED','OUTSIDE','UNCONFIGURED','UNAVAILABLE'));

CREATE TABLE IF NOT EXISTS public.time_entry_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  break_type text NOT NULL CHECK (break_type IN ('REST','MEAL')),
  paid boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_entry_break_positive_duration CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_time_entry_breaks_entry ON public.time_entry_breaks(time_entry_id, started_at);
CREATE INDEX IF NOT EXISTS idx_time_entry_breaks_business_open ON public.time_entry_breaks(business_id, time_entry_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.time_entry_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  from_department text,
  to_department text NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  transferred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entry_transfers_entry ON public.time_entry_transfers(time_entry_id, transferred_at);

ALTER TABLE public.time_entry_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read time entry breaks" ON public.time_entry_breaks;
CREATE POLICY "Members can read time entry breaks"
ON public.time_entry_breaks FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Members can manage time entry breaks" ON public.time_entry_breaks;
CREATE POLICY "Members can manage time entry breaks"
ON public.time_entry_breaks FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

DROP POLICY IF EXISTS "Members can read time entry transfers" ON public.time_entry_transfers;
CREATE POLICY "Members can read time entry transfers"
ON public.time_entry_transfers FOR SELECT
USING (public.is_super_admin() OR public.is_active_business_member(business_id));
DROP POLICY IF EXISTS "Managers can manage time entry transfers" ON public.time_entry_transfers;
CREATE POLICY "Managers can manage time entry transfers"
ON public.time_entry_transfers FOR ALL
USING (public.is_super_admin() OR public.is_active_business_member(business_id))
WITH CHECK (public.is_super_admin() OR public.is_active_business_member(business_id));

-- Atomic clock-in with a per-user advisory lock prevents two open punches when
-- two browser requests race each other.
CREATE OR REPLACE FUNCTION public.clock_in_time_entry_server(
  p_business_id uuid,
  p_user_id uuid,
  p_staff_name text,
  p_location_id uuid,
  p_department text,
  p_source text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_geofence_status text,
  p_distance_meters double precision
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.time_entries%ROWTYPE;
BEGIN
  IF p_business_id IS NULL OR p_user_id IS NULL OR p_location_id IS NULL THEN
    RAISE EXCEPTION 'business, user, and location are required';
  END IF;
  IF COALESCE(BTRIM(p_staff_name), '') = '' OR COALESCE(BTRIM(p_department), '') = '' THEN
    RAISE EXCEPTION 'staff name and department are required';
  END IF;
  IF UPPER(COALESCE(p_source, '')) NOT IN ('PERSONAL','MANAGER_KIOSK') THEN
    RAISE EXCEPTION 'invalid punch source';
  END IF;
  IF UPPER(COALESCE(p_geofence_status, '')) NOT IN ('VERIFIED','OUTSIDE','UNCONFIGURED','UNAVAILABLE') THEN
    RAISE EXCEPTION 'invalid geofence status';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id AND business_id = p_business_id AND is_active = true) THEN
    RAISE EXCEPTION 'location does not belong to active business';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_user_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.time_entries
    WHERE business_id = p_business_id AND user_id = p_user_id AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'staff member already has an open punch';
  END IF;

  INSERT INTO public.time_entries (
    business_id, location_id, user_id, staff_name, clock_in, department, source,
    clock_in_latitude, clock_in_longitude, clock_in_accuracy_meters,
    clock_in_geofence_status, clock_in_distance_meters
  ) VALUES (
    p_business_id, p_location_id, p_user_id, BTRIM(p_staff_name), now(), BTRIM(p_department), UPPER(p_source),
    p_latitude, p_longitude, p_accuracy_meters, UPPER(p_geofence_status), p_distance_meters
  ) RETURNING * INTO v_entry;

  RETURN to_jsonb(v_entry);
END;
$$;
REVOKE ALL ON FUNCTION public.clock_in_time_entry_server(uuid,uuid,text,uuid,text,text,double precision,double precision,double precision,text,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_in_time_entry_server(uuid,uuid,text,uuid,text,text,double precision,double precision,double precision,text,double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.clock_out_time_entry_server(
  p_business_id uuid,
  p_entry_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_geofence_status text,
  p_distance_meters double precision
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.time_entries%ROWTYPE;
BEGIN
  IF p_business_id IS NULL OR p_entry_id IS NULL THEN
    RAISE EXCEPTION 'business and time entry are required';
  END IF;
  IF UPPER(COALESCE(p_geofence_status, '')) NOT IN ('VERIFIED','OUTSIDE','UNCONFIGURED','UNAVAILABLE') THEN
    RAISE EXCEPTION 'invalid geofence status';
  END IF;

  SELECT * INTO v_entry
  FROM public.time_entries
  WHERE id = p_entry_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'time entry not found'; END IF;
  IF v_entry.clock_out IS NOT NULL THEN RETURN to_jsonb(v_entry); END IF;

  UPDATE public.time_entry_breaks
  SET ended_at = now()
  WHERE business_id = p_business_id AND time_entry_id = p_entry_id AND ended_at IS NULL;

  UPDATE public.time_entries
  SET clock_out = now(),
      clock_out_latitude = p_latitude,
      clock_out_longitude = p_longitude,
      clock_out_accuracy_meters = p_accuracy_meters,
      clock_out_geofence_status = UPPER(p_geofence_status),
      clock_out_distance_meters = p_distance_meters,
      updated_at = now()
  WHERE id = p_entry_id AND business_id = p_business_id
  RETURNING * INTO v_entry;

  RETURN to_jsonb(v_entry);
END;
$$;
REVOKE ALL ON FUNCTION public.clock_out_time_entry_server(uuid,uuid,double precision,double precision,double precision,text,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_out_time_entry_server(uuid,uuid,double precision,double precision,double precision,text,double precision) TO service_role;
