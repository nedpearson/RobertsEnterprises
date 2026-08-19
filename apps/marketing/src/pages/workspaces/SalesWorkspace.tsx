import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import InvoicesView from '@/components/vowos/InvoicesView';
import ContractsView from '@/components/vowos/ContractsView';
import AlterationsView from '@/components/vowos/AlterationsView';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import { FeatureKey } from '@/lib/features/featureCatalog';

interface SalesTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const SALES_TABS: SalesTabDef[] = [
  { id: 'dashboard', label: 'Dashboard', module: 'sales.dashboard' },
  { id: 'invoices', label: 'Invoices', module: 'sales.invoices' },
  { id: 'payments', label: 'Payments', module: 'sales.payments' },
  { id: 'contracts', label: 'Contracts', module: 'sales.contracts' },
  { id: 'alterations', label: 'Alterations', module: 'sales.alterations' }
];

export default function SalesWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();

  const availableTabs = useMemo(() => {
    return SALES_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'payments';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to sales features.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-serif font-bold text-stone-900">Sales</h1>
        <p className="text-stone-500">Process payments, contracts, and alterations.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">Sales dashboard is loading...</div></TabsContent>
        <TabsContent value="invoices" className="mt-6"><InvoicesView /></TabsContent>
        <TabsContent value="payments" className="mt-6"><InvoicesView /></TabsContent>
        <TabsContent value="contracts" className="mt-6"><ContractsView /></TabsContent>
        <TabsContent value="alterations" className="mt-6"><AlterationsView /></TabsContent>
      </Tabs>
    </div>
  );
}
