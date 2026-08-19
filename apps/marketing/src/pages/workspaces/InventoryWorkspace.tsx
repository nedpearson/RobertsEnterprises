import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import InventoryView from '@/components/vowos/InventoryView';
import PurchasesView from '@/components/vowos/PurchasesView';
import TransfersView from '@/components/vowos/TransfersView';
import CatalogView from '@/features/catalog/CatalogView';
import { FeatureKey } from '@/lib/features/featureCatalog';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';

interface InventoryTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const INVENTORY_TABS: InventoryTabDef[] = [
  { id: 'catalog', label: 'Catalog', module: 'inventory' },
  { id: 'vendors', label: 'Vendors', module: 'inventory.vendors' },
  { id: 'purchases', label: 'Purchase Orders', module: 'inventory.purchase_orders' },
  { id: 'receiving', label: 'Receiving', module: 'inventory.purchase_orders' },
  { id: 'transfers', label: 'Transfers', module: 'inventory.transfers' },
  { id: 'returns', label: 'RTV (Returns)', module: 'inventory.purchase_orders' }
];

export default function InventoryWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();

  const availableTabs = useMemo(() => {
    return INVENTORY_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'catalog';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to inventory features.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Inventory & Purchasing</h1>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="catalog" className="mt-6"><InventoryView /></TabsContent>
        <TabsContent value="vendors" className="mt-6"><CatalogView /></TabsContent>
        <TabsContent value="purchases" className="mt-6"><PurchasesView /></TabsContent>
        <TabsContent value="receiving" className="mt-6"><PurchasesView /></TabsContent>
        <TabsContent value="transfers" className="mt-6"><TransfersView /></TabsContent>
        <TabsContent value="returns" className="mt-6">
          <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
            Returns processing is loading...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
