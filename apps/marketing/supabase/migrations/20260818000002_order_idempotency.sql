-- 20260818000001_order_idempotency.sql
-- Enforce idempotency and external unique constraints to protect against webhook double-delivery

-- 1. Ensure external_order_id cannot be duplicated per channel
-- This prevents a Shopify or Square webhook retry from creating two identical orders in VowOS.
DO $$ 
BEGIN
    ALTER TABLE orders 
    ADD CONSTRAINT unique_external_order_per_channel 
    UNIQUE NULLS NOT DISTINCT (business_id, channel_id, external_order_id);
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create an idempotent upsert function for external orders
CREATE OR REPLACE FUNCTION upsert_external_order(
    p_business_id uuid,
    p_location_id uuid,
    p_customer_id uuid,
    p_channel_id uuid,
    p_external_order_id text,
    p_external_order_url text,
    p_source_type text,
    p_status text,
    p_total_cents integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
BEGIN
    -- Insert or update the order, guaranteeing no duplicates
    INSERT INTO orders (
        business_id,
        location_id,
        customer_id,
        channel_id,
        external_order_id,
        external_order_url,
        source_type,
        status,
        total_cents
    ) VALUES (
        p_business_id,
        p_location_id,
        p_customer_id,
        p_channel_id,
        p_external_order_id,
        p_external_order_url,
        p_source_type,
        p_status,
        p_total_cents
    )
    ON CONFLICT (business_id, channel_id, external_order_id) DO UPDATE SET
        status = EXCLUDED.status,
        total_cents = EXCLUDED.total_cents,
        customer_id = EXCLUDED.customer_id
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$;
