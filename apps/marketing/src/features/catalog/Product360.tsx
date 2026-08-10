import React from 'react';
import { Product, ProductVariant } from '../../types/catalog';
import { Package, Tag, Layers, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { formatCents } from '../../data/vowosData';

interface Props {
  product: Product;
  onBack: () => void;
  onAddInventory: (variant: ProductVariant) => void;
}

export function Product360({ product, onBack, onAddInventory }: Props) {
  const variants = product.product_variants || [];

  return (
    <div className="bg-surface-canvas min-h-screen">
      <div className="bg-white border-b border-border-default px-8 py-6 flex items-center sticky top-0 z-10">
        <button onClick={onBack} className="mr-6 text-text-muted hover:text-text-secondary flex items-center">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center">
            {product.primary_image ? (
              <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Package className="w-6 h-6 text-text-muted" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-serif font-light text-text-primary">{product.name || `Style ${product.style_number}`}</h1>
            <p className="text-sm text-text-muted">Universal Catalog Product Record</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
            <h3 className="text-sm font-medium text-text-primary mb-4">Product Details</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-text-muted">Style Number</span>
                <span className="font-medium text-text-primary">{product.style_number}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-text-muted">Category</span>
                <span className="font-medium text-text-primary">{product.category || '—'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-text-muted">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {product.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="p-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-medium text-text-primary">Variants & Pricing ({variants.length})</h3>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {variants.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No variants found for this product.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Color</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Size</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Wholesale</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Retail</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {variants.map(v => (
                        <tr key={v.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{v.color || 'Standard'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">{v.size || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary text-right">{formatCents(v.cost_cents)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary text-right">{formatCents(v.store_retail_cents || v.msrp_cents)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => onAddInventory(v)}
                              className="text-brand-primary hover:text-brand-secondary"
                            >
                              Add to Inventory
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
