import { supabase } from '../supabase';
import { Vendor, Product, ProductVariant } from '../../types/catalog';

export interface VendorBusinessBrandAssignment {
  id: string;
  business_id: string;
  vendor_id: string;
  brand_id: string;
  active: boolean;
}

export interface OperatingBrand {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

export interface VendorWriteInput {
  name: string;
  email?: string;
  phone?: string;
  leadTimeDays?: number;
  rushLeadTimeDays?: number;
  status?: 'Active' | 'Inactive';
}

const vendorPayload = (businessId: string, input: VendorWriteInput) => ({
  business_id: businessId,
  name: input.name.trim(),
  primary_contact: {
    email: input.email?.trim() || '',
    phone: input.phone?.trim() || '',
  },
  ordering_rules: {
    lead_time_days: input.leadTimeDays ?? 120,
    rush_lead_time_days: input.rushLeadTimeDays ?? 60,
  },
  status: input.status ?? 'Active',
  updated_at: new Date().toISOString(),
});

export const catalogService = {
  async getOperatingBrands(businessId: string): Promise<OperatingBrand[]> {
    const { data, error } = await supabase
      .from('business_brands')
      .select('id,business_id,name,description,logo_url')
      .eq('business_id', businessId)
      .order('name');
    if (error) throw error;
    return (data || []) as OperatingBrand[];
  },

  async getVendors(businessId: string): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('business_id', businessId)
      .order('name');
    if (error) throw error;
    return data as Vendor[];
  },

  async getVendor(businessId: string, vendorId: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('business_id', businessId)
      .eq('id', vendorId)
      .maybeSingle();
    if (error) throw error;
    return data as Vendor | null;
  },

  async createVendor(businessId: string, input: VendorWriteInput): Promise<Vendor> {
    if (!businessId) throw new Error('Active business context is required.');
    if (!input.name.trim()) throw new Error('Designer name is required.');

    const { data: existing, error: existingError } = await supabase
      .from('vendors')
      .select('id')
      .eq('business_id', businessId)
      .ilike('name', input.name.trim())
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new Error('A designer/vendor with this name already exists.');

    const { data, error } = await supabase
      .from('vendors')
      .insert(vendorPayload(businessId, input))
      .select('*')
      .single();
    if (error) throw error;
    return data as Vendor;
  },

  async updateVendor(businessId: string, vendorId: string, input: VendorWriteInput): Promise<Vendor> {
    if (!businessId) throw new Error('Active business context is required.');
    const { data, error } = await supabase
      .from('vendors')
      .update(vendorPayload(businessId, input))
      .eq('business_id', businessId)
      .eq('id', vendorId)
      .select('*')
      .single();
    if (error) throw error;
    return data as Vendor;
  },

  async deactivateVendor(businessId: string, vendorId: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({ status: 'Inactive', updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('id', vendorId);
    if (error) throw error;
  },

  async getVendorBusinessBrandAssignments(businessId: string): Promise<VendorBusinessBrandAssignment[]> {
    const { data, error } = await supabase
      .from('vendor_business_brand_assignments')
      .select('*')
      .eq('business_id', businessId)
      .eq('active', true);
    if (error) throw error;
    return (data || []) as VendorBusinessBrandAssignment[];
  },

  async setVendorBusinessBrandAssignment(
    businessId: string,
    vendorId: string,
    brandId: string,
    active: boolean,
  ): Promise<void> {
    if (active) {
      const { error } = await supabase
        .from('vendor_business_brand_assignments')
        .upsert(
          { business_id: businessId, vendor_id: vendorId, brand_id: brandId, active: true, updated_at: new Date().toISOString() },
          { onConflict: 'business_id,vendor_id,brand_id' },
        );
      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('vendor_business_brand_assignments')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('vendor_id', vendorId)
      .eq('brand_id', brandId);
    if (error) throw error;
  },

  async getVendorProducts(businessId: string, vendorId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('business_id', businessId)
      .eq('vendor_id', vendorId)
      .order('style_number');
    if (error) throw error;
    return data as Product[];
  },

  async searchProducts(businessId: string, query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, vendors(name), product_variants(*)')
      .eq('business_id', businessId)
      .or(`style_number.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(50);
    if (error) throw error;
    return data as Product[];
  },

  async createPhysicalInventoryFromVariant(businessId: string, locationId: string, variant: ProductVariant, product: Product, qty: number): Promise<void> {
    const items = Array(qty).fill({}).map(() => ({
      business_id: businessId,
      location_id: locationId,
      name: product.name || `Style ${product.style_number}`,
      style: product.style_number,
      size: variant.size,
      color: variant.color,
      price_cents: variant.store_retail_cents || variant.msrp_cents,
      cost_cents: variant.cost_cents,
      sku: variant.vendor_sku || `SKU-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
      category: product.category || 'Bridal Gown',
      image: product.primary_image,
      stock: 1,
      status: 'In Stock',
      condition: 'New',
      variant_id: variant.id,
    }));

    const { error } = await supabase.from('gowns').insert(items);
    if (error) throw error;
  }
};
