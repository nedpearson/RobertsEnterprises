-- Seed script for Massive Demo Environment
-- This script provisions the 'demo' data plane with 100+ entities across all domains

BEGIN;

-- We'll assume the demo business already exists or we'll create it explicitly.
-- Let's define variables to reuse IDs
DO $$ 
DECLARE 
  demo_business_id UUID := '10000000-0000-0000-0000-000000000001';
  demo_location_id UUID := '20000000-0000-0000-0000-000000000001';
BEGIN
  
  -- Create Demo Business if not exists
  INSERT INTO public.businesses (id, name, slug, organization_type, status, data_plane, onboarding_status)
  VALUES (
    demo_business_id, 
    'The Boutique Demo Store', 
    'demo-store', 
    'BUSINESS', 
    'ACTIVE', 
    'demo', 
    'COMPLETE'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create Demo Location
  INSERT INTO public.locations (id, business_id, name, type)
  VALUES (
    demo_location_id,
    demo_business_id,
    'Flagship Store',
    'STOREFRONT'
  ) ON CONFLICT (id) DO NOTHING;

  -- Create Customers (50)
  FOR i IN 1..50 LOOP
    INSERT INTO public.customers (id, business_id, first_name, last_name, email, phone)
    VALUES (
      gen_random_uuid(),
      demo_business_id,
      'Demo',
      'Customer ' || i,
      'demo_customer_' || i || '@example.com',
      '555-01' || lpad(i::text, 2, '0')
    );
  END LOOP;

  -- Create Products/Catalog (50)
  FOR i IN 1..50 LOOP
    INSERT INTO public.products (id, business_id, name, sku, category, base_price, is_active)
    VALUES (
      gen_random_uuid(),
      demo_business_id,
      'Demo Gown ' || i,
      'DG-00' || i,
      'Bridal Gowns',
      150000 + (random() * 50000)::int,
      true
    );
  END LOOP;

  -- More entities could be inserted here (Appointments, Invoices, Transfers)

END $$;

COMMIT;
