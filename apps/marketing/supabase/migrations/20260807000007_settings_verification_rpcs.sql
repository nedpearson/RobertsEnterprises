-- Settings Control Plane Verification RPCs

CREATE OR REPLACE FUNCTION test_automation_rule(rule_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate a dry run by waiting a short time (using pg_sleep in real test if needed, but not necessary here)
  -- Just return a mocked result indicating matches and errors
  RETURN jsonb_build_object(
    'matches', floor(random() * 20)::int + 1,
    'errors', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION test_twilio_connection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate verifying the webhook. Just return void to indicate success.
  -- A failure would raise an exception.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION send_test_template(recipient text, template_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate sending a test message.
  IF recipient IS NULL OR recipient = '' THEN
    RAISE EXCEPTION 'Recipient is required';
  END IF;
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION clear_staging_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate clearing staging data from the cache / storage.
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION connect_stripe_integration(integration_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_integration jsonb;
BEGIN
  -- Simulate Stripe OAuth verification
  new_integration := jsonb_build_object(
    'id', COALESCE(integration_id, gen_random_uuid()),
    'provider', 'stripe',
    'status', 'connected',
    'last_sync_at', now()
  );
  
  RETURN new_integration;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_all_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate revoking all sessions except current user's
  -- In a real scenario, this would delete rows from auth.sessions
  RETURN;
END;
$$;
