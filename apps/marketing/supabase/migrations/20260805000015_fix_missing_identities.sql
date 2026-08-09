DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email IN (
      'sarah@robertsenterprises.com',
      'jessica@robertsenterprises.com',
      'emily@robertsenterprises.com',
      'michael@robertsenterprises.com',
      'demo123@gmail.com'
    )
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = r.id) THEN
      INSERT INTO auth.identities (
        id, 
        user_id, 
        provider_id, 
        identity_data, 
        provider,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(), 
        r.id, 
        r.id::text, -- GoTrue expects provider_id to be a string representing the user UUID for email provider
        jsonb_build_object('sub', r.id, 'email', r.email, 'email_verified', true),
        'email',
        now(),
        now()
      );
    END IF;
  END LOOP;
END;
$$;
