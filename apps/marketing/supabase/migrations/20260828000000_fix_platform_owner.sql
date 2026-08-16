-- Fixes the disconnected PLATFORM_OWNER account that was seeded 
-- before the auth.users record was created.

UPDATE public.platform_users 
SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'nedpearson@gmail.com') 
WHERE email = 'nedpearson@gmail.com' 
AND auth_user_id IS NULL;
