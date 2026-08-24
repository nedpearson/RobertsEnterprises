export interface Vendor {
  id: string;
  business_id: string;
  name: string;
  internal_id?: string;
  dba?: string;
  primary_contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  ordering_rules?: {
    lead_time_days?: number;
    rush_lead_time_days?: number;
    lead_time_weeks?: number;
    minimum_order_qty?: number;
    shipping_terms?: string;
  };
  status: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Brand {
  id: string;
  business_id: string;
  vendor_id: string;
  name: string;
  created_at?: string;
}

export interface Collection {
  id: string;
  business_id: string;
  brand_id: string;
  name: string;
  season?: string;
  year?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  business_id: string;
  vendor_id: string;
  brand_id?: string;
  collection_id?: string;
  style_number: string;
  name?: string;
  description?: string;
  category?: string;
  status: 'Active' | 'Discontinued' | 'Archived';
  attributes?: Record<string, any>;
  primary_image?: string;
  additional_images?: string[];
  product_variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: string;
  business_id: string;
  product_id: string;
  vendor_sku?: string;
  upc?: string;
  color?: string;
  size?: string;
  cost_cents?: number;
  msrp_cents?: number;
  store_retail_cents?: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ImportJob {
  id: string;
  business_id: string;
  vendor_id?: string;
  file_name?: string;
  status: 'Uploaded' | 'Mapping' | 'Validating' | 'Ready' | 'Importing' | 'Completed' | 'Failed';
  started_at?: string;
  completed_at?: string;
  errors?: any;
  created_by?: string;
  created_at?: string;
}

export interface ImportStagingRecord {
  id: string;
  job_id: string;
  business_id: string;
  raw_data: Record<string, any>;
  mapped_data: Record<string, any>;
  validation_status: 'Valid' | 'Warning' | 'Error';
  validation_errors?: string[];
  duplicate_of?: string;
  created_at?: string;
}
