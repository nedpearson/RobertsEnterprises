-- New provider connections must not appear healthy/authorized merely because a row
-- was inserted. Authentication and provider health are separate facts and must be
-- proven by the integration flow.

ALTER TABLE public.provider_connections
  ALTER COLUMN health_status SET DEFAULT 'RECOVERING',
  ALTER COLUMN auth_state SET DEFAULT 'PENDING';

COMMENT ON COLUMN public.provider_connections.health_status IS
  'Observed integration health. New rows default to RECOVERING until a verified provider-side operation establishes HEALTHY or another explicit state.';

COMMENT ON COLUMN public.provider_connections.auth_state IS
  'Observed authorization state. New rows default to PENDING until the provider authentication flow verifies authorization.';
