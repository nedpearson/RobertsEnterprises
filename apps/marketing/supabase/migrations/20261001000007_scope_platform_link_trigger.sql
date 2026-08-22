-- The platform-link trigger runs inside every Auth signup transaction. Avoid a
-- platform_users UPDATE unless an administrator explicitly pre-created a pending
-- platform record for this email.

CREATE OR REPLACE FUNCTION public.link_platform_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.platform_users
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS NULL
  ) THEN
    UPDATE public.platform_users
    SET auth_user_id = NEW.id,
        updated_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;
