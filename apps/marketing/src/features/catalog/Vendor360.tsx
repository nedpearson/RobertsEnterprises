import React, { useState, useEffect } from 'react';
import { catalogService } from '../../lib/services/catalogService';
import { Vendor, Product } from '../../types/catalog';

import { Building, Phone, Mail, FileText, Package } from 'lucide-react';

interface Props {
  vendorId: string;
  onClose: () => void;
  onProductClick: (product: Product) => void;
}

export function Vendor360({ vendorId, onClose, onProductClick }: Props) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      catalogService.getVendor(vendorId).then(vendor => {
        setVendor(vendor);
      });
      catalogService.getVendorProducts('b0000000-0000-0000-0000-000000000001', vendorId).then(setProducts).finally(() => setLoading(false));
    }
  }, [vendorId]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading vendor profile...</div>;
  if (!vendor) return <div className="p-12 text-center text-red-500">Vendor not found</div>;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-light text-slate-900">{vendor.name}</h1>
            <p className="text-sm text-slate-500">Universal Catalog Vendor Record</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
      </div>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{vendor.primary_contact?.phone || 'No phone'}</p>
                  <p className="text-xs text-slate-500">Primary Phone</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{vendor.primary_contact?.email || 'No email'}</p>
                  <p className="text-xs text-slate-500">Primary Email</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
            <h3 className="text-sm font-medium text-slate-900 mb-4">Ordering Rules</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-slate-500">Lead Time</span>
                <span className="font-medium text-slate-900">{vendor.ordering_rules?.lead_time_weeks || 16} weeks</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-slate-500">Min Order Qty</span>
                <span className="font-medium text-slate-900">{vendor.ordering_rules?.minimum_order_qty || 1} unit(s)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="p-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-medium text-slate-900">Products Catalog ({products.length})</h3>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {products.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No products imported yet.</div>
              ) : (
                products.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => onProductClick(p)}
                    className="p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-16 bg-gray-100 rounded object-cover flex items-center justify-center text-xs text-slate-400">
                      {p.primary_image ? <img src={p.primary_image} alt={p.name} className="w-full h-full object-cover rounded" /> : 'No Img'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{p.name || 'Unknown Style'}</p>
                      <p className="text-xs text-slate-500">Style: {p.style_number} · {p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {p.product_variants ? p.product_variants.length : 0} Variants
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
