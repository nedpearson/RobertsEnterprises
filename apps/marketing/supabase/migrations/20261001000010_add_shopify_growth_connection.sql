-- Shopify uses the same tenant-scoped connection and no-policy token store as
-- the other OAuth providers. Merchant tokens never go in connected_accounts.
ALTER TABLE public.growth_provider_connections
  DROP CONSTRAINT IF EXISTS growth_provider_connections_provider_check;

ALTER TABLE public.growth_provider_connections
  ADD CONSTRAINT growth_provider_connections_provider_check
  CHECK (provider IN (
    'google_business_profile', 'google_search_console', 'google_analytics',
    'google_ads', 'meta_ads', 'meta_social', 'pinterest', 'tiktok',
    'shopify', 'manual'
  ));
