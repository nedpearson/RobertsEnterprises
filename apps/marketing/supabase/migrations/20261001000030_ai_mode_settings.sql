-- AI Scheduling Mode: per-organization configuration for the autonomous agent
-- Forward-only migration, idempotent via INSERT ... ON CONFLICT DO NOTHING

-- Upsert function for AI scheduling mode settings
CREATE OR REPLACE FUNCTION get_ai_scheduling_mode(p_business_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
BEGIN
    SELECT value INTO v_settings
    FROM settings
    WHERE business_id = p_business_id
      AND key = 'ai_scheduling';
    
    IF v_settings IS NULL THEN
        RETURN jsonb_build_object(
            'mode', 'recommend_only',
            'confidence_threshold', 80,
            'auto_notify_staff', TRUE,
            'auto_notify_customer', FALSE,
            'auto_assign_enabled', FALSE
        );
    END IF;
    
    RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update AI scheduling mode
CREATE OR REPLACE FUNCTION update_ai_scheduling_mode(
    p_business_id UUID,
    p_mode TEXT,
    p_confidence_threshold INTEGER DEFAULT 80,
    p_auto_notify_staff BOOLEAN DEFAULT TRUE,
    p_auto_notify_customer BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    -- Validate mode
    IF p_mode NOT IN ('recommend_only', 'auto_assign_review', 'safe_auto_assign') THEN
        RAISE EXCEPTION 'Invalid AI scheduling mode: %', p_mode;
    END IF;
    
    -- Verify caller is a member of this business
    IF NOT EXISTS (SELECT 1 FROM business_memberships WHERE business_id = p_business_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    INSERT INTO settings (business_id, key, value)
    VALUES (
        p_business_id,
        'ai_scheduling',
        jsonb_build_object(
            'mode', p_mode,
            'confidence_threshold', p_confidence_threshold,
            'auto_notify_staff', p_auto_notify_staff,
            'auto_notify_customer', p_auto_notify_customer,
            'auto_assign_enabled', (p_mode = 'safe_auto_assign')
        )
    )
    ON CONFLICT (business_id, key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_ai_scheduling_mode TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_scheduling_mode TO authenticated;
