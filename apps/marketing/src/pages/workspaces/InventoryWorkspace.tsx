import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import InventoryView from '@/components/vowos/InventoryView';
import PurchasesView from '@/components/vowos/PurchasesView';
import CatalogView from '@/features/catalog/CatalogView';
import TransfersView from '@/components/vowos/TransfersView';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { Lock } from 'lucide-react';

export default function InventoryWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'inventory';
  const { can } = useTenantEntitlements();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const tabs = [
    { id: 'inventory', label: 'Inventory', module: 'inventory.core' },
    { id: 'products', label: 'Products', module: 'inventory.core' },
    { id: 'designers', label: 'Designers', module: 'inventory.core' },
    { id: 'vendors', label: 'Vendors', module: 'inventory.core' },
    { id: 'purchases', label: 'Purchase Orders', module: 'purchasing.core' },
    { id: 'receiving', label: 'Receiving', module: 'purchasing.core' },
    { id: 'transfers', label: 'Transfers', module: 'transfers.core' },
    { id: 'counts', label: 'Counts', module: 'inventory.counts' },
    { id: 'adjustments', label: 'Adjustments', module: 'inventory.core' },
    { id: 'reservations', label: 'Reservations', module: 'inventory.reservations' },
    { id: 'special-orders', label: 'Special Orders', module: 'inventory.special_orders' },
    { id: 'catalogs', label: 'Catalogs', module: 'inventory.catalogs' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Inventory</h1>
        <p className="text-stone-500">Track stock, catalogs, purchasing, and transfers.</p>
      </div>
      
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!can(t.module) && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="inventory" className="mt-6"><InventoryView /></TabsContent>
        <TabsContent value="products" className="mt-6"><InventoryView /></TabsContent>
        
        <TabsContent value="purchases" className="mt-6">
          {can('purchasing.core') ? <PurchasesView /> : <ModuleLocked title="Purchase Orders" description="Generate and track orders sent to designers and vendors." />}
        </TabsContent>
        <TabsContent value="receiving" className="mt-6">
          {can('purchasing.core') ? <PurchasesView /> : <ModuleLocked title="Receiving" description="Track incoming shipments from vendors." />}
        </TabsContent>
        
        <TabsContent value="vendors" className="mt-6"><CatalogView /></TabsContent>
        <TabsContent value="designers" className="mt-6"><CatalogView /></TabsContent>

        <TabsContent value="transfers" className="mt-6">
          {can('transfers.core') ? <TransfersView /> : <ModuleLocked title="Location Transfers" description="Move inventory seamlessly between your boutique locations." />}
        </TabsContent>

        {['counts', 'adjustments', 'reservations', 'special-orders', 'catalogs'].map(id => (
          <TabsContent key={id} value={id} className="mt-6">
            {!can(tabs.find(t => t.id === id)?.module as string) ? (
               <ModuleLocked title={tabs.find(t => t.id === id)?.label || ''} description="This feature is available as an upgrade to your current plan." />
            ) : (
               <div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">
                 {tabs.find(t => t.id === id)?.label} capabilities are loading...
               </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
