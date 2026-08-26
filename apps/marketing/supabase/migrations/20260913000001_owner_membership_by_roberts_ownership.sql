-- Follow-up to 20260913000000: that migration keyed the grant on the email
-- nedpearson@gmail.com, but the production tenant login is a DIFFERENT auth
-- user (nedpearson2500@gmail.com, verified from the live session JWT), so it
-- inserted nothing and booking requests stayed invisible.
--
-- Key the grant on ownership instead of a guessed email: every user who is an
-- Owner of the "Roberts Enterprises" umbrella business gets an Owner membership
-- on both real brand businesses. Idempotent; no-op on a fresh CI database.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT bm.user_id
    FROM public.business_memberships bm
    JOIN public.businesses b ON b.id = bm.business_id
    WHERE b.name = 'Roberts Enterprises'
      AND bm.role = 'Owner'
  LOOP
    INSERT INTO public.business_memberships (user_id, business_id, role)
    SELECT r.user_id, b2.id, 'Owner'
    FROM public.businesses b2
    WHERE b2.name IN ('I Do Bridal Couture', 'Proper & Company')
      AND b2.name !~* 'demo'
    ON CONFLICT (user_id, business_id) DO NOTHING;
  END LOOP;
END $$;
