-- Drop the incorrect unique constraint that prevented the same location name across different brands
DROP INDEX IF EXISTS locations_business_name_idx;

-- Create a new unique index that scopes location names by brand.
-- We use COALESCE on brand_id so that Org-level locations (where brand_id is NULL)
-- are also uniquely constrained by name.
CREATE UNIQUE INDEX IF NOT EXISTS locations_business_brand_name_idx 
ON locations (
  business_id, 
  COALESCE(brand_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  lower(name)
);
