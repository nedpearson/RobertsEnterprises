import React from 'react';
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
