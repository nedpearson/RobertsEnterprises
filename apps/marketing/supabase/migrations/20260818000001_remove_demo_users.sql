-- Drop demo users created in 20260804000004_seed_demo_data.sql
DELETE FROM auth.users WHERE email IN (
    'demo123@gmail.com',
    'sarah@robertsenterprises.com',
    'jessica@robertsenterprises.com',
    'emily@robertsenterprises.com',
    'michael@robertsenterprises.com'
);
