import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import InventoryView from '@/components/vowos/InventoryView';
import PurchasesView from '@/components/vowos/PurchasesView';
import CatalogView from '@/features/catalog/CatalogView';
import TransfersView from '@/components/vowos/TransfersView';

export default function InventoryWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'inventory';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Inventory</h1>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          {can('purchasing.core') && <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>}
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          {can('transfers.core') && <TabsTrigger value="transfers">Transfers</TabsTrigger>}
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <InventoryView />
        </TabsContent>
        
        {can('purchasing.core') && (
          <TabsContent value="purchases" className="mt-6">
            <PurchasesView />
          </TabsContent>
        )}
        
        <TabsContent value="vendors" className="mt-6">
          <CatalogView />
        </TabsContent>

        {can('transfers.core') && (
          <TabsContent value="transfers" className="mt-6">
            <TransfersView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
