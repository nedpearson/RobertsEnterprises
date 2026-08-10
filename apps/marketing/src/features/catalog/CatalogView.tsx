import React, { useState } from 'react';
import { CatalogImportCenter } from './CatalogImportCenter';
import { Vendor360 } from './Vendor360';
import { Product360 } from './Product360';
import { Product, Vendor, ProductVariant } from '../../types/catalog';
import { catalogService } from '../../lib/services/catalogService';

export default function CatalogView() {
  const [view, setView] = useState<'import' | 'vendor' | 'product'>('import');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setView('product');
  };

  const handleAddInventory = async (variant: ProductVariant) => {
    // Basic implementation for now - this should ideally open a modal for location/qty selection
    if (!selectedProduct) return;
    try {
      await catalogService.createPhysicalInventoryFromVariant(
        'b0000000-0000-0000-0000-000000000001', // Default fallback system business ID
        'ido-br', // Default fallback
        variant, 
        selectedProduct, 
        1
      );
      alert('Added 1 unit to inventory!');
    } catch (e) {
      console.error(e);
      alert('Failed to add inventory');
    }
  };

  if (view === 'vendor' && selectedVendorId) {
    return (
      <Vendor360 
        vendorId={selectedVendorId} 
        onClose={() => setView('import')} 
        onProductClick={handleProductClick} 
      />
    );
  }

  if (view === 'product' && selectedProduct) {
    return (
      <Product360 
        product={selectedProduct} 
        onBack={() => setView(selectedVendorId ? 'vendor' : 'import')} 
        onAddInventory={handleAddInventory}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center px-6">
        <h1 className="text-2xl font-serif font-light text-text-primary">Vendor Catalog</h1>
        {/* We can add a vendor list/switcher here later */}
      </div>
      <CatalogImportCenter />
    </div>
  );
}
