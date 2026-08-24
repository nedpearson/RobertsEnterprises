import { supabase } from '../supabase';
import { Vendor, Product, ProductVariant } from '../../types/catalog';

export const catalogService = {
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
