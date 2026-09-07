-- =============================================================================
-- 20261001000028_revoke_anon_billing_and_stub_rpcs.sql
--
-- billing_handle_webhook(p_event_id, p_event_type, p_business_id, p_plan_id)
-- is SECURITY DEFINER, executable by `anon`, and contains no authorization
-- check of any kind. Its body sets organization_subscriptions.plan_id and
-- status, and businesses.subscription_status, for whatever p_business_id the
-- caller passes. entitlementService.ts reads those columns to decide which
-- features a tenant gets.
--
-- So: anyone holding the public anon key — which ships in the browser bundle
-- and is also in this repository's git history — can call
--
--   POST /rest/v1/rpc/billing_handle_webhook
--   {"p_event_id":"x","p_event_type":"checkout.session.completed",
--    "p_business_id":"<any>","p_plan_id":"enterprise"}
--
-- and put any business on any plan, or PAST_DUE, or CANCELED. Unauthenticated.
--
-- Nothing in the application calls this function. Its own comment says it is
-- meant to be called by a Stripe-signature-verifying Edge Function. That
-- function does not exist — no Edge Function did until today — so the RPC has
-- been reachable by the public and used by nobody since 2026-08-16.
--
-- Only service_role should ever execute it. Revoked from anon and authenticated.
-- =============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.billing_handle_webhook(text, text, uuid, text) FROM anon, authenticated;

-- The five below are called from settings tabs by signed-in users, so they keep
-- `authenticated`. None of them needs to be callable without a session. Each is
-- also a stub whose body is a comment beginning "Simulate" — see the audit — but
-- that is a separate problem from who can call them.
REVOKE EXECUTE ON FUNCTION public.billing_create_checkout_session(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.connect_stripe_integration(uuid)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_staging_data()                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.test_automation_rule(text)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.test_twilio_connection()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_test_template(text, text)            FROM anon;

COMMIT;
