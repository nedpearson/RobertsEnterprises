-- 20260807000009_universal_catalog_schema.sql

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    internal_id TEXT,
    dba TEXT,
    primary_contact JSONB, 
    ordering_rules JSONB,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    season TEXT,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE size_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT,
    measurements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    canonical_family TEXT,
    swatch_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    style_number TEXT NOT NULL,
    name TEXT,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'Active',
    attributes JSONB, 
    primary_image TEXT,
    additional_images JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    vendor_sku TEXT,
    upc TEXT,
    color TEXT,
    size TEXT,
    cost_cents INTEGER,
    msrp_cents INTEGER,
    store_retail_cents INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    file_name TEXT,
    status TEXT DEFAULT 'Uploaded',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    errors JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_staging_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    raw_data JSONB,
    mapped_data JSONB,
    validation_status TEXT,
    validation_errors JSONB,
    duplicate_of UUID REFERENCES products(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gowns ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging_records ENABLE ROW LEVEL SECURITY;

-- Define Policies
CREATE POLICY "Enable all access for business members" ON vendors FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON brands FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON collections FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON size_systems FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON vendor_colors FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON products FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON product_variants FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
CREATE POLICY "Enable all access for business members" ON import_jobs FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));
-- For staging records, we must join through import_jobs to check business_id, or simply rely on auth.uid() if we don't have business_id directly.
-- Wait, I didn't add business_id to import_staging_records. Let me add it.
ALTER TABLE import_staging_records ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE POLICY "Enable all access for business members" ON import_staging_records FOR ALL USING (business_id IN (SELECT business_id FROM business_memberships WHERE user_id = auth.uid()));


-- Migration logic for existing gowns
DO $$
DECLARE
    g_row RECORD;
    v_vendor_id UUID;
    v_product_id UUID;
    v_variant_id UUID;
BEGIN
    FOR g_row IN SELECT * FROM gowns LOOP
        IF g_row.vendor IS NOT NULL OR g_row.designer IS NOT NULL THEN
            -- Find or create vendor
            SELECT id INTO v_vendor_id FROM vendors WHERE business_id = g_row.business_id AND name = COALESCE(g_row.vendor, g_row.designer) LIMIT 1;
            IF NOT FOUND THEN
                INSERT INTO vendors (business_id, name) VALUES (g_row.business_id, COALESCE(g_row.vendor, g_row.designer)) RETURNING id INTO v_vendor_id;
            END IF;

            -- Find or create product
            SELECT id INTO v_product_id FROM products WHERE business_id = g_row.business_id AND vendor_id = v_vendor_id AND style_number = COALESCE(g_row.style, 'UNKNOWN') LIMIT 1;
            IF NOT FOUND THEN
                INSERT INTO products (business_id, vendor_id, style_number, name, category, primary_image) 
                VALUES (g_row.business_id, v_vendor_id, COALESCE(g_row.style, 'UNKNOWN'), g_row.name, g_row.category, g_row.image) 
                RETURNING id INTO v_product_id;
            END IF;

            -- Find or create variant
            SELECT id INTO v_variant_id FROM product_variants WHERE business_id = g_row.business_id AND product_id = v_product_id AND COALESCE(color, '') = COALESCE(g_row.color, '') AND COALESCE(size, '') = COALESCE(g_row.size, '') LIMIT 1;
            IF NOT FOUND THEN
                INSERT INTO product_variants (business_id, product_id, vendor_sku, color, size, cost_cents, store_retail_cents)
                VALUES (g_row.business_id, v_product_id, g_row.sku, g_row.color, g_row.size, g_row.cost_cents, g_row.price_cents)
                RETURNING id INTO v_variant_id;
            END IF;

            -- Link gown to variant
            UPDATE gowns SET variant_id = v_variant_id WHERE id = g_row.id;
        END IF;
    END LOOP;
END $$;
