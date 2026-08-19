DO $$
DECLARE
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000000';
    v_loc1_id UUID := 'L0000000-0000-0000-0000-000000000001';
BEGIN
    -- Create some leads that match existing 'Demo Bride' customers so the attribution table isn't 0
    INSERT INTO leads (business_id, location_id, name, email, source, budget_cents, stage, ai_score, ai_insight)
    VALUES 
        (v_business_id, v_loc1_id, 'Demo Bride 3', 'bride3@demo.com', 'Meta (Instagram/FB)', 350000, 'Won', 95, 'High conversion probability'),
        (v_business_id, v_loc1_id, 'Demo Bride 6', 'bride6@demo.com', 'Google Ads', 280000, 'Won', 88, 'Strong interest'),
        (v_business_id, v_loc1_id, 'Demo Bride 9', 'bride9@demo.com', 'TikTok Ads', 400000, 'Won', 92, 'Loves designer gowns'),
        (v_business_id, v_loc1_id, 'Demo Bride 12', 'bride12@demo.com', 'Pinterest Ads', 220000, 'Won', 85, 'Budget conscious'),
        (v_business_id, v_loc1_id, 'Demo Bride 15', 'bride15@demo.com', 'Meta (Instagram/FB)', 310000, 'Won', 90, 'Ready to buy');
END $$;
