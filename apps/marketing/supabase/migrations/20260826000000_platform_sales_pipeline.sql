CREATE TABLE IF NOT EXISTS platform_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT,
    lead_type TEXT NOT NULL CHECK (lead_type IN ('DEMO', 'PLAN_REQUEST')),
    status TEXT NOT NULL DEFAULT 'NEW',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts from marketing site
CREATE POLICY "Allow public inserts into platform_leads" 
ON platform_leads FOR INSERT TO public 
WITH CHECK (true);

-- Allow platform owners to manage leads
CREATE POLICY "Platform owners can manage platform_leads" 
ON platform_leads FOR ALL 
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'platform_role' = 'PLATFORM_OWNER')
);

CREATE TABLE IF NOT EXISTS platform_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners can manage platform_notifications" 
ON platform_notifications FOR ALL 
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'platform_role' = 'PLATFORM_OWNER')
);

-- Trigger to create a platform notification on new lead
CREATE OR REPLACE FUNCTION notify_platform_lead() RETURNS trigger AS $$
BEGIN
  INSERT INTO platform_notifications (title, message)
  VALUES ('New Sales Lead: ' || NEW.company_name, 'A new ' || NEW.lead_type || ' lead was submitted by ' || NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ')');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_platform_lead_created
  AFTER INSERT ON platform_leads
  FOR EACH ROW EXECUTE FUNCTION notify_platform_lead();
