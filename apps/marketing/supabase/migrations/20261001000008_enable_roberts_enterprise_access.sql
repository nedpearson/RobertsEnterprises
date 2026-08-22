-- Roberts Enterprises is the contracted Enterprise tenant. Keep this explicit
-- rather than relying on the UI's Essentials fallback when a subscription row
-- is absent or partial.
DO $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT id
  INTO v_business_id
  FROM public.businesses
  WHERE slug = 'roberts-enterprises'
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Roberts Enterprises tenant was not found';
  END IF;

  INSERT INTO public.organization_subscriptions (business_id, plan_id, status)
  VALUES (v_business_id, 'enterprise', 'ACTIVE')
  ON CONFLICT (business_id) DO UPDATE
  SET plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      updated_at = now();

  -- The global key is consumed by both entitlement engines and applies to
  -- catalog additions without maintaining a second hard-coded feature list.
  INSERT INTO public.organization_feature_overrides (business_id, feature_key, state, reason)
  VALUES (
    v_business_id,
    'ALL_CURRENT_AND_FUTURE_FEATURES',
    'FORCED_ON',
    'Contracted Roberts Enterprises Enterprise access'
  )
  ON CONFLICT (business_id, feature_key) DO UPDATE
  SET state = EXCLUDED.state,
      reason = EXCLUDED.reason;

  -- Remove historical restrictions that would otherwise take precedence over
  -- the global Enterprise grant.
  UPDATE public.organization_feature_overrides
  SET state = 'FORCED_ON',
      reason = 'Contracted Roberts Enterprises Enterprise access'
  WHERE business_id = v_business_id
    AND state = 'FORCED_OFF';
END;
$$;
