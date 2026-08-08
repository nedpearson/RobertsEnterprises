UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
  'sub', id, 
  'email', email, 
  'email_verified', true, 
  'phone_verified', false
)
WHERE email IN (
  'sarah@robertsenterprises.com',
  'jessica@robertsenterprises.com',
  'emily@robertsenterprises.com',
  'michael@robertsenterprises.com',
  'demo123@gmail.com'
);
