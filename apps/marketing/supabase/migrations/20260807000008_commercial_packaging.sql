-- Create Enums
CREATE TYPE commercial_plan AS ENUM ('essentials', 'growth', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'suspended', 'canceled', 'trialing');

-- Create tenant_subscriptions table
CREATE TABLE tenant_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  plan commercial_plan NOT NULL DEFAULT 'essentials',
  status subscription_status NOT NULL DEFAULT 'active',
  addons text[] DEFAULT '{}'::text[],
  overrides jsonb DEFAULT '{}'::jsonb,
  grandfathered_features text[] DEFAULT '{}'::text[],
  active_trials jsonb DEFAULT '{}'::jsonb,
  usage_limits jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant subscription" ON tenant_subscriptions
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
  );

-- Grant Roberts Enterprises (and any existing demo tenants) Full Enterprise Access
-- We use ON CONFLICT (business_id) DO NOTHING in case this is run multiple times
INSERT INTO tenant_subscriptions (business_id, plan, status, overrides, grandfathered_features)
SELECT id, 'enterprise'::commercial_plan, 'active'::subscription_status, '{}'::jsonb, '{}'::text[]
FROM businesses
ON CONFLICT (business_id) DO NOTHING;

-- Create function to automatically create a subscription for new businesses
CREATE OR REPLACE FUNCTION handle_new_business_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_subscriptions (business_id, plan, status)
  VALUES (new.id, 'essentials', 'trialing');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create subscriptions
CREATE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION handle_new_business_subscription();
