-- A production catalog import and special-order journey. These records are
-- intentionally organization-scoped; no product, vendor confirmation, or
-- customer update can be attached across tenants.
CREATE TABLE IF NOT EXISTS public.catalog_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  file_name text NOT NULL,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed', 'importing', 'completed', 'failed')),
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  warning_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.catalog_import_batches(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL CHECK (validation_status IN ('valid', 'warning', 'error', 'imported')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id, row_number)
);

CREATE TABLE IF NOT EXISTS public.customer_order_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'appointment_booked' CHECK (status IN (
    'appointment_booked', 'appointment_completed', 'style_selected',
    'measurements_captured', 'order_draft', 'order_submitted',
    'vendor_confirmed', 'in_production', 'shipped', 'received',
    'alterations', 'ready_for_pickup', 'completed', 'cancelled'
  )),
  wedding_date date,
  promised_at timestamptz,
  customer_visible boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.customer_order_journeys(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  confirmation_number text NOT NULL,
  vendor_status text,
  expected_ship_at timestamptz,
  expected_delivery_at timestamptz,
  raw_confirmation jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, vendor_id, confirmation_number)
);

CREATE TABLE IF NOT EXISTS public.customer_journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.customer_order_journeys(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  customer_visible boolean NOT NULL DEFAULT true,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_journey_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES public.customer_order_journeys(id) ON DELETE CASCADE,
  journey_event_id uuid NOT NULL REFERENCES public.customer_journey_events(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(journey_event_id, recipient, channel)
);

CREATE INDEX IF NOT EXISTS catalog_import_batches_business_idx ON public.catalog_import_batches (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS catalog_import_rows_batch_idx ON public.catalog_import_rows (batch_id, row_number);
CREATE INDEX IF NOT EXISTS customer_order_journeys_business_idx ON public.customer_order_journeys (business_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_order_journeys_appointment_unique ON public.customer_order_journeys (business_id, appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_journey_events_journey_idx ON public.customer_journey_events (journey_id, created_at);
CREATE INDEX IF NOT EXISTS customer_journey_notification_retry_idx ON public.customer_journey_notification_outbox (status, next_attempt_at) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.assert_customer_journey_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scoped_business uuid;
BEGIN
  SELECT business_id INTO scoped_business FROM public.customers WHERE id = NEW.customer_id;
  IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Journey customer must belong to its business'; END IF;
  IF NEW.appointment_id IS NOT NULL THEN
    SELECT business_id INTO scoped_business FROM public.appointments WHERE id = NEW.appointment_id;
    IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Journey appointment must belong to its business'; END IF;
  END IF;
  IF NEW.product_variant_id IS NOT NULL THEN
    SELECT business_id INTO scoped_business FROM public.product_variants WHERE id = NEW.product_variant_id;
    IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Journey product variant must belong to its business'; END IF;
  END IF;
  IF NEW.purchase_order_id IS NOT NULL THEN
    SELECT business_id INTO scoped_business FROM public.purchase_orders WHERE id = NEW.purchase_order_id;
    IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Journey purchase order must belong to its business'; END IF;
  END IF;
  IF NEW.vendor_id IS NOT NULL THEN
    SELECT business_id INTO scoped_business FROM public.vendors WHERE id = NEW.vendor_id;
    IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Journey vendor must belong to its business'; END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS customer_order_journeys_scope_guard ON public.customer_order_journeys;
CREATE TRIGGER customer_order_journeys_scope_guard BEFORE INSERT OR UPDATE ON public.customer_order_journeys
FOR EACH ROW EXECUTE FUNCTION public.assert_customer_journey_scope();

-- The journey starts with the appointment, not a manual staff action. Completing
-- or cancelling an appointment changes it only while it is still in the early
-- appointment phase, never overwriting a progressed special-order lifecycle.
CREATE OR REPLACE FUNCTION public.sync_appointment_customer_journey()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journey_row public.customer_order_journeys%ROWTYPE;
DECLARE event_row uuid;
DECLARE customer_email text;
DECLARE customer_name text;
DECLARE event_title text;
DECLARE event_detail text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_order_journeys (business_id, location_id, customer_id, appointment_id, status)
    VALUES (NEW.business_id, NEW.location_id, NEW.customer_id, NEW.id, 'appointment_booked')
    ON CONFLICT (business_id, appointment_id) WHERE appointment_id IS NOT NULL DO NOTHING
    RETURNING * INTO journey_row;
    IF journey_row.id IS NULL THEN RETURN NEW; END IF;
    event_title := 'Your appointment is booked';
    event_detail := 'We look forward to seeing you and will be ready for your visit.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT * INTO journey_row FROM public.customer_order_journeys
      WHERE business_id = NEW.business_id AND appointment_id = NEW.id FOR UPDATE;
    IF NOT FOUND OR journey_row.status NOT IN ('appointment_booked', 'appointment_completed') THEN RETURN NEW; END IF;
    IF lower(coalesce(NEW.status, '')) = 'completed' AND journey_row.status = 'appointment_booked' THEN
      UPDATE public.customer_order_journeys SET status = 'appointment_completed', updated_at = now() WHERE id = journey_row.id RETURNING * INTO journey_row;
      event_title := 'Your appointment is complete';
      event_detail := 'Your stylist is preparing the next steps from your visit.';
    ELSIF lower(coalesce(NEW.status, '')) IN ('cancelled', 'canceled') THEN
      UPDATE public.customer_order_journeys SET status = 'cancelled', updated_at = now() WHERE id = journey_row.id RETURNING * INTO journey_row;
      event_title := 'Your appointment was cancelled';
      event_detail := 'Please contact the boutique if you would like help finding a new time.';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_journey_events (business_id, journey_id, event_type, title, detail, customer_visible)
  VALUES (NEW.business_id, journey_row.id, journey_row.status, event_title, event_detail, true)
  RETURNING id INTO event_row;
  SELECT email, name INTO customer_email, customer_name FROM public.customers WHERE id = NEW.customer_id;
  IF customer_email IS NOT NULL AND customer_email <> '' THEN
    INSERT INTO public.customer_journey_notification_outbox (business_id, journey_id, journey_event_id, recipient, payload)
    VALUES (NEW.business_id, journey_row.id, event_row, customer_email,
      jsonb_build_object('subject', event_title, 'body', 'Hi ' || coalesce(customer_name, '') || E'\n\n' || event_detail || E'\n\nYour VowOS boutique team'));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointments_customer_journey_sync ON public.appointments;
CREATE TRIGGER appointments_customer_journey_sync AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_customer_journey();

CREATE OR REPLACE FUNCTION public.assert_catalog_import_scope()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scoped_business uuid;
BEGIN
  SELECT business_id INTO scoped_business FROM public.vendors WHERE id = NEW.vendor_id;
  IF scoped_business IS DISTINCT FROM NEW.business_id THEN RAISE EXCEPTION 'Catalog import vendor must belong to its business'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS catalog_import_batches_scope_guard ON public.catalog_import_batches;
CREATE TRIGGER catalog_import_batches_scope_guard BEFORE INSERT OR UPDATE ON public.catalog_import_batches
FOR EACH ROW EXECUTE FUNCTION public.assert_catalog_import_scope();

ALTER TABLE public.catalog_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_order_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_order_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_journey_notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view catalog import batches" ON public.catalog_import_batches FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist']));
CREATE POLICY "Managers can manage catalog import batches" ON public.catalog_import_batches FOR ALL USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])) WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));
CREATE POLICY "Members can view catalog import rows" ON public.catalog_import_rows FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist']));
CREATE POLICY "Managers can manage catalog import rows" ON public.catalog_import_rows FOR ALL USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])) WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));
CREATE POLICY "Members can view customer order journeys" ON public.customer_order_journeys FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist']));
CREATE POLICY "Managers can manage customer order journeys" ON public.customer_order_journeys FOR ALL USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])) WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));
CREATE POLICY "Members can view vendor confirmations" ON public.vendor_order_confirmations FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist']));
CREATE POLICY "Managers can manage vendor confirmations" ON public.vendor_order_confirmations FOR ALL USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])) WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));
CREATE POLICY "Members can view customer journey events" ON public.customer_journey_events FOR SELECT USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER','EMPLOYEE','Stylist']));
CREATE POLICY "Managers can manage customer journey events" ON public.customer_journey_events FOR ALL USING (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER'])) WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER','ADMIN','MANAGER']));
-- Queue content can include private message text; browser clients must never read it.
