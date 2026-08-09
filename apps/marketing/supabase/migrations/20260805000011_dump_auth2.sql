CREATE TABLE IF NOT EXISTS public.auth_dump2 AS SELECT * FROM auth.users WHERE email LIKE 'dummy_%';
