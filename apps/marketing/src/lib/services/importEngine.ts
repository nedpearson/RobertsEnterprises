import Papa from 'papaparse';
import { supabase } from '../supabase';
import { ImportJob, ImportStagingRecord } from '../../types/catalog';

export interface FieldMapping {
  csvHeader: string;
  mappedField: string; // 'style_number', 'color', 'size', 'cost_cents', 'retail_cents'
}

export const importEngine = {
  async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  },

  async startImportJob(businessId: string, vendorId: string, fileName: string): Promise<ImportJob> {
    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        business_id: businessId,
        vendor_id: vendorId,
        file_name: fileName,
        status: 'Mapping'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as ImportJob;
  },

  async commitImport(businessId: string, vendorId: string, jobId: string, rawData: any[], mapping: FieldMapping[]): Promise<void> {
    // Basic mapping implementation
    const records = rawData.map(row => {
      const mapped: any = {};
      mapping.forEach(m => {
        if (m.mappedField && m.mappedField !== 'ignore') {
          mapped[m.mappedField] = row[m.csvHeader];
        }
      });
      return mapped;
    });

    // In a real scenario, we'd insert into import_staging_records here,
    // then process them. For simplicity, we process them directly into products/variants.

    // Group by style number
    const productsMap = new Map<string, any[]>();
    records.forEach(r => {
      const style = r.style_number;
      if (!style) return;
      if (!productsMap.has(style)) {
        productsMap.set(style, []);
      }
      productsMap.get(style)!.push(r);
    });

    for (const [style, variants] of productsMap.entries()) {
      // Create or update product
      let { data: productData, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('vendor_id', vendorId)
        .eq('style_number', style)
        .single();
      
      let productId = productData?.id;

      if (!productId) {
        const { data: newProd, error: insertProdError } = await supabase
          .from('products')
          .insert({
            business_id: businessId,
            vendor_id: vendorId,
            style_number: style,
            name: variants[0].name || `Style ${style}`,
          })
          .select()
          .single();
        if (insertProdError) throw insertProdError;
        productId = newProd.id;
      }

      // Create variants
      for (const v of variants) {
        const { data: existingVariant } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', productId)
          .eq('color', v.color || '')
          .eq('size', v.size || '')
          .single();

        if (!existingVariant) {
          const cost = parseFloat(v.cost_cents?.toString() || '0') || 0;
          const retail = parseFloat(v.retail_cents?.toString() || '0') || 0;

          await supabase.from('product_variants').insert({
            business_id: businessId,
            product_id: productId,
            color: v.color || '',
            size: v.size || '',
            cost_cents: cost,
            store_retail_cents: retail
          });
        }
      }
    }

    await supabase
      .from('import_jobs')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('id', jobId);
  }
};
