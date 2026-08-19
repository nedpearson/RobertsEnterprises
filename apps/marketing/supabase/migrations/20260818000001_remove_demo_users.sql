-- Drop demo users created in 20260804000004_seed_demo_data.sql

-- First, remove their appointments to avoid trigger cascade double booking errors
DELETE FROM appointments WHERE employee_id IN (
    SELECT id FROM auth.users WHERE email IN (
        'demo123@gmail.com',
        'sarah@robertsenterprises.com',
        'jessica@robertsenterprises.com',
        'emily@robertsenterprises.com',
        'michael@robertsenterprises.com'
    )
);

DELETE FROM auth.users WHERE email IN (
    'demo123@gmail.com',
    'sarah@robertsenterprises.com',
    'jessica@robertsenterprises.com',
    'emily@robertsenterprises.com',
    'michael@robertsenterprises.com'
);
