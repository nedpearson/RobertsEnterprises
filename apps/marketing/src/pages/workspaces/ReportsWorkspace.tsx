import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenantEntitlements } from '@/hooks/useTenantEntitlements';
import ReportsView from '@/components/vowos/ReportsView';
import LedgersView from '@/components/vowos/LedgersView';
import { FeatureKey } from '@/lib/features/featureCatalog';

interface ReportsTabDef {
  id: string;
  label: string;
  module: FeatureKey;
}

const REPORTS_TABS: ReportsTabDef[] = [
  { id: 'executive', label: 'Executive', module: 'reports.executive' },
  { id: 'sales', label: 'Sales', module: 'reports.sales' },
  { id: 'inventory', label: 'Inventory', module: 'reports.inventory' },
  { id: 'accounting', label: 'Accounting', module: 'reports.financial' },
  { id: 'marketing', label: 'Marketing', module: 'reports.marketing' },
  { id: 'staff', label: 'Team', module: 'reports.team' }
];

export default function ReportsWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useTenantEntitlements();

  const availableTabs = useMemo(() => {
    return REPORTS_TABS.filter(tab => can(tab.module));
  }, [can]);

  const defaultTab = availableTabs.length > 0 ? availableTabs[0].id : 'sales';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (availableTabs.length === 0) {
    return <div className="p-8 text-center text-stone-500">You do not have access to reports.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-900">Reports</h1>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-stone-100 overflow-x-auto flex-nowrap w-full justify-start">
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="executive" className="mt-6"><div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">Executive dashboard is loading...</div></TabsContent>
        <TabsContent value="sales" className="mt-6"><ReportsView /></TabsContent>
        <TabsContent value="inventory" className="mt-6"><div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">Inventory reports are loading...</div></TabsContent>
        <TabsContent value="accounting" className="mt-6"><LedgersView /></TabsContent>
        <TabsContent value="marketing" className="mt-6"><div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">Marketing reports are loading...</div></TabsContent>
        <TabsContent value="staff" className="mt-6"><div className="p-12 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-100">Team performance reports are loading...</div></TabsContent>
      </Tabs>
    </div>
  );
}
