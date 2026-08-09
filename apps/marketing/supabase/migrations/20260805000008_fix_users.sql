-- Fix seeded demo users who couldn't log in due to missing aud/role
UPDATE auth.users 
SET 
  aud = 'authenticated', 
  role = 'authenticated', 
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE email IN (
  'sarah@robertsenterprises.com',
  'jessica@robertsenterprises.com',
  'emily@robertsenterprises.com',
  'michael@robertsenterprises.com',
  'demo123@gmail.com'
);

-- Backfill a clean-slate business for any users that don't have one
DO $$
DECLARE
  r RECORD;
  v_business_id uuid;
BEGIN
  FOR r IN 
    SELECT u.id, u.raw_user_meta_data 
    FROM auth.users u
    LEFT JOIN public.business_memberships bm ON u.id = bm.user_id
    WHERE bm.business_id IS NULL
  LOOP
    v_business_id := gen_random_uuid();
    
    INSERT INTO public.businesses (id, name)
    VALUES (v_business_id, COALESCE(r.raw_user_meta_data->>'name', 'My Business') || '''s Business');

    INSERT INTO public.business_memberships (user_id, business_id, role)
    VALUES (r.id, v_business_id, 'Owner');

    INSERT INTO public.locations (id, business_id, name, address)
    VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');
  END LOOP;
END;
$$;

-- Create a trigger to automatically create a business and clean slate for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- We don't auto-create if a membership was somehow already seeded (unlikely in normal flow)
  IF NOT EXISTS (SELECT 1 FROM public.business_memberships WHERE user_id = NEW.id) THEN
    v_business_id := gen_random_uuid();
    
    INSERT INTO public.businesses (id, name)
    VALUES (v_business_id, COALESCE(NEW.raw_user_meta_data->>'name', 'My Business') || '''s Business');

    INSERT INTO public.business_memberships (user_id, business_id, role)
    VALUES (NEW.id, v_business_id, 'Owner');

    INSERT INTO public.locations (id, business_id, name, address)
    VALUES (gen_random_uuid(), v_business_id, 'Main Store', '123 Main St');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists so this migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
