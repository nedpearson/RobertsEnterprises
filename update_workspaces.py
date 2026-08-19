import os
import re

# We will create a ModuleLocked component
with open('apps/marketing/src/components/vowos/ModuleLocked.tsx', 'w', encoding='utf-8') as f:
    f.write('''import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ModuleLocked({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-2 border-stone-200 bg-stone-50/50">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-white p-4 rounded-full shadow-sm border border-stone-100 mb-4">
          <Lock className="h-8 w-8 text-stone-300" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-sm text-stone-500 max-w-sm mb-6">{description}</p>
        <Button variant="outline" className="bg-white">
          Explore Upgrades <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
''')

# Update SalesWorkspace
sales_content = '''import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { ModuleLocked } from '@/components/vowos/ModuleLocked';
import { Lock } from 'lucide-react';

export default function SalesWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();
  
  const currentTab = searchParams.get('tab') || 'payments';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  const tabs = [
    { id: 'pos', label: 'POS', module: 'sales.core' },
    { id: 'orders', label: 'Orders', module: 'sales.core' },
    { id: 'payments', label: 'Payments', module: 'sales.core' },
    { id: 'invoices', label: 'Invoices', module: 'sales.core' },
    { id: 'contracts', label: 'Contracts', module: 'sales.contracts' },
    { id: 'alterations', label: 'Alterations', module: 'alterations.core' },
    { id: 'layaway', label: 'Layaway', module: 'sales.layaway' },
    { id: 'payment-plans', label: 'Payment Plans', module: 'sales.payment_plans' },
    { id: 'returns', label: 'Returns', module: 'sales.returns' },
    { id: 'refunds', label: 'Refunds', module: 'sales.refunds' },
    { id: 'pickup', label: 'Pickup', module: 'sales.core' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Sales</h1>
        <p className="text-stone-500">Manage point of sale, payments, contracts, and alterations.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="bg-stone-100 flex-nowrap inline-flex">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="whitespace-nowrap flex items-center gap-1.5">
                {t.label} {!can(t.module) && <Lock className="h-3 w-3 text-stone-300" />}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="payments" className="mt-6">
          <InvoicesView />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoicesView />
        </TabsContent>
        
        <TabsContent value="contracts" className="mt-6">
          {can('sales.contracts') ? <ContractsView /> : <ModuleLocked title="Digital Contracts" description="Send legally binding agreements via email or SMS for e-signature." />}
        </TabsContent>
        
        <TabsContent value="alterations" className="mt-6">
          {can('alterations.core') ? <AlterationsView /> : <ModuleLocked title="Alterations Tracking" description="Manage fittings, seamstress schedules, and alteration fees." />}
        </TabsContent>

        {/* Placeholders for others */}
        {['pos', 'orders', 'layaway', 'payment-plans', 'returns', 'refunds', 'pickup'].map(id => (
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
'''
with open('apps/marketing/src/pages/workspaces/SalesWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(sales_content)

# Update InventoryWorkspace
inventory_content = '''import React from 'react';
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
'''
with open('apps/marketing/src/pages/workspaces/InventoryWorkspace.tsx', 'w', encoding='utf-8') as f:
    f.write(inventory_content)

