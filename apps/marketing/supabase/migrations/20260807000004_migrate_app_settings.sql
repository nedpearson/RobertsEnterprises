-- 20260807000004_migrate_app_settings.sql

-- Migrate data from app_settings to settings_values if app_settings exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_settings'
    ) THEN
        INSERT INTO settings_values (
            data_plane, 
            setting_namespace, 
            setting_key, 
            value_json
        )
        SELECT 
            'production', 
            key, 
            key, 
            value::jsonb
        FROM app_settings
        ON CONFLICT (data_plane, business_id, location_id, user_id, setting_namespace, setting_key) 
        DO NOTHING;
    END IF;
END $$;
