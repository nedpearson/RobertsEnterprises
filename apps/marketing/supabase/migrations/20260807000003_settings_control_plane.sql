-- 20260807000003_settings_control_plane.sql

CREATE TABLE settings_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_plane TEXT DEFAULT 'production', -- 'production' or 'demo'
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    setting_namespace TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    value_json JSONB NOT NULL,
    schema_version INTEGER DEFAULT 1,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE NULLS NOT DISTINCT (data_plane, business_id, location_id, user_id, setting_namespace, setting_key)
);

CREATE TABLE settings_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_value_id UUID NOT NULL REFERENCES settings_values(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    previous_value_json JSONB,
    new_value_json JSONB NOT NULL,
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE settings_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for business members on settings_values" ON settings_values
    FOR ALL
    USING (
        business_id IS NULL OR 
        business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
    );

CREATE POLICY "Enable all access for business members on settings_versions" ON settings_versions
    FOR ALL
    USING (
        setting_value_id IN (
            SELECT id FROM settings_values 
            WHERE business_id IS NULL OR business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid())
        )
    );
