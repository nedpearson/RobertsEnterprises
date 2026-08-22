-- 20260909000000_omnichannel_connections.sql

CREATE TABLE IF NOT EXISTS provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID,
    brand_id UUID,
    location_id UUID,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    capabilities JSONB DEFAULT '{}'::jsonb,
    auth_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS omnichannel_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID,
    brand_id UUID,
    provider_connection_id UUID REFERENCES provider_connections(id) ON DELETE CASCADE,
    sender_id TEXT,
    sender_name TEXT,
    recipient_id TEXT,
    content TEXT,
    message_type TEXT DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE omnichannel_inbox ENABLE ROW LEVEL SECURITY;

-- Provider Connections policies
DROP POLICY IF EXISTS "Members can view provider_connections" ON provider_connections;
CREATE POLICY "Members can view provider_connections" ON provider_connections FOR SELECT 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

DROP POLICY IF EXISTS "Managers can insert provider_connections" ON provider_connections;
CREATE POLICY "Managers can insert provider_connections" ON provider_connections FOR INSERT 
WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Managers can update provider_connections" ON provider_connections;
CREATE POLICY "Managers can update provider_connections" ON provider_connections FOR UPDATE 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

DROP POLICY IF EXISTS "Managers can delete provider_connections" ON provider_connections;
CREATE POLICY "Managers can delete provider_connections" ON provider_connections FOR DELETE 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- Omnichannel Inbox policies
DROP POLICY IF EXISTS "Members can view omnichannel_inbox" ON omnichannel_inbox;
CREATE POLICY "Members can view omnichannel_inbox" ON omnichannel_inbox FOR SELECT 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

DROP POLICY IF EXISTS "Members can insert omnichannel_inbox" ON omnichannel_inbox;
CREATE POLICY "Members can insert omnichannel_inbox" ON omnichannel_inbox FOR INSERT 
WITH CHECK (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

DROP POLICY IF EXISTS "Members can update omnichannel_inbox" ON omnichannel_inbox;
CREATE POLICY "Members can update omnichannel_inbox" ON omnichannel_inbox FOR UPDATE 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'Stylist']));

DROP POLICY IF EXISTS "Managers can delete omnichannel_inbox" ON omnichannel_inbox;
CREATE POLICY "Managers can delete omnichannel_inbox" ON omnichannel_inbox FOR DELETE 
USING (public.user_has_role(business_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_provider_connections_updated_at ON provider_connections;
CREATE TRIGGER update_provider_connections_updated_at
BEFORE UPDATE ON provider_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_omnichannel_inbox_updated_at ON omnichannel_inbox;
CREATE TRIGGER update_omnichannel_inbox_updated_at
BEFORE UPDATE ON omnichannel_inbox
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
