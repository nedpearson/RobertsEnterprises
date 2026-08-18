import React, { useState } from 'react';
import { useBusinessId } from '@/hooks/useBusinessId';
import { useVowosData } from '@/contexts/VowosDataContext';
import { CatalogImportCenter } from './CatalogImportCenter';
import { Vendor360 } from './Vendor360';
import { Product360 } from './Product360';
import { Product, Vendor, ProductVariant } from '../../types/catalog';
import { catalogService } from '../../lib/services/catalogService';
import { toast } from 'sonner';

export default function CatalogView() {
  const businessId = useBusinessId();
  const { activeLocation } = useVowosData();
  const [view, setView] = useState<'import' | 'vendor' | 'product'>('import');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setView('product');
  };

  const handleAddInventory = async (variant: ProductVariant) => {
    if (!selectedProduct) return;

    // Refuse rather than guess. These used to be hardcoded to a business id that
    // migration 20260824000000 deleted, and to the 'ido-br' location slug — so
    // every "add to inventory" wrote a row scoped to a tenant that does not
    // exist. Silently writing stock into the void is worse than not writing.
    if (!businessId) {
      toast.error('Cannot add inventory: no active business. Sign in again.');
      return;
    }
    if (activeLocation === 'all') {
      toast.error('Choose a specific location before adding inventory.');
      return;
    }

    try {
      await catalogService.createPhysicalInventoryFromVariant(
        businessId,
        activeLocation,
        variant,
        selectedProduct,
        1,
      );
      toast.success('Added 1 unit to inventory!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add inventory');
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
