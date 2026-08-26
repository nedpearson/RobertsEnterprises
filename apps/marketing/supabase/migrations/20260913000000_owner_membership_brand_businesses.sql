-- The owner account only had a business_membership on "Roberts Enterprises",
-- while the public booking intake maps all four stores to the
-- "I Do Bridal Couture" and "Proper & Company" businesses. Booking requests
-- were therefore written under businesses the owner's session could not read
-- (RLS) and could not select at login, so the Appointments > Booking Requests
-- queue was always empty even when intake succeeded.
--
-- Grant the owner an Owner membership on both real brand businesses. The login
-- workspace selector already handles multiple memberships. Idempotent; a fresh
-- CI database (no auth.users row) is skipped with a NOTICE.
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = 'nedpearson@gmail.com'
  ORDER BY created_at
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'owner user not found; skipping brand membership grant';
    RETURN;
  END IF;

  INSERT INTO public.business_memberships (user_id, business_id, role)
  SELECT v_uid, b.id, 'Owner'
  FROM public.businesses b
  WHERE b.name IN ('I Do Bridal Couture', 'Proper & Company')
    AND b.name !~* 'demo'
  ON CONFLICT (user_id, business_id) DO NOTHING;
END $$;
