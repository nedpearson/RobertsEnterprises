-- Settings verification RPCs: stop reporting success for work that never happens.
--
-- 20260807000007 shipped five "simulation" functions. Each returned success
-- without doing anything, so the Settings UI showed "Twilio connection
-- verified", "Sessions terminated", "Stripe connected securely", a random
-- dry-run match count and a "test message sent" -- to real tenants. Until a
-- real implementation exists these now raise a clear, human-readable error,
-- which the existing UI error branches already display.

CREATE OR REPLACE FUNCTION public.test_automation_rule(rule_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Automation dry-run is not available yet: the automation engine has not been connected for this organization.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION public.test_twilio_connection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Twilio connection test is not available yet: no messaging provider is configured for this organization.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION public.send_test_template(recipient text, template_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF recipient IS NULL OR recipient = '' THEN
    RAISE EXCEPTION 'Recipient is required';
  END IF;
  RAISE EXCEPTION 'Test send is not available yet: no messaging provider is configured for this organization.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_staging_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Cache purge is not available from Settings yet.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_stripe_integration(integration_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Stripe Connect is not available from Settings yet. Payments are configured by the VowOS team during onboarding.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_all_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Session revocation is not available from Settings yet. Contact VowOS support to force sign-out across devices.'
    USING ERRCODE = 'feature_not_supported';
END;
$$;
