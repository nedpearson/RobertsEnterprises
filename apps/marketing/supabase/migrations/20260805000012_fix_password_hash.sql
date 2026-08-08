UPDATE auth.users 
SET 
  encrypted_password = '$2a$10$DNSadnaLBDs/HFT7Uo.ocuFtipX3zC6UI6BUJTW/P9XHwIXG9Lmiq'
WHERE email IN (
  'sarah@robertsenterprises.com',
  'jessica@robertsenterprises.com',
  'emily@robertsenterprises.com',
  'michael@robertsenterprises.com',
  'demo123@gmail.com'
);
